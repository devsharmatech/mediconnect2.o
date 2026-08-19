import { supabase } from "@/lib/supabaseAdmin";
import { normalizeDrug } from "./drugSafetyEngine";
import crypto from "crypto";

/**
 * Synchronizes medicines and symptoms from clinical payloads / prescriptions
 * into structured DB tables consultation_medications and consultation_symptoms.
 */
export async function syncClinicalData(consultation_id, medicines = null, symptoms = null) {
  try {
    if (!consultation_id) {
      return { success: false, error: "Missing consultation_id" };
    }

    // --- 1. Sync Medications ---
    if (medicines !== null && Array.isArray(medicines)) {
      // First, delete existing consultation_medications for this consultation_id
      await supabase
        .from("consultation_medications")
        .delete()
        .eq("consultation_id", consultation_id);

      if (medicines.length > 0) {
        const medRows = [];
        for (const med of medicines) {
          const mName = med.medicine_name || med.name || "";
          if (!mName.trim()) continue;

          // Normalize the drug
          let normName = null;
          let isFreeText = true;
          try {
            const normResult = await normalizeDrug(mName);
            if (normResult && normResult.normalized_name) {
              normName = normResult.normalized_name;
              isFreeText = false;
            }
          } catch (e) {
            console.error("Drug normalization error during sync:", e.message);
          }

          medRows.push({
            id: crypto.randomUUID(),
            consultation_id,
            medicine_name: mName,
            normalized_name: normName,
            dosage: med.dosage || "",
            frequency: med.frequency || "",
            duration: med.duration || med.duration_days || "",
            route: med.route || "ORAL",
            instructions: med.instructions || "",
            is_free_text: isFreeText,
            drug_category: med.drug_category || med.category || null,
            quantity: med.quantity ? parseInt(med.quantity, 10) : null,
            is_favorite: med.is_favorite || false,
            created_at: new Date().toISOString()
          });
        }

        if (medRows.length > 0) {
          const { error: medInsertErr } = await supabase
            .from("consultation_medications")
            .insert(medRows);
          if (medInsertErr) {
            console.error("Error inserting consultation_medications:", medInsertErr.message);
          }
        }
      }
    }

    // --- 2. Sync Symptoms ---
    if (symptoms !== null) {
      let parsedSymptoms = [];
      if (typeof symptoms === "string") {
        parsedSymptoms = symptoms.split(",").map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(symptoms)) {
        parsedSymptoms = symptoms.map(s => typeof s === "string" ? s.trim() : (s.symptom_name || s.symptom_id || "")).filter(Boolean);
      }

      // First, delete existing symptoms for this consultation_id
      await supabase
        .from("consultation_symptoms")
        .delete()
        .eq("consultation_id", consultation_id);

      if (parsedSymptoms.length > 0) {
        const symRows = parsedSymptoms.map(sym => {
          const symId = sym.toLowerCase().replace(/[^a-z0-9_]/g, "_").substring(0, 50);
          return {
            id: crypto.randomUUID(),
            consultation_id,
            symptom_id: symId,
            symptom_name: sym,
            severity: "MEDIUM",
            duration: "1 day",
            notes: "",
            created_at: new Date().toISOString()
          };
        });

        const { error: symInsertErr } = await supabase
          .from("consultation_symptoms")
          .insert(symRows);
        if (symInsertErr) {
          console.error("Error inserting consultation_symptoms:", symInsertErr.message);
        }
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Error inside syncClinicalData:", err);
    return { success: false, error: err.message };
  }
}
