import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { uploadToS3 } from "@/lib/s3";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function POST(req) {
  try {
    let order_id = null;
    let lab_id = null;
    let notes = "";
    let test_type = "Diagnostic Report";
    let save_to_digilocker = true;
    let report_url = null;
    let fileSize = null;
    let mimeType = "application/pdf";
    let fileName = "lab_report.pdf";
    let item_id = null;
    let test_name = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      order_id = formData.get("order_id");
      lab_id = formData.get("lab_id");
      item_id = formData.get("item_id");
      test_name = formData.get("test_name");
      notes = formData.get("notes") || formData.get("result_summary") || "";
      test_type = formData.get("test_type") || test_name || "Diagnostic Report";
      const syncVal = formData.get("save_to_digilocker");
      if (syncVal === "false" || syncVal === false) {
        save_to_digilocker = false;
      }

      if (!file || typeof file === "string") {
        return failure("Please select a valid report file (PDF or Image).", null, 400, { headers: corsHeaders });
      }

      fileSize = file.size;
      mimeType = file.type || "application/pdf";
      fileName = file.name || "report.pdf";

      const cleanOrderId = safeUuid(order_id);
      if (!cleanOrderId) {
        return failure("Valid order_id is required.", null, 400, { headers: corsHeaders });
      }

      // Convert file to buffer and upload to S3
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `lab-reports/${cleanOrderId}/${Date.now()}-${sanitizedName}`;

      const { url } = await uploadToS3(buffer, key, mimeType);
      report_url = url;
    } else {
      const body = await req.json();
      order_id = body.order_id;
      lab_id = body.lab_id;
      item_id = body.item_id;
      test_name = body.test_name;
      notes = body.notes || body.result_summary || "";
      test_type = body.test_type || test_name || "Diagnostic Report";
      report_url = body.report_url;
      if (body.save_to_digilocker === false) {
        save_to_digilocker = false;
      }
    }

    const cleanOrderId = safeUuid(order_id);
    const cleanLabId = safeUuid(lab_id);
    const cleanItemId = safeUuid(item_id);

    if (!cleanOrderId || !cleanLabId) {
      return failure("Valid order_id and lab_id are required.", null, 400, { headers: corsHeaders });
    }

    if (!report_url) {
      return failure("Report file or report_url is required.", null, 400, { headers: corsHeaders });
    }

    // Verify order exists
    const orderRows = await sql`
      SELECT o.*, ld.lab_name
      FROM lab_test_orders o
      LEFT JOIN lab_details ld ON ld.id = o.lab_id
      WHERE o.id = ${cleanOrderId} AND o.lab_id = ${cleanLabId}
      LIMIT 1
    `;

    if (!orderRows.length) {
      return failure("Diagnostic order not found for this laboratory.", null, 404, { headers: corsHeaders });
    }

    const order = orderRows[0];
    const labNameStr = order.lab_name || "Diagnostic Laboratory";

    // 1. Insert into lab_reports
    const insertedReports = await sql`
      INSERT INTO lab_reports (
        order_id,
        lab_id,
        patient_id,
        report_url,
        test_type,
        test_name,
        item_id,
        result_summary,
        structured_results,
        created_at
      ) VALUES (
        ${cleanOrderId},
        ${cleanLabId},
        ${order.patient_id},
        ${report_url},
        ${test_type || test_name || "Diagnostic Report"},
        ${test_name || test_type || "Diagnostic Test"},
        ${cleanItemId},
        ${notes || "Diagnostic test report generated successfully."},
        ${JSON.stringify({ item_id: cleanItemId, test_name: test_name || test_type, file_name: fileName, file_size: fileSize })},
        NOW()
      )
      RETURNING *
    `;

    const report = insertedReports[0];

    // 2. Update item & order completion status
    if (cleanItemId) {
      await sql`
        UPDATE lab_test_order_items
        SET status = 'completed'
        WHERE id = ${cleanItemId}
      `.catch(() => {});

      const remainingPending = await sql`
        SELECT id FROM lab_test_order_items
        WHERE order_id = ${cleanOrderId} AND status != 'completed'
      `;

      if (remainingPending.length === 0) {
        await sql`
          UPDATE lab_test_orders
          SET status = 'completed', delivered_at = NOW(), updated_at = NOW()
          WHERE id = ${cleanOrderId}
        `;
      } else {
        await sql`
          UPDATE lab_test_orders
          SET status = 'in_progress', updated_at = NOW()
          WHERE id = ${cleanOrderId} AND status NOT IN ('completed', 'cancelled')
        `;
      }
    } else {
      await sql`
        UPDATE lab_test_orders
        SET status = 'completed', delivered_at = NOW(), updated_at = NOW()
        WHERE id = ${cleanOrderId}
      `;
      await sql`
        UPDATE lab_test_order_items
        SET status = 'completed'
        WHERE order_id = ${cleanOrderId}
      `.catch(() => {});
    }

    // 3. Save to MediConnect Digital Locker if opted
    let lockerDoc = null;
    if (save_to_digilocker && order.patient_id) {
      try {
        const orderItems = await sql`
          SELECT test_name FROM lab_test_order_items WHERE order_id = ${cleanOrderId}
        `;
        const testNamesList = orderItems.map((i) => i.test_name).filter(Boolean).join(", ");
        const docTitle = testNamesList
          ? `Lab Report: ${testNamesList} (${labNameStr})`
          : (test_name
            ? `Lab Report: ${test_name} (${labNameStr})`
            : `Lab Report #${order.unid || ""} - ${labNameStr}`);

        const isPdf = report_url.toLowerCase().endsWith(".pdf") || mimeType.includes("pdf");

        const insertedLocker = await sql`
          INSERT INTO digital_locker_documents (
            user_id,
            document_name,
            document_type,
            document_url,
            file_size,
            mime_type,
            description,
            is_verified,
            is_active,
            upload_date,
            created_at,
            updated_at,
            tags
          ) VALUES (
            ${order.patient_id},
            ${docTitle},
            'lab_report',
            ${report_url},
            ${fileSize || 0},
            ${isPdf ? "application/pdf" : mimeType || "image/jpeg"},
            ${notes || `Verified diagnostic report provided by ${labNameStr}`},
            true,
            true,
            NOW(),
            NOW(),
            NOW(),
            ${["lab_report", "verified_lab", labNameStr]}
          )
          RETURNING *
        `;
        lockerDoc = insertedLocker[0];
      } catch (lockerErr) {
        console.warn("Digital Locker sync error:", lockerErr.message);
      }
    }

    // 4. Send Patient Notification
    if (order.patient_id) {
      await sql`
        INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
        VALUES (
          ${order.patient_id},
          'Lab Report Ready 📄',
          ${`Your test report for Order #${order.unid || ""} from ${labNameStr} is now ready and saved in your MediConnect DigiLocker.`},
          'lab_report',
          ${JSON.stringify({ order_id: cleanOrderId, report_id: report.id, report_url })}::jsonb,
          NOW()
        )
      `.catch((e) => console.warn("Patient notification error:", e.message));
    }

    // 5. Send Doctor Notification
    if (order.prescription_id) {
      const presc = await sql`SELECT doctor_id FROM prescriptions WHERE id = ${order.prescription_id} LIMIT 1`;
      if (presc.length > 0 && presc[0].doctor_id) {
        await sql`
          INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
          VALUES (
            ${presc[0].doctor_id},
            'Patient Lab Report Received',
            ${`Diagnostic report for booking #${order.unid || ""} is available for review.`},
            'patient_lab_report',
            ${JSON.stringify({ order_id: cleanOrderId, report_id: report.id, patient_id: order.patient_id, report_url })}::jsonb,
            NOW()
          )
        `.catch((e) => console.warn("Doctor notification error:", e.message));
      }
    }

    return success("Report uploaded, order completed, and saved to DigiLocker successfully.", {
      order: updatedOrders[0],
      report,
      locker_document: lockerDoc,
      saved_to_digilocker: Boolean(lockerDoc),
    }, 200, { headers: corsHeaders });

  } catch (err) {
    console.error("Upload Lab Report Error:", err);
    return failure("Failed to upload lab report.", err.message, 500, { headers: corsHeaders });
  }
}
