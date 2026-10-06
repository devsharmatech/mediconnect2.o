import sql from "@/lib/db";
import { execute } from "@/lib/layer1/integrationGateway";
import { checkActiveConsent } from "@/lib/layer1/consentManager";

/**
 * Sends a real OTP via InsignSMS gateway and stores it in the database.
 * @param {string} userId - UUID of the user
 * @param {string} phone_number - Recipient's phone number
 * @param {string} role - User role (patient or doctor) to determine App Hash
 * @returns {Promise<{success: boolean, otp: string, error?: string}>}
 */
export async function sendOTPViaGateway(userId, phone_number, role = 'patient') {
    try {
        if (!phone_number) {
            throw new Error("Phone number is required");
        }
        // 1. Format number: Strip non-digits and ensure 91 prefix
        let formattedNumber = phone_number.replace(/\D/g, "");
        if (formattedNumber.length > 10) {
            formattedNumber = formattedNumber.slice(-10);
        }
        formattedNumber = "91" + formattedNumber;

        // 2. Generate a real random 6-digit OTP (or bypass OTP for test accounts)
        const isTestNumber = formattedNumber.endsWith("9999999991") || formattedNumber.endsWith("9999999992") || formattedNumber.endsWith("9999999993") || formattedNumber.endsWith("8744412521") || formattedNumber.endsWith("9027924662") || formattedNumber.endsWith("7289043777");
        const otp = isTestNumber ? "123456" : String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = isTestNumber 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 15 * 60 * 1000);

        // 3. Update AWS RDS PostgreSQL users table
        await sql`
            UPDATE users
            SET otp_code = ${otp},
                otp_expires_at = ${expiresAt},
                updated_at = NOW()
            WHERE id = ${userId}
        `;

        if (isTestNumber) {
            console.log(`[SMS GATEWAY] Test number detected (${formattedNumber}). Bypassing carrier SMS, OTP set to: 123456`);
            return { success: true, otp: "123456" };
        }

        // 4. Send via InsignSMS Integration Gateway
        const token = process.env.INSIGN_SMS_TOKEN || process.env.INSIGN_WHATSAPP_TOKEN || "361|qvSlohCNI5loBq7eumrBLvPI68wuTFsSddLe3Mugd7463735";
        const templateId = "1707177157384254091";
        const entityId = "1701176423722454287";
        const senderId = "MDCNCT";

        const message = `Mediconnect.fit OTP is ${otp}.\nValid for 5 minutes.\nDo not share. - Mediconnect.fit`;

        const gatewayPayload = {
            url: "https://multichannel.insignsms.com/api/v1/sms/sendMessage",
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: {
                token: token,
                senderid: senderId,
                dlt_template_id: templateId,
                dlt_te_id: templateId,
                entity_id: entityId,
                dlt_entity_id: entityId,
                pe_id: entityId,
                numbers: [formattedNumber],
                message: message,
                unicode: 0,
                personalized: 0
            }
        };

        const result = await execute("sms", gatewayPayload);
        return { success: result.success, otp };
    } catch (err) {
        console.error("[SMS GATEWAY] Exception inside sendOTPViaGateway:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Sends a generic OTP message via InsignSMS gateway without mutating the users table.
 * @param {string} phone_number - Recipient's phone number
 * @param {string} otp - The OTP code to send
 * @param {string} role - User role (patient or doctor)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendGenericOTPViaSMS(phone_number, otp, role = 'patient') {
    try {
        if (!phone_number || !otp) {
            throw new Error("Phone number and OTP are required");
        }

        // Format number: Strip non-digits and ensure 91 prefix
        let formattedNumber = phone_number.replace(/\D/g, "");
        if (formattedNumber.length > 10) {
            formattedNumber = formattedNumber.slice(-10);
        }
        formattedNumber = "91" + formattedNumber;

        const isTestNumber = formattedNumber.endsWith("9999999991") || formattedNumber.endsWith("9999999992") || formattedNumber.endsWith("9999999993") || formattedNumber.endsWith("8744412521") || formattedNumber.endsWith("9027924662") || formattedNumber.endsWith("7289043777");
        if (isTestNumber) {
            console.log(`[SMS GATEWAY] Generic test number detected (${formattedNumber}). Bypassing carrier SMS.`);
            return { success: true };
        }

        const token = process.env.INSIGN_SMS_TOKEN || process.env.INSIGN_WHATSAPP_TOKEN || "361|qvSlohCNI5loBq7eumrBLvPI68wuTFsSddLe3Mugd7463735";
        const templateId = "1707177157384254091";
        const entityId = "1701176423722454287";
        const senderId = "MDCNCT";

        const message = `Mediconnect.fit OTP is ${otp}.\nValid for 5 minutes.\nDo not share. - Mediconnect.fit`;

        const gatewayPayload = {
            url: "https://multichannel.insignsms.com/api/v1/sms/sendMessage",
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: {
                token: token,
                senderid: senderId,
                dlt_template_id: templateId,
                dlt_te_id: templateId,
                entity_id: entityId,
                dlt_entity_id: entityId,
                pe_id: entityId,
                numbers: [formattedNumber],
                message: message,
                unicode: 0,
                personalized: 0
            }
        };

        const result = await execute("sms", gatewayPayload);
        return { success: result.success };
    } catch (err) {
        console.error("[SMS GATEWAY] Exception inside sendGenericOTPViaSMS:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Sends a WhatsApp invitation message to a doctor using Meta Cloud API.
 * @param {string} phone_number - Recipient's phone number
 * @param {string} doctor_name - Name of the doctor
 * @param {string} invite_link - Secure registration link
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function sendDoctorWhatsAppInvite(phone_number, doctor_name, invite_link) {
    try {
        if (!phone_number) {
            throw new Error("Phone number is required");
        }

        // Clean "Dr." prefix for WhatsApp parameters because the Meta template text starts with "Hello Dr. {{1}},"
        let cleanWhatsAppName = doctor_name || "";
        const drRegex = /^dr\.?\s*/i;
        while (drRegex.test(cleanWhatsAppName)) {
            cleanWhatsAppName = cleanWhatsAppName.replace(drRegex, "").trim();
        }
        if (!cleanWhatsAppName) {
            cleanWhatsAppName = "Doctor";
        }

        // Clean number: Keep only digits, ensure 91 prefix, and add leading + as expected by the multichannel gateway
        let formattedNumber = phone_number.replace(/\D/g, "");
        if (formattedNumber.length === 10) {
            formattedNumber = "91" + formattedNumber;
        }
        if (!formattedNumber.startsWith("+")) {
            formattedNumber = "+" + formattedNumber;
        }

        const phone_number_id = process.env.INSIGN_WHATSAPP_PHONE_NUMBER_ID || "935517672969433";
        const token = process.env.INSIGN_WHATSAPP_TOKEN || process.env.INSIGN_SMS_TOKEN || "361|qvSlohCNI5loBq7eumrBLvPI68wuTFsSddLe3Mugd7463735";

        const url = `https://multichannel.insignsms.com/api/v1/whatsapp/${phone_number_id}/messages`;

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "template",
            template: {
                name: "doctor_onboarding_new2",
                language: {
                    code: "en_US"
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            {
                                type: "text",
                                text: cleanWhatsAppName
                            },
                            {
                                type: "text",
                                text: "MediConnect"
                            },
                            {
                                type: "text",
                                text: invite_link
                            }
                        ]
                    }
                ]
            }
        };

        console.log(`[WHATSAPP DISPATCH] Sending invite to ${formattedNumber} via InsignSMS Multichannel API...`);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log(`[WHATSAPP DISPATCH] Result:`, result);

        if (result.error) {
            throw new Error(result.error.message || "Multichannel API error");
        }

        return { success: true, data: result };
    } catch (err) {
        console.error("[WHATSAPP DISPATCH] Failed:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Helper to clean and format a phone number to standard WhatsApp API format (+91XXXXXXXXXX).
 * @param {string} phone_number - Recipient's phone number
 * @returns {string|null} - Formatted number or null if invalid
 */
export function formatWhatsAppNumber(phone_number) {
    if (!phone_number) return null;
    let formatted = phone_number.replace(/\D/g, "");
    if (formatted.length === 10) {
        formatted = "91" + formatted;
    }
    if (!formatted.startsWith("+")) {
        formatted = "+" + formatted;
    }
    return formatted;
}

/**
 * Helper to ensure a doctor's name is cleanly prefixed with "Dr. " without duplicate prefixes (recursively cleans e.g. "Dr. Dr. Dev").
 * @param {string} name 
 * @returns {string}
 */
export function formatDoctorName(name) {
    if (!name) return "";
    let trimmed = name.trim();
    const drRegex = /^dr\.?\s*/i;
    while (drRegex.test(trimmed)) {
        trimmed = trimmed.replace(drRegex, "");
    }
    return "Dr. " + trimmed;
}

/**
 * Helper to format date string to "DD MMM YYYY" (e.g., "2026-05-25" -> "25 May 2026")
 * @param {string} dateStr
 * @returns {string}
 */
export function formatWhatsAppDate(dateStr) {
    if (!dateStr) return "";
    try {
        const parts = dateStr.trim().split("-");
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const monthIndex = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const months = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ];
            const monthName = months[monthIndex];
            if (monthName) {
                return `${day} ${monthName} ${year}`;
            }
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = d.getDate();
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch (e) {
        return dateStr;
    }
}

/**
 * Helper to format time string to 12-hour AM/PM format (e.g., "13:30" -> "01:30 PM")
 * @param {string} timeStr
 * @returns {string}
 */
export function formatWhatsAppTime(timeStr) {
    if (!timeStr) return "";
    let trimmed = timeStr.trim();
    if (/[ap]m$/i.test(trimmed)) {
        return trimmed;
    }
    try {
        const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (match) {
            let hours = parseInt(match[1], 10);
            const minutes = match[2];
            const ampm = hours >= 12 ? "PM" : "AM";
            hours = hours % 12;
            hours = hours ? hours : 12;
            const hoursStr = hours < 10 ? "0" + hours : hours;
            return `${hoursStr}:${minutes} ${ampm}`;
        }
        return timeStr;
    } catch (e) {
        return timeStr;
    }
}



// WhatsApp status mappings
const APPOINTMENT_STATUS_MESSAGES = {
    booked: "Your appointment has been booked successfully.",
    rescheduled: "Your appointment has been rescheduled.",
    cancelled: "Your appointment has been cancelled.",
    confirmed: "Your appointment has been confirmed.",
    delayed: "Your appointment has been delayed.",
    completed: "Your appointment has been completed.",
    rejected: "Your appointment has been rejected."
};

const PAYMENT_STATUS_MESSAGES = {
    success: "Your payment has been received successfully.",
    received: "Your payment has been received successfully.",
    failed: "Your payment attempt has failed.",
    refund_initiated: "Your refund has been initiated successfully.",
    refunded: "Your refund has been initiated successfully."
};

/**
 * Sends an appointment reminder template message.
 */
export async function sendAppointmentReminder({
    phone_number,
    recipient_name,
    appointment_code,
    patient_name,
    doctor_or_service,
    date,
    time,
    location_or_mode,
    patient_id = null
}) {
    try {
        if (!phone_number || !recipient_name || !appointment_code || !patient_name || !doctor_or_service || !date || !time || !location_or_mode) {
            throw new Error("Missing required parameters for appointment reminder");
        }

        // DPDP Consent Check
        if (patient_id) {
            const hasConsent = await checkActiveConsent(patient_id, "DATA_SHARING");
            if (!hasConsent) {
                console.warn(`[WHATSAPP VALIDATION] DPDP Block: Patient ${patient_id} has not consented to DATA_SHARING.`);
                return { success: false, error: "DPDP_CONSENT_VIOLATION: Patient consent for data sharing is not active." };
            }
        }

        const displayDoctor = formatDoctorName(doctor_or_service);
        const displayDate = formatWhatsAppDate(date);
        const displayTime = formatWhatsAppTime(time);
        const formattedNumber = formatWhatsAppNumber(phone_number);
        const token = process.env.INSIGN_WHATSAPP_TOKEN || "361|qvSlohCNI5loBq7eumrBLvPI68wuTFsSddLe3Mugd7463735";
        const phone_number_id = process.env.INSIGN_WHATSAPP_PHONE_NUMBER_ID || "935517672969433";
        const url = `https://multichannel.insignsms.com/api/v1/whatsapp/${phone_number_id}/messages`;

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "template",
            template: {
                name: "mediconnect_appointment_reminder",
                language: {
                    code: "en_US"
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: recipient_name },
                            { type: "text", text: appointment_code },
                            { type: "text", text: patient_name },
                            { type: "text", text: displayDoctor },
                            { type: "text", text: displayDate },
                            { type: "text", text: displayTime },
                            { type: "text", text: location_or_mode }
                        ]
                    }
                ]
            }
        };

        console.log(`[WHATSAPP DISPATCH] Sending appointment reminder to ${formattedNumber}...`);
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log(`[WHATSAPP DISPATCH] Reminder response:`, result);

        if (result.error) {
            console.warn(`[WHATSAPP DISPATCH] Warning: WhatsApp reminder rejected for ${formattedNumber}: ${result.error.message || "Provider error"} (code: ${result.error.code || 400})`);
            return { success: false, error: result.error.message || "Multichannel API error", metaError: result.error };
        }

        return { success: true, data: result };
    } catch (err) {
        console.warn("[WHATSAPP DISPATCH] Warning: WhatsApp reminder error:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Sends an appointment status update template alert.
 */
export async function sendAppointmentUpdateAlert({
    phone_number,
    recipient_name,
    status_type,
    appointment_code,
    patient_name,
    doctor_or_service,
    date,
    time,
    location_or_mode,
    patient_id = null
}) {
    try {
        if (!phone_number || !recipient_name || !status_type || !appointment_code || !patient_name || !doctor_or_service || !date || !time || !location_or_mode) {
            throw new Error("Missing required parameters for appointment update alert");
        }

        // DPDP Consent Check
        if (patient_id) {
            const hasConsent = await checkActiveConsent(patient_id, "DATA_SHARING");
            if (!hasConsent) {
                console.warn(`[WHATSAPP VALIDATION] DPDP Block: Patient ${patient_id} has not consented to DATA_SHARING.`);
                return { success: false, error: "DPDP_CONSENT_VIOLATION: Patient consent for data sharing is not active." };
            }
        }

        const displayDoctor = formatDoctorName(doctor_or_service);
        const displayDate = formatWhatsAppDate(date);
        const displayTime = formatWhatsAppTime(time);
        const statusMessage = APPOINTMENT_STATUS_MESSAGES[status_type] || `Your appointment has been ${status_type}.`;
        const formattedNumber = formatWhatsAppNumber(phone_number);
        const token = process.env.INSIGN_WHATSAPP_TOKEN || "361|qvSlohCNI5loBq7eumrBLvPI68wuTFsSddLe3Mugd7463735";
        const phone_number_id = process.env.INSIGN_WHATSAPP_PHONE_NUMBER_ID || "935517672969433";
        const url = `https://multichannel.insignsms.com/api/v1/whatsapp/${phone_number_id}/messages`;

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "template",
            template: {
                name: "mediconnect_appointment_update_alert",
                language: {
                    code: "en_US"
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: recipient_name },
                            { type: "text", text: statusMessage },
                            { type: "text", text: appointment_code },
                            { type: "text", text: patient_name },
                            { type: "text", text: displayDoctor },
                            { type: "text", text: displayDate },
                            { type: "text", text: displayTime },
                            { type: "text", text: location_or_mode }
                        ]
                    }
                ]
            }
        };

        console.log(`[WHATSAPP DISPATCH] Sending appointment update (${status_type}) to ${formattedNumber}...`);
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log(`[WHATSAPP DISPATCH] Update alert response:`, result);

        // Simultaneously dispatch SMS alert via InsignSMS Gateway
        (async () => {
            try {
                let cleanPhone = phone_number.replace(/\D/g, "");
                if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
                cleanPhone = "91" + cleanPhone;
                const smsMessage = `MediConnect: Your appointment (${appointment_code}) with ${displayDoctor} is ${status_type.toUpperCase()} for ${displayDate} at ${displayTime}. Mode: ${location_or_mode}. - Mediconnect.fit`;
                const smsPayload = {
                    url: "https://multichannel.insignsms.com/api/v1/sms/sendMessage",
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: {
                        token,
                        senderid: "MDCNCT",
                        dlt_template_id: "1707177157384254091",
                        dlt_te_id: "1707177157384254091",
                        entity_id: "1701176423722454287",
                        dlt_entity_id: "1701176423722454287",
                        pe_id: "1701176423722454287",
                        numbers: [cleanPhone],
                        message: smsMessage,
                        unicode: 0,
                        personalized: 0
                    }
                };
                await execute("sms", smsPayload);
            } catch (smsErr) {
                console.error("[SMS GATEWAY] Failed to dispatch appointment update SMS:", smsErr.message);
            }
        })();

        if (result.error) {
            console.warn(`[WHATSAPP DISPATCH] Warning: WhatsApp update alert rejected for ${formattedNumber}: ${result.error.message || "Provider error"} (code: ${result.error.code || 400})`);
            return { success: false, error: result.error.message || "Multichannel API error", metaError: result.error };
        }

        return { success: true, data: result };
    } catch (err) {
        console.warn("[WHATSAPP DISPATCH] Warning: Appointment update alert error:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Sends a payment update template alert.
 */
export async function sendPaymentUpdate({
    phone_number,
    recipient_name,
    payment_status,
    payment_reference_id,
    paid_amount,
    service_name,
    patient_id = null
}) {
    try {
        if (!phone_number || !recipient_name || !payment_status || !payment_reference_id || !paid_amount || !service_name) {
            throw new Error("Missing required parameters for payment update");
        }

        // DPDP Consent Check
        if (patient_id) {
            const hasConsent = await checkActiveConsent(patient_id, "DATA_SHARING");
            if (!hasConsent) {
                console.warn(`[WHATSAPP VALIDATION] DPDP Block: Patient ${patient_id} has not consented to DATA_SHARING.`);
                return { success: false, error: "DPDP_CONSENT_VIOLATION: Patient consent for data sharing is not active." };
            }
        }

        // Prepend ₹ symbol to amount if not present, e.g. "499" -> "₹499"
        let displayAmount = paid_amount;
        if (!displayAmount.toString().startsWith("₹")) {
            displayAmount = "₹" + displayAmount;
        }

        const paymentMessage = PAYMENT_STATUS_MESSAGES[payment_status] || `Your payment state has been updated to ${payment_status}.`;
        const formattedNumber = formatWhatsAppNumber(phone_number);
        const token = process.env.INSIGN_WHATSAPP_TOKEN || "361|qvSlohCNI5loBq7eumrBLvPI68wuTFsSddLe3Mugd7463735";
        const phone_number_id = process.env.INSIGN_WHATSAPP_PHONE_NUMBER_ID || "935517672969433";
        const url = `https://multichannel.insignsms.com/api/v1/whatsapp/${phone_number_id}/messages`;

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "template",
            template: {
                name: "mediconnect_payment_update",
                language: {
                    code: "en_US"
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: recipient_name },
                            { type: "text", text: paymentMessage },
                            { type: "text", text: payment_reference_id },
                            { type: "text", text: displayAmount },
                            { type: "text", text: service_name }
                        ]
                    }
                ]
            }
        };

        console.log(`[WHATSAPP DISPATCH] Sending payment update (${payment_status}) to ${formattedNumber}...`);
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log(`[WHATSAPP DISPATCH] Payment update response:`, result);

        if (result.error) {
            console.warn(`[WHATSAPP DISPATCH] Warning: WhatsApp payment update rejected for ${formattedNumber}: ${result.error.message || "Provider error"} (code: ${result.error.code || 400})`);
            return { success: false, error: result.error.message || "Multichannel API error", metaError: result.error };
        }

        return { success: true, data: result };
    } catch (err) {
        console.warn("[WHATSAPP DISPATCH] Warning: Payment update error:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Sends a WhatsApp notification acknowledging nursing request submission.
 */
export async function sendNursingRequestReceived({
    phone_number,
    recipient_name,
    lead_code,
    care_types,
    patient_id = null
}) {
    try {
        if (!phone_number || !recipient_name || !lead_code || !care_types) {
            throw new Error("Missing required parameters for nursing request received alert");
        }

        // Clean and format number
        const formattedNumber = formatWhatsAppNumber(phone_number);
        const displayCareTypes = Array.isArray(care_types) ? care_types.join(", ") : care_types;

        const token = process.env.INSIGN_WHATSAPP_TOKEN || "361|qvSlohCNI5loBq7eumrBLvPI68wuTFsSddLe3Mugd7463735";
        const phone_number_id = process.env.INSIGN_WHATSAPP_PHONE_NUMBER_ID || "935517672969433";
        const url = `https://multichannel.insignsms.com/api/v1/whatsapp/${phone_number_id}/messages`;

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "template",
            template: {
                name: "mediconnect_nursing_received",
                language: {
                    code: "en_US"
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: recipient_name },
                            { type: "text", text: lead_code },
                            { type: "text", text: displayCareTypes }
                        ]
                    }
                ]
            }
        };

        console.log(`[WHATSAPP DISPATCH] Sending nursing request received notification to ${formattedNumber}...`);
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log(`[WHATSAPP DISPATCH] Nursing received response:`, result);

        if (result.error) {
            console.warn(`[WHATSAPP DISPATCH] Warning: WhatsApp nursing received alert rejected for ${formattedNumber}: ${result.error.message || "Provider error"} (code: ${result.error.code || 400})`);
            return { success: false, error: result.error.message || "Multichannel API error", metaError: result.error };
        }

        return { success: true, data: result };
    } catch (err) {
        console.warn("[WHATSAPP DISPATCH] Warning: Nursing received notification error:", err.message);
        return { success: false, error: err.message };
    }
}

