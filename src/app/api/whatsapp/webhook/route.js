/**
 * GET /api/whatsapp/webhook
 * Meta Webhook Verification Endpoint
 * Meta sends a GET request with a challenge string to verify the webhook URL.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WA WEBHOOK] Verification successful.");
    return new Response(challenge, { status: 200 });
  }

  console.warn("[WA WEBHOOK] Verification failed. Token mismatch.");
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST /api/whatsapp/webhook
 * Receives all incoming WhatsApp messages from Meta/InsignSMS.
 * Processes the message using the bot state machine and replies.
 */
import { supabase } from "@/lib/supabaseAdmin";
import { sendWhatsAppText, processBotMessage } from "@/lib/whatsappBot";

export async function POST(req) {
  // Always return 200 immediately so Meta doesn't retry
  const body = await req.json().catch(() => ({}));

  // Process asynchronously (fire and forget pattern)
  handleIncomingMessage(body).catch((err) =>
    console.error("[WA WEBHOOK] Async handler error:", err.message)
  );

  return new Response("OK", { status: 200 });
}

async function handleIncomingMessage(body) {
  try {
    // Extract message details from Meta webhook payload
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      console.log("[WA WEBHOOK] No message found in payload. Skipping.");
      return;
    }

    const from = message.from; // Sender's phone number (e.g., "919876543210")
    const messageType = message.type;
    let incomingText = "";

    // Handle text messages and interactive list replies
    if (messageType === "text") {
      incomingText = message.text?.body || "";
    } else if (messageType === "interactive") {
      // User selected from a list or button
      incomingText = message.interactive?.list_reply?.id ||
                     message.interactive?.button_reply?.id || "";
    } else {
      console.log(`[WA WEBHOOK] Unsupported message type: ${messageType}`);
      await sendWhatsAppText(from, "We currently only support text messages. Type *menu* to see options.");
      return;
    }

    console.log(`[WA WEBHOOK] Message from ${from}: "${incomingText}"`);

    // ── 1. Load session from DB ──────────────────────────────────────────
    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone", from)
      .maybeSingle();

    const currentSession = session || { phone: from, step: "WELCOME", data: {} };

    // ── 2. Save incoming message to history ──────────────────────────────
    await supabase.from("whatsapp_messages").insert({
      phone: from,
      direction: "inbound",
      message: incomingText,
      message_type: messageType,
    });

    // ── 3. Process through bot state machine ─────────────────────────────
    const result = processBotMessage(from, incomingText, currentSession);

    // ── 4. Handle special actions requiring API calls ─────────────────────

    // FETCH SPECIALTIES → show as numbered list
    if (result.fetchSpecialties) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/layer1/specialties`);
      const json = await res.json();
      const specialties = (json.data || json || []).slice(0, 10);
      if (!specialties.length) {
        await sendWhatsAppText(from, "No specialties available right now. Type *menu* to go back.");
        return;
      }
      const list = specialties.map((s, i) => `${i + 1}️⃣ ${s.name}`).join("\n");
      await sendWhatsAppText(from, `🏥 *Choose a Specialty*\n\n${list}\n\nReply with a number:`);
      await upsertSession(from, "APPOINTMENT_SPECIALTY", { specialties });
      return;
    }

    // APPOINTMENT SPECIALTY SELECTED → fetch doctors
    if (currentSession.step === "APPOINTMENT_SPECIALTY") {
      const specialties = currentSession.data?.specialties || [];
      const selectedIndex = parseInt(incomingText) - 1;
      if (!isNaN(selectedIndex) && specialties[selectedIndex]) {
        const specialty = specialties[selectedIndex];
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/doctors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ specialization: specialty.name }),
        });
        const json = await res.json();
        const doctors = (json.data || []).slice(0, 10);
        if (!doctors.length) {
          await sendWhatsAppText(from, `No doctors available for *${specialty.name}* right now.\n\nType *menu* to go back.`);
          return;
        }
        const list = doctors.map((d, i) => `${i + 1}️⃣ *${d.full_name}*\n   💰 ₹${d.consultation_fee || "N/A"} | ⭐ ${d.rating || "N/A"}`).join("\n\n");
        await sendWhatsAppText(from, `👨‍⚕️ *Doctors for ${specialty.name}*\n\n${list}\n\nReply with a number to select:`);
        await upsertSession(from, "APPOINTMENT_DOCTOR", { doctors, specialty });
        return;
      }
    }

    // FETCH LAB CATEGORIES → show as numbered list
    if (result.fetchLabCategories) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/public/lab-tests`);
      const json = await res.json();
      const tests = (json.data || []).slice(0, 10);
      if (!tests.length) {
        await sendWhatsAppText(from, "No lab tests available right now. Type *menu* to go back.");
        return;
      }
      const list = tests.map((t, i) => `${i + 1}️⃣ *${t.test_name}* — ₹${t.price || "N/A"}\n   🏥 ${t.lab_name || "Lab"}`).join("\n\n");
      await sendWhatsAppText(from, `🔬 *Available Lab Tests*\n\n${list}\n\nReply with a number to select:`);
      await upsertSession(from, "LAB_SELECT", { tests });
      return;
    }

    // NURSING SUBMIT → call nursing API directly
    if (result.submitNursing) {
      const d = result.nextData;
      const nursingPayload = {
        name: d.name,
        phone: from,
        city: d.city,
        care_types: [d.care_type],
        duration: d.duration,
        data_consent: true,
        communication_consent: true,
        device_type: "whatsapp",
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nursing/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nursingPayload),
      });
      const json = await res.json();
      if (json.success) {
        await sendWhatsAppText(from, `✅ *Nursing Request Submitted!*\n\nThank you ${d.name}. Your request ID is *${json.data?.lead_id || "MCN-NUR-XXXXXX"}*.\n\nOur team will contact you at ${from} shortly.\n\nType *menu* for more options.`);
      } else {
        await sendWhatsAppText(from, "❌ We couldn't submit your request right now. Please try again or type *0* to contact support.");
      }
      await upsertSession(from, "WELCOME", {});
      return;
    }

    // SUPPORT TICKET SUBMIT
    if (result.submitSupport) {
      await supabase.from("whatsapp_support_tickets").insert({
        phone: from,
        message: result.supportMessage,
        status: "open",
      });
      await sendWhatsAppText(from, "🎫 Your message has been received. A support agent will respond to you shortly.\n\nType *menu* to see other options.");
      await upsertSession(from, "WELCOME", {});
      return;
    }

    // ── 5. Send standard reply ────────────────────────────────────────────
    if (result.reply) {
      await sendWhatsAppText(from, result.reply);
      await supabase.from("whatsapp_messages").insert({
        phone: from,
        direction: "outbound",
        message: result.reply,
        message_type: "text",
      });
    }

    // ── 6. Update session state ───────────────────────────────────────────
    await upsertSession(from, result.nextStep, result.nextData);

  } catch (err) {
    console.error("[WA WEBHOOK] handleIncomingMessage error:", err.message);
  }
}

async function upsertSession(phone, step, data) {
  await supabase.from("whatsapp_sessions").upsert(
    { phone, step, data, updated_at: new Date().toISOString() },
    { onConflict: "phone" }
  );
}

