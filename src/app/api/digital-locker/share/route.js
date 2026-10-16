import { NextResponse } from "next/server";
import sql from "@/lib/db";

/**
 * API: Share Digital Document with Consent (AWS RDS PostgreSQL)
 * 
 * Flow:
 * 1. Log DPDP-compliant consent in consent_logs
 * 2. Create time-bound share record in document_shares
 * 3. Send in-app notification to the doctor so they are immediately alerted
 * 4. Audit in activity_log
 */
export async function POST(request) {
    try {
        const { document_id, patient_id, doctor_id, appointment_id, expiry_minutes, consent_message } = await request.json();

        if (!document_id || !patient_id || !doctor_id || !expiry_minutes) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const expiryMinNum = parseInt(expiry_minutes) || 120;
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinNum);

        // 1. Fetch document and patient information for notification
        const [docRows, patientRows] = await Promise.all([
            sql`
                SELECT id, document_name, document_type 
                FROM digital_locker_documents 
                WHERE id = ${document_id} 
                LIMIT 1
            `,
            sql`
                SELECT id, full_name 
                FROM patient_details 
                WHERE id = ${patient_id} 
                LIMIT 1
            `,
        ]);

        const documentName = docRows[0]?.document_name || "Medical Report";
        const patientName = patientRows[0]?.full_name || "A patient";

        // 2. Log Consent (DPDP Compliant) in AWS RDS
        const consentMetadata = JSON.stringify({
            document_id,
            doctor_id,
            appointment_id: appointment_id || null,
            message: consent_message || `Patient shared ${documentName} for ${expiryMinNum} minutes.`,
            expiry_minutes: expiryMinNum,
        });

        const consentRows = await sql`
            INSERT INTO consent_logs (
                patient_id,
                consent_type,
                metadata,
                status,
                version,
                created_at
            )
            VALUES (
                ${patient_id},
                'DOCUMENT_SHARING',
                ${consentMetadata}::jsonb,
                true,
                '1.0',
                NOW()
            )
            RETURNING id
        `;
        const consentId = consentRows[0]?.id;

        // 3. Create Time-bound Share Record in document_shares
        const shareRows = await sql`
            INSERT INTO document_shares (
                document_id,
                patient_id,
                doctor_id,
                appointment_id,
                consent_log_id,
                expires_at,
                status,
                created_at
            )
            VALUES (
                ${document_id},
                ${patient_id},
                ${doctor_id},
                ${appointment_id || null},
                ${consentId},
                ${expiresAt.toISOString()},
                'ACTIVE',
                NOW()
            )
            RETURNING id, expires_at
        `;
        const share = shareRows[0];

        // 4. Send Instant In-App Notification to the Doctor in AWS RDS
        const notifMetadata = JSON.stringify({
            document_id,
            patient_id,
            appointment_id: appointment_id || null,
            share_id: share.id,
            document_name: documentName,
            patient_name: patientName,
            expires_at: share.expires_at,
        });

        await sql`
            INSERT INTO notifications (
                user_id,
                title,
                message,
                type,
                metadata,
                read,
                created_at
            )
            VALUES (
                ${doctor_id},
                'Patient Shared Medical Document 📄',
                ${`${patientName} has shared "${documentName}" with you for review (${expiryMinNum} mins access).`},
                'document_shared',
                ${notifMetadata}::jsonb,
                false,
                NOW()
            )
        `;

        // 5. Audit Log Entry
        try {
            await sql`
                INSERT INTO activity_log (
                    patient_id,
                    actor_id,
                    module_type,
                    action_type,
                    reference_id,
                    description,
                    metadata,
                    created_at
                )
                VALUES (
                    ${patient_id},
                    ${patient_id},
                    'digital_locker',
                    'document_shared',
                    ${share.id},
                    ${`Patient shared "${documentName}" with doctor`},
                    ${notifMetadata}::jsonb,
                    NOW()
                )
            `;
        } catch (logErr) {
            console.warn("Activity log failed for doc share:", logErr.message);
        }

        return NextResponse.json({
            success: true,
            message: "Document shared successfully and doctor notified",
            share_id: share.id,
            expires_at: share.expires_at,
        });

    } catch (error) {
        console.error("Document sharing error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