const NURSING_STATUS_LABELS = {
    NEW: "Request Submitted",
    CONTACTED: "Team Contacted You",
    QUALIFIED: "Request Verified & Qualified",
    SHARED_WITH_PARTNER: "Service Partner Assigned",
    SERVICE_STARTED: "Nursing Service Started",
    NOT_CONVERTED: "Not Converted",
    CLOSED: "Completed"
};

/**
 * Sends a WhatsApp notification on nursing lead status updates.
 */
export async function sendNursingStatusUpdate({
    phone_number,
    recipient_name,
    lead_code,
    new_status,
    note,
    patient_id = null
}) {
    try {
        if (!phone_number || !recipient_name || !lead_code || !new_status) {
            throw new Error("Missing required parameters for nursing status update alert");
        }

        const formattedNumber = formatWhatsAppNumber(phone_number);
        const statusLabel = NURSING_STATUS_LABELS[new_status] || new_status;
        const displayNote = note || "Status updated by operations team.";

        const token = process.env.INSIGN_WHATSAPP_TOKEN || "361|qvSlohCNI5loBq7eumrBLvPI68wuTFsSddLe3Mugd7463735";
        const phone_number_id = process.env.INSIGN_WHATSAPP_PHONE_NUMBER_ID || "935517672969433";
        const url = `https://multichannel.insignsms.com/api/v1/whatsapp/${phone_number_id}/messages`;

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "template",
            template: {
                name: "mediconnect_nursing_status_update",
                language: {
                    code: "en_US"
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: recipient_name },
                            { type: "text", text: lead_code },
                            { type: "text", text: statusLabel },
                            { type: "text", text: displayNote }
                        ]
                    }
                ]
            }
        };

        console.log(`[WHATSAPP DISPATCH] Sending nursing status update to ${formattedNumber}...`);
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log(`[WHATSAPP DISPATCH] Nursing status update response:`, result);

        if (result.error) {
            console.warn(`[WHATSAPP DISPATCH] Warning: WhatsApp nursing status update rejected for ${formattedNumber}: ${result.error.message || "Provider error"} (code: ${result.error.code || 400})`);
            return { success: false, error: result.error.message || "Multichannel API error", metaError: result.error };
        }

        return { success: true, data: result };
    } catch (err) {
        console.warn("[WHATSAPP DISPATCH] Warning: Nursing status update alert error:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Sends a WhatsApp notification to a service partner with lead assignment details.
 */
export async function sendNursingPartnerNotification({
    partner_phone,
    partner_name,
    lead_code,
    patient_name,
    patient_phone,
    care_types,
    city
}) {
    try {
        if (!partner_phone || !partner_name || !lead_code || !patient_name || !patient_phone || !care_types || !city) {
            throw new Error("Missing required parameters for partner notification alert");
        }

        const formattedNumber = formatWhatsAppNumber(partner_phone);
        const displayCareTypes = Array.isArray(care_types) ? care_types.join(", ") : care_types;
        const token = process.env.INSIGN_WHATSAPP_TOKEN || "361|qvSlohCNI5loBq7eumrBLvPI68wuTFsSddLe3Mugd7463735";
        const phone_number_id = process.env.INSIGN_WHATSAPP_PHONE_NUMBER_ID || "935517672969433";
        const url = `https://multichannel.insignsms.com/api/v1/whatsapp/${phone_number_id}/messages`;

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "template",
            template: {
                name: "mediconnect_nursing_partner_share",
                language: {
                    code: "en_US"
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: partner_name },
                            { type: "text", text: lead_code },
                            { type: "text", text: patient_name },
                            { type: "text", text: patient_phone },
                            { type: "text", text: displayCareTypes },
                            { type: "text", text: city }
                        ]
                    }
                ]
            }
        };

        console.log(`[WHATSAPP DISPATCH] Sending nursing partner notification to ${formattedNumber}...`);
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log(`[WHATSAPP DISPATCH] Partner notification response:`, result);

        if (result.error) {
            console.warn(`[WHATSAPP DISPATCH] Warning: WhatsApp nursing partner notification rejected for ${formattedNumber}: ${result.error.message || "Provider error"} (code: ${result.error.code || 400})`);
            return { success: false, error: result.error.message || "Multichannel API error", metaError: result.error };
        }

        return { success: true, data: result };
    } catch (err) {
        console.warn("[WHATSAPP DISPATCH] Warning: Partner notification alert error:", err.message);
        return { success: false, error: err.message };
    }
}

export async function sendSMS(to, body) {
    try {
        console.log(`[SMS DISPATCH] Sending SMS to ${to}: ${body?.slice?.(0, 30)}...`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

export async function sendWhatsAppMessage(to, templateName, parameters) {
    try {
        console.log(`[WHATSAPP DISPATCH] Sending template ${templateName} to ${to}...`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}


