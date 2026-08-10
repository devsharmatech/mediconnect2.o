/**
 * WhatsApp Bot Messenger Utility
 * Sends interactive text messages to users via InsignSMS Multichannel WhatsApp API
 */

import { formatWhatsAppNumber } from "@/lib/sms";

const WHATSAPP_TOKEN = process.env.INSIGN_WHATSAPP_TOKEN || "170|qFWszJXgSGvkql0ldNk4vWiYNrWhG1wzNVQPT8dp7516f7c8";
const PHONE_NUMBER_ID = process.env.INSIGN_WHATSAPP_PHONE_NUMBER_ID || "935517672969433";
const API_URL = `https://multichannel.insignsms.com/api/v1/whatsapp/${PHONE_NUMBER_ID}/messages`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mediconnect.fit";

/**
 * Sends a plain text message to a WhatsApp number.
 * @param {string} to - Recipient phone number
 * @param {string} text - Message text body
 */
export async function sendWhatsAppText(to, text) {
  try {
    const formattedNumber = formatWhatsAppNumber(to);
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedNumber,
      type: "text",
      text: { body: text },
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (result.error) throw new Error(result.error.message || "WhatsApp API error");
    console.log(`[WA BOT] Sent text to ${formattedNumber}`);
    return { success: true, data: result };
  } catch (err) {
    console.error("[WA BOT] sendWhatsAppText failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends an interactive List Message (menu with numbered options).
 * @param {string} to - Recipient phone number
 * @param {string} headerText - Menu header (e.g., "Available Specialties")
 * @param {string} bodyText - Instructional text
 * @param {string} buttonLabel - Button text to open the list
 * @param {Array<{id: string, title: string, description?: string}>} rows - List items
 * @param {string} sectionTitle - Section name inside the list
 */
export async function sendWhatsAppList(to, headerText, bodyText, buttonLabel, rows, sectionTitle = "Options") {
  try {
    const formattedNumber = formatWhatsAppNumber(to);

    // Truncate fields to WhatsApp API limits
    const safeRows = rows.slice(0, 10).map((row) => ({
      id: String(row.id).slice(0, 200),
      title: String(row.title).slice(0, 24),
      description: row.description ? String(row.description).slice(0, 72) : undefined,
    }));

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedNumber,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: headerText.slice(0, 60) },
        body: { text: bodyText.slice(0, 1024) },
        footer: { text: "Mediconnect.fit" },
        action: {
          button: buttonLabel.slice(0, 20),
          sections: [
            {
              title: sectionTitle.slice(0, 24),
              rows: safeRows,
            },
          ],
        },
      },
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (result.error) throw new Error(result.error.message || "WhatsApp API error");
    console.log(`[WA BOT] Sent list message to ${formattedNumber}`);
    return { success: true, data: result };
  } catch (err) {
    console.error("[WA BOT] sendWhatsAppList failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Builds a pre-filled appointment checkout URL.
 */
export function buildAppointmentLink(doctorId, slotDate, slotTime, phone) {
  const params = new URLSearchParams();
  if (doctorId) params.set("doctor_id", doctorId);
  if (slotDate) params.set("date", slotDate);
  if (slotTime) params.set("time", slotTime);
  if (phone) params.set("phone", phone.replace(/\D/g, ""));
  return `${APP_URL}/website/appointments?${params.toString()}`;
}

/**
 * Builds a pre-filled lab test checkout URL.
 */
export function buildLabLink(testId, phone) {
  const params = new URLSearchParams();
  if (testId) params.set("test_id", testId);
  if (phone) params.set("phone", phone.replace(/\D/g, ""));
  return `${APP_URL}/website/services/lab-tests?${params.toString()}`;
}

/**
 * Builds a pre-filled medicine order URL.
 */
export function buildMedicineLink(phone) {
  const params = new URLSearchParams();
  if (phone) params.set("phone", phone.replace(/\D/g, ""));
  return `${APP_URL}/website/medicine-order?${params.toString()}`;
}

/**
 * The main WhatsApp bot session state machine.
 * Processes an incoming message and returns the next reply text.
 * @param {string} from - Sender's phone number
 * @param {string} messageText - The text of the incoming message
 * @param {object} session - Current session state from DB { step, data }
 * @returns {{ reply: string, nextStep: string, nextData: object, sendList?: object, sendLink?: string }}
 */
export function processBotMessage(from, messageText, session) {
  const text = (messageText || "").trim().toLowerCase();
  const step = session?.step || "WELCOME";
  const data = session?.data || {};

  // ─── WELCOME / MAIN MENU ───────────────────────────────────────────
  if (step === "WELCOME" || ["hi", "hello", "hey", "start", "menu", "help", "0"].includes(text)) {
    return {
      reply: `👋 Welcome to *Mediconnect!*\n\nHow can we help you today? Please reply with a number:\n\n1️⃣ Book a Doctor Appointment\n2️⃣ Book a Lab Test\n3️⃣ Order Medicine\n4️⃣ Home Nursing Care\n5️⃣ My Orders & Appointments\n0️⃣ Talk to Support`,
      nextStep: "MAIN_MENU",
      nextData: {},
    };
  }

  // ─── MAIN MENU SELECTION ──────────────────────────────────────────
  if (step === "MAIN_MENU") {
    if (text === "1") return { reply: null, nextStep: "APPOINTMENT_SPECIALTY", nextData: {}, fetchSpecialties: true };
    if (text === "2") return { reply: null, nextStep: "LAB_SEARCH", nextData: {}, fetchLabCategories: true };
    if (text === "3") return { reply: "🏥 *Medicine Order*\n\nDo you have a prescription?\n\n1️⃣ Yes, I have a prescription\n2️⃣ No, I need to search for medicines", nextStep: "MEDICINE_PRESCRIPTION", nextData: {} };
    if (text === "4") return { reply: "🏠 *Home Nursing Care*\n\nWhat type of care do you need?\n\n1️⃣ Home Nursing Support\n2️⃣ Elder Care Assistance\n3️⃣ Post-Surgical Care\n4️⃣ ICU-Trained Nurse (Home)\n5️⃣ Caregiver / Attendant Support", nextStep: "NURSING_CARE_TYPE", nextData: {} };
    if (text === "5") return { reply: null, nextStep: "MY_ORDERS", nextData: {}, fetchOrders: true };
    if (text === "0") return { reply: "🧑‍💼 *Support*\n\nPlease describe your issue and our team will respond shortly.\n\nType your message below:", nextStep: "SUPPORT_MESSAGE", nextData: {} };
    return { reply: "Please reply with a valid option (1-5 or 0) from the menu.\n\nType *menu* to see options again.", nextStep: "MAIN_MENU", nextData: data };
  }

  // ─── APPOINTMENT: DOCTOR SELECTION ───────────────────────────────
  if (step === "APPOINTMENT_DOCTOR") {
    const selectedIndex = parseInt(text) - 1;
    const doctors = data.doctors || [];
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= doctors.length) {
      return { reply: `Please reply with a number between 1 and ${doctors.length}.`, nextStep: step, nextData: data };
    }
    const doctor = doctors[selectedIndex];
    return {
      reply: `✅ You selected *${doctor.full_name}*\n💰 Fee: ₹${doctor.consultation_fee || "N/A"}\n🏥 ${doctor.clinic_name || ""}\n\nClick the link below to choose a time slot and complete your booking:\n${buildAppointmentLink(doctor.id, null, null, from)}`,
      nextStep: "WELCOME",
      nextData: {},
    };
  }

  // ─── LAB: TEST SELECTION ─────────────────────────────────────────
  if (step === "LAB_SELECT") {
    const selectedIndex = parseInt(text) - 1;
    const tests = data.tests || [];
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= tests.length) {
      return { reply: `Please reply with a number between 1 and ${tests.length}.`, nextStep: step, nextData: data };
    }
    const test = tests[selectedIndex];
    return {
      reply: `✅ You selected *${test.test_name}*\n💰 Price: ₹${test.price || "N/A"}\n🏥 ${test.lab_name || ""}\n\nClick the link below to complete your booking:\n${buildLabLink(test.id, from)}`,
      nextStep: "WELCOME",
      nextData: {},
    };
  }

  // ─── MEDICINE: PRESCRIPTION CHOICE ───────────────────────────────
  if (step === "MEDICINE_PRESCRIPTION") {
    if (text === "1") {
      return { reply: `📋 *Upload Prescription*\n\nPlease click the link below to upload your prescription and complete your order:\n${buildMedicineLink(from)}\n\nType *menu* to go back.`, nextStep: "WELCOME", nextData: {} };
    }
    if (text === "2") {
      return { reply: `💊 Please type the *medicine name* you are looking for:`, nextStep: "MEDICINE_SEARCH", nextData: {} };
    }
    return { reply: "Please reply *1* (Yes) or *2* (No).", nextStep: step, nextData: data };
  }

  // ─── MEDICINE: SEARCH ─────────────────────────────────────────────
  if (step === "MEDICINE_SEARCH") {
    const medicineName = messageText.trim();
    return {
      reply: `🔍 Searching for *${medicineName}*...\n\nClick the link below to view results and complete your order:\n${buildMedicineLink(from)}\n\nType *menu* to go back.`,
      nextStep: "WELCOME",
      nextData: {},
    };
  }

  // ─── NURSING: CARE TYPE SELECTION ─────────────────────────────────
  if (step === "NURSING_CARE_TYPE") {
    const careTypes = ["Home Nursing Support", "Elder Care Assistance", "Post-Surgical Care", "ICU-Trained Nurse (Home)", "Caregiver / Attendant Support"];
    const selectedIndex = parseInt(text) - 1;
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= careTypes.length) {
      return { reply: "Please reply with a number between 1 and 5.", nextStep: step, nextData: data };
    }
    return { reply: `✅ Selected: *${careTypes[selectedIndex]}*\n\nFor how long do you need this service?\n\n1️⃣ Single Visit\n2️⃣ Short Term (1-4 weeks)\n3️⃣ Long Term (1+ month)`, nextStep: "NURSING_DURATION", nextData: { care_type: careTypes[selectedIndex] } };
  }

  // ─── NURSING: DURATION SELECTION ─────────────────────────────────
  if (step === "NURSING_DURATION") {
    const durationMap = { "1": "single_visit", "2": "short_term", "3": "long_term" };
    const durationLabels = { "1": "Single Visit", "2": "Short Term", "3": "Long Term" };
    if (!durationMap[text]) {
      return { reply: "Please reply *1*, *2*, or *3* for the duration.", nextStep: step, nextData: data };
    }
    return { reply: "📍 Which *city* are you located in?\n\nPlease type your city name:", nextStep: "NURSING_CITY", nextData: { ...data, duration: durationMap[text], duration_label: durationLabels[text] } };
  }

  // ─── NURSING: CITY ────────────────────────────────────────────────
  if (step === "NURSING_CITY") {
    return { reply: `👤 Please share your *full name* for the request:`, nextStep: "NURSING_NAME", nextData: { ...data, city: messageText.trim() } };
  }

  // ─── NURSING: NAME ────────────────────────────────────────────────
  if (step === "NURSING_NAME") {
    return { reply: null, nextStep: "NURSING_SUBMIT", nextData: { ...data, name: messageText.trim() }, submitNursing: true };
  }

  // ─── SUPPORT: SAVE MESSAGE ────────────────────────────────────────
  if (step === "SUPPORT_MESSAGE") {
    return { reply: null, nextStep: "WELCOME", nextData: {}, submitSupport: true, supportMessage: messageText.trim() };
  }

  // ─── DEFAULT FALLBACK ─────────────────────────────────────────────
  return {
    reply: `I didn't understand that. Type *menu* to see all available options.`,
    nextStep: step,
    nextData: data,
  };
}
