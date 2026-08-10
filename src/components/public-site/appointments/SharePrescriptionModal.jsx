"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { loadRazorpayScript } from "@/lib/razorpay";

/* ─── Share Prescription Modal ────────────────────────── */
function SharePrescriptionModal({
  userId,
  type,
  prescriptionId,
  prescriptionDisplayId,
  medicines = [],
  labTests = [],
  existingOrder,
  onOrdersUpdated,
  onClose,
}) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => {
    return type === "chemist" 
      ? { id: "broadcast", pharmacy_name: "Broadcast to all pharmacies", address: "Competitive Bidding Mode" }
      : null;
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [patientNotes, setPatientNotes] = useState("");
  const [step, setStep] = useState(() => type === "chemist" ? "prompt" : "select"); // "prompt" | "select" | "review" | "consent" | "done" | "broadcast"
  const [orderResult, setOrderResult] = useState(null);
  const [broadcastId, setBroadcastId] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [showPaymentDisclaimer, setShowPaymentDisclaimer] = useState(null);

  const patientId = userId || (typeof window !== "undefined" ? localStorage.getItem("userId") : null);

  const [labTestsCatalog, setLabTestsCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const isChemist = type === "chemist";
  const title = isChemist ? "Order Medicines" : "Order Lab Tests";
  const stepLabels = isChemist ? ["Prompt", "Review", "Broadcast"] : ["Select", "Review", "Consent"];

  const [itemsState, setItemsState] = useState(() => {
    return type === "chemist"
      ? medicines.map((m) => ({ name: m.name || "—", detail: [m.dosage, m.frequency, m.duration].filter(Boolean).join(" · "), ...m }))
      : labTests.map((t) => ({ name: typeof t === "string" ? t : (t?.name || "—"), detail: "" }));
  });

  const items = itemsState;
  const [showPaymentConsentConfirm, setShowPaymentConsentConfirm] = useState(false);

  // Poll responses for broadcast
  useEffect(() => {
    if (step !== "broadcast" || !broadcastId) return;
    const fetchQuotes = async () => {
      try {
        const res = await fetch(`/api/patients/orders/medicine/broadcast/responses?broadcast_id=${broadcastId}`);
        const data = await res.json();
        if (data?.success) {
          setQuotes(data.data.quotes || []);
        }
      } catch (err) {
        console.error("Error fetching broadcast quotes:", err);
      }
    };
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 3000);
    return () => clearInterval(interval);
  }, [step, broadcastId]);

  // Countdown timer for broadcast
  useEffect(() => {
    if (step !== "broadcast" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleSelectQuote = async (quoteId) => {
    setSharing(true);
    const tid = toast.loading("Confirming quote selection...");
    try {
      const res = await fetch("/api/patients/orders/medicine/select-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broadcast_id: broadcastId, quote_id: quoteId })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        toast.success("Quote accepted successfully!");
        window.location.href = `/website/medicine-order?prescription_id=${prescriptionId}`;
      } else {
        toast.error(data?.message || "Failed to select quote");
      }
    } catch (err) {
      toast.error("Error locking in pharmacy quote.");
    } finally {
      setSharing(false);
      toast.dismiss(tid);
    }
  };

  const [testSearch, setTestSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleRemoveItem = (index) => {
    setItemsState((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTest = (catTest) => {
    setItemsState((prev) => [...prev, { name: catTest.test_name, detail: "" }]);
    setTestSearch("");
    setShowSuggestions(false);
  };

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      try {
        const endpoint = isChemist
          ? "/api/chemists/web?limit=200&status=active"
          : "/api/lab/web?limit=200&status=approved";
        const res = await fetch(endpoint);
        const data = await res.json().catch(() => null);
        if (data?.success) {
          const arr = isChemist
            ? (data.data?.data || data.data?.chemists || data.data || [])
            : (data.data?.labs || data.data || []);
          setList(arr);
        }
      } catch {
        toast.error("Failed to load list");
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [type, isChemist]);

  useEffect(() => {
    if (type !== "chemist" && selected) {
      const fetchLabTests = async () => {
        setLoadingCatalog(true);
        try {
          const res = await fetch(`/api/patient/lab/labs/${selected.id}/tests`);
          const data = await res.json().catch(() => null);
          if (data?.success && Array.isArray(data.data?.tests)) {
            setLabTestsCatalog(data.data.tests);
          } else {
            setLabTestsCatalog([]);
          }
        } catch {
          setLabTestsCatalog([]);
        } finally {
          setLoadingCatalog(false);
        }
      };
      fetchLabTests();
    } else {
      setLabTestsCatalog([]);
    }
  }, [selected, type]);

  const getTestPrice = (testName) => {
    if (!testName) return null;
    
    // Normalization function
    const clean = (str) => {
      return (str || "")
        .toLowerCase()
        .replace(/\./g, "") // remove dots (e.g. c.b.c -> cbc)
        .replace(/\b([a-z])\s+(?=[a-z]\b)/g, "$1") // join single characters (e.g. l f t -> lft)
        .replace(/[^a-z0-9+&]/g, " ") // keep letters, numbers, +, &
        .replace(/\s+/g, " ")
        .trim();
    };

    const stripStopWords = (str) => {
      return (str || "")
        .replace(/\b(test|tests|profile|panel|screening|routine|evaluation|report|level|levels|status)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    const containsWordOrPhrase = (text, target) => {
      if (!text || !target) return false;
      const words = text.split(" ");
      const targetWords = target.split(" ");
      if (targetWords.length === 1) {
        return words.includes(targetWords[0]);
      }
      // Contiguous sub-array search for phrase
      for (let i = 0; i <= words.length - targetWords.length; i++) {
        let match = true;
        for (let j = 0; j < targetWords.length; j++) {
          if (words[i + j] !== targetWords[j]) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
      return false;
    };

    const SYNONYMS = {
      "cbc": ["complete blood count", "hemogram", "complete hemogram", "blood count", "hb", "hemoglobin", "dlc", "wbc", "rbc", "platelets"],
      "lft": ["liver function", "liver profile", "liver panel", "sgot", "ast", "sgpt", "alt", "bilirubin", "alkaline phosphatase", "alp"],
      "kft": ["kidney function", "renal function", "rft", "renal profile", "kidney profile", "creatinine", "urea", "bun", "uric acid"],
      "rft": ["renal function", "kidney function", "kft", "renal profile", "kidney profile", "creatinine", "urea", "bun", "uric acid"],
      "tft": ["thyroid profile", "thyroid function", "t3 t4 tsh", "tsh", "thyroid stimulating hormone", "thyroid panel"],
      "tsh": ["thyroid stimulating hormone", "thyroid profile", "thyroid function", "tft"],
      "hba1c": ["glycated hemoglobin", "glycosylated hemoglobin", "glycated haemoglobin", "glycosylated haemoglobin", "hb a1c", "a1c"],
      "fbs": ["fasting blood sugar", "fasting blood glucose", "fbg", "fasting sugar"],
      "ppbs": ["post prandial blood sugar", "post prandial blood glucose", "ppbg", "postprandial", "pp blood sugar"],
      "rbs": ["random blood sugar", "random blood glucose", "rbg", "random sugar"],
      "lipid": ["lipid profile", "lipid panel", "cholesterol", "serum cholesterol", "lipids"],
      "crp": ["c reactive protein", "c-reactive protein"],
      "esr": ["erythrocyte sedimentation rate"],
      "vit d": ["vitamin d", "vit d3", "vitamin d3", "25 oh vitamin d", "25-hydroxy vitamin d"],
      "vit b12": ["vitamin b12", "cyanocobalamin", "b12"],
      "urine routine": ["urine routine examination", "urine re", "urine analysis", "urinalysis", "urine routine & microscopy"],
      "urine culture": ["urine culture & sensitivity", "urine c/s", "urine culture and sensitivity"],
      "electrolytes": ["serum electrolytes", "sodium potassium chloride", "electrolyte panel"],
      "rf": ["rheumatoid factor", "ra factor", "rheumatoid arthritis factor"],
      "ana": ["antinuclear antibody", "anti-nuclear antibody"],
      "usg": ["ultrasound", "ultrasonography", "usg whole abdomen", "abdominal scan"],
      "cxr": ["chest x-ray", "chest xray", "x-ray chest", "xray chest"],
      "ecg": ["ekg", "electrocardiogram"]
    };

    const docClean = clean(testName);
    if (!docClean) return null;

    let bestMatch = null;
    let highestScore = 0;

    for (const item of labTestsCatalog) {
      const catClean = clean(item.test_name);
      if (!catClean) continue;

      let score = 0;

      // 1. Exact Match
      if (docClean === catClean) {
        score = 1.0;
      } else {
        const docStripped = stripStopWords(docClean);
        const catStripped = stripStopWords(catClean);

        // 2. Exact match after stopword stripping
        if (docStripped === catStripped && docStripped.length > 0) {
          score = 0.95;
        } else {
          // 3. Synonym / Acronym Match
          for (const [key, expansions] of Object.entries(SYNONYMS)) {
            const keyClean = clean(key);
            if (docStripped === keyClean) {
              if (catStripped === keyClean || expansions.some(exp => {
                const expClean = stripStopWords(clean(exp));
                return catStripped === expClean || containsWordOrPhrase(catStripped, expClean);
              })) {
                score = Math.max(score, 0.9);
              }
            }
            if (catStripped === keyClean) {
              if (docStripped === keyClean || expansions.some(exp => {
                const expClean = stripStopWords(clean(exp));
                return docStripped === expClean || containsWordOrPhrase(docStripped, expClean);
              })) {
                score = Math.max(score, 0.9);
              }
            }
            const docMatches = (docStripped === keyClean || expansions.some(exp => containsWordOrPhrase(docStripped, stripStopWords(clean(exp)))));
            const catMatches = (catStripped === keyClean || expansions.some(exp => containsWordOrPhrase(catStripped, stripStopWords(clean(exp)))));
            if (docMatches && catMatches) {
              score = Math.max(score, 0.85);
            }
          }

          // 4. Word subset matching (e.g. "sugar fasting" -> "fasting blood sugar")
          const docWords = docStripped.split(" ").filter(w => w.length > 0);
          const catWords = catStripped.split(" ").filter(w => w.length > 0);
          if (score === 0 && docWords.length > 0 && catWords.length > 0) {
            const docAllInCat = docWords.every(w => catWords.includes(w));
            const catAllInDoc = catWords.every(w => docWords.includes(w));
            if (docAllInCat || catAllInDoc) {
              const ratio = Math.min(docWords.length, catWords.length) / Math.max(docWords.length, catWords.length);
              score = 0.8 + ratio * 0.05; // 0.8 to 0.85
            }
          }

          // 5. Substring Match (with word boundary check)
          if (score === 0 && docStripped.length >= 3 && catStripped.length >= 3) {
            if (containsWordOrPhrase(catStripped, docStripped) || containsWordOrPhrase(docStripped, catStripped)) {
              const minLen = Math.min(docStripped.length, catStripped.length);
              const maxLen = Math.max(docStripped.length, catStripped.length);
              score = 0.7 + (minLen / maxLen) * 0.1; // 0.7 to 0.8
            }
          }

          // 6. Word intersection (Jaccard-like)
          if (score === 0 && docWords.length > 0 && catWords.length > 0) {
            const intersection = docWords.filter(w => catWords.includes(w));
            if (intersection.length > 0) {
              const union = Array.from(new Set([...docWords, ...catWords]));
              score = (intersection.length / union.length) * 0.7; // max 0.7
            }
          }
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    if (bestMatch && highestScore >= 0.75) {
      return { price: bestMatch.price, id: bestMatch.id };
    }

    return null;
  };

  const memoizedMatches = useMemo(() => {
    if (isChemist || loadingCatalog || !labTestsCatalog.length) return {};
    const map = {};
    items.forEach(item => {
      map[item.name] = getTestPrice(item.name);
    });
    return map;
  }, [items, labTestsCatalog, isChemist]);

  const calculatedTotal = (() => {
    if (isChemist || loadingCatalog) return 0;
    return items.reduce((sum, item) => {
      const match = memoizedMatches[item.name];
      return sum + (match ? parseFloat(match.price) || 0 : 0);
    }, 0);
  })();

  const hasOnRequestTests = (() => {
    if (isChemist || loadingCatalog) return false;
    return items.some(item => !memoizedMatches[item.name]);
  })();

  const filtered = list.filter((item) => {
    const name = isChemist ? (item.pharmacy_name || item.owner_name || "") : (item.lab_name || item.owner_name || "");
    const addr = item.address || "";
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || addr.toLowerCase().includes(q);
  });

  const handleOrder = async () => {
    if (!selected) return;
    if (!consentChecked) {
      toast.error("Please tick the informed consent checkbox at the bottom to proceed.");
      return;
    }

    const totalToPay = items.reduce((sum, item) => {
      const match = getTestPrice(item.name);
      return sum + (match ? parseFloat(match.price) || 0 : 0);
    }, 0);

    if (!isChemist && totalToPay > 0) {
      setShowPaymentConsentConfirm(true);
      return;
    }

    setSharing(true);
    const tid = toast.loading(isChemist ? "Initiating competitive pharmacy bidding…" : "Sending order to lab…");
    try {
      if (isChemist) {
        const res = await fetch("/api/patients/orders/medicine/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prescription_id: prescriptionId,
            patient_id: patientId,
            delivery_address: patientNotes || "Home Address"
          }),
        });
        const data = await res.json().catch(() => null);
        toast.dismiss(tid);
        if (res.ok && data?.success) {
          toast.success("Broadcast started successfully!");
          setBroadcastId(data.data.id);
          setTimeLeft(120);
          setStep("broadcast");
        } else {
          toast.error(data?.message || "Failed to start pharmacy search.");
        }
      } else {
        const endpoint = "/api/patients/orders/lab/create";
        const origNames = labTests.map(t => typeof t === "string" ? t.toLowerCase().trim() : (t?.name || t?.test_name || "").toLowerCase().trim());
        const mappedTests = items.map((t) => {
          const name = typeof t === "string" ? t : (t?.name || t?.test_name || "");
          const match = getTestPrice(name);
          const isCustom = !origNames.includes(name.toLowerCase().trim());
          return {
            test_id: match?.id || null,
            test_name: name,
            price: match?.price || null,
            notes: isCustom ? "Added by patient (custom test)" : null
          };
        });

        const customTests = items.filter(t => {
          const name = typeof t === "string" ? t : (t?.name || t?.test_name || "");
          return !origNames.includes(name.toLowerCase().trim());
        });

        let finalNotes = patientNotes || "";
        if (customTests.length > 0) {
          const listStr = customTests.map(t => typeof t === "string" ? t : (t?.name || t?.test_name || "")).join(", ");
          finalNotes = `[PATIENT_CONSENT_FOR_CUSTOM_TESTS: AGREED] Patient explicitly consented to add these custom tests not in original prescription: ${listStr}.\n${finalNotes}`;
        }

        const body = { prescription_id: prescriptionId, patient_id: patientId, lab_id: selected.id, tests: mappedTests, patient_notes: finalNotes || undefined };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        toast.dismiss(tid);
        if (res.ok && data?.success) {
          const newOrder = data?.data;
          if (existingOrder?.id && existingOrder?.id !== newOrder?.id) {
            const shouldCancel = existingOrder?.lab_id && existingOrder.lab_id !== selected.id;
            if (shouldCancel) {
              const cancelEndpoint = "/api/patients/orders/lab/update-status";
              await fetch(cancelEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: existingOrder.id, status: "cancelled", cancelled_by: "patient" })
              }).catch(() => {});
            }
          }
          toast.success("Order sent to laboratory!");
          if (typeof onOrdersUpdated === "function") await onOrdersUpdated(prescriptionId);
          setOrderResult(newOrder);
          setStep("done");
        } else {
          toast.error(data?.message || "Failed to place order");
        }
      }
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err.message || "Failed to place order");
    } finally {
      setSharing(false);
    }
  };

  const startSecurePaymentCheckout = async () => {
    setShowPaymentConsentConfirm(false);
    setSharing(true);
    const payTid = toast.loading("Initiating secure payment checkout…");
    try {
      const origNames = labTests.map(t => typeof t === "string" ? t.toLowerCase().trim() : (t?.name || t?.test_name || "").toLowerCase().trim());
      const mappedTests = items.map((t) => {
        const name = typeof t === "string" ? t : (t?.name || t?.test_name || "");
        const match = getTestPrice(name);
        const isCustom = !origNames.includes(name.toLowerCase().trim());
        return {
          test_id: match?.id || null,
          test_name: name,
          price: match?.price || null,
          notes: isCustom ? "Added by patient (custom test)" : null
        };
      });

      const customTests = items.filter(t => {
        const name = typeof t === "string" ? t : (t?.name || t?.test_name || "");
        return !origNames.includes(name.toLowerCase().trim());
      });

      let finalNotes = patientNotes || "";
      if (customTests.length > 0) {
        const listStr = customTests.map(t => typeof t === "string" ? t : (t?.name || t?.test_name || "")).join(", ");
        finalNotes = `[PATIENT_CONSENT_FOR_CUSTOM_TESTS: AGREED] Patient explicitly consented to add these custom tests not in original prescription: ${listStr}.\n${finalNotes}`;
      }

      const { data: userProfile } = await supabase
        .from("users")
        .select("phone_number, details:patient_details(full_name, email)")
        .eq("id", patientId)
        .maybeSingle();

      const prefName = userProfile?.details?.full_name || "Patient";
      const prefEmail = userProfile?.details?.email || "";
      const prefPhone = userProfile?.phone_number || "";

      const initRes = await fetch("/api/patient/lab/orders/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          lab_id: selected.id,
          prescription_id: prescriptionId || undefined,
          tests: mappedTests,
          address: {
            full_address: "Video Consultation Prescription Record",
            city: "Online",
            pincode: "110001"
          },
          visit_type: "home_collection",
          patient_notes: finalNotes || undefined,
          consents: {
            data_sharing_consent: true,
            prescription_sharing_consent: true,
            sample_collection_consent: true,
            terms_accepted: true
          },
          device_type: "web"
        })
      });

      const initData = await initRes.json().catch(() => null);
      toast.dismiss(payTid);

      if (!initRes.ok || !initData?.success) {
        throw new Error(initData?.message || "Failed to initiate transaction");
      }

      const { order_id, razorpay_order_id, razorpay_key, amount, lab_name } = initData.data;

      await loadRazorpayScript();

      if (typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Razorpay script failed to load. Please check your internet connection.");
      }

      const options = {
        key: razorpay_key,
        amount: amount * 100,
        currency: "INR",
        name: "MediConnect Labs",
        description: `Lab Order - ${lab_name}`,
        order_id: razorpay_order_id,
        handler: async function (response) {
          const verifyTid = toast.loading("Verifying payment transaction…");
          try {
            const verifyRes = await fetch("/api/patient/lab/orders/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
            });

            const verifyData = await verifyRes.json().catch(() => null);
            toast.dismiss(verifyTid);

            if (verifyRes.ok && verifyData?.success) {
              toast.success("Payment verified successfully!");
              if (typeof onOrdersUpdated === "function") await onOrdersUpdated(prescriptionId);
              setOrderResult({ unid: order_id.slice(0, 8).toUpperCase(), id: order_id });
              setStep("done");
            } else {
              throw new Error(verifyData?.message || "Payment signature failed verification");
            }
          } catch (verifyErr) {
            toast.dismiss(verifyTid);
            toast.error(verifyErr.message || "Payment verification failed. Your payment is safe — contact support.");
          } finally {
            setSharing(false);
          }
        },
        image: `${window.location.origin}/real-logo.png`,
        prefill: {
          name: prefName,
          contact: prefPhone,
          email: prefEmail,
        },
        theme: { color: "#0067A1" },
        modal: {
          ondismiss: () => {
            setSharing(false);
            toast.error("Payment cancelled by patient");
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setSharing(false);
        toast.error("Payment failed: " + (response.error?.description || "Unknown failure"));
      });
      rzp.open();

    } catch (checkoutErr) {
      toast.dismiss(payTid);
      toast.error(checkoutErr.message || "Failed to launch payment checkout");
      setSharing(false);
    }
  };

  const getName = (item) => isChemist ? (item.pharmacy_name || item.owner_name || "Unnamed") : (item.lab_name || item.owner_name || "Unnamed");
  const getSubtext = (item) => {
    const parts = [];
    if (item.address) parts.push(item.address);
    if (isChemist && item.mobile) parts.push(item.mobile);
    if (!isChemist && item.phone_number) parts.push(item.phone_number);
    return parts.join(" • ");
  };

  const currentStepIndex = step === "select" || step === "prompt" ? 0 : step === "review" ? 1 : 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col bg-white rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0067A1] to-[#0080C6] text-white shrink-0">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isChemist) {
                  if (step === "consent") setStep("review");
                  else if (step === "broadcast") setStep("consent");
                  else onClose();
                } else {
                  if (step === "review") setStep("select");
                  else if (step === "consent") setStep("review");
                  else onClose();
                }
              }}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="text-[10px] text-white/60">{prescriptionDisplayId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        {step !== "done" && (
          <div className="flex items-center justify-center px-5 pb-3">
            <div className="flex items-center gap-2 w-fit mx-auto">
              {stepLabels.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-all ${
                    i <= currentStepIndex ? "bg-white text-[#0067A1]" : "bg-white/20 text-white/60"
                  }`}>
                    {i < currentStepIndex ? "✓" : i + 1}
                  </div>
                  <span className={`text-[10px] hidden sm:inline ${i <= currentStepIndex ? "text-white" : "text-white/40"}`}>{label}</span>
                  {i < stepLabels.length - 1 && (
                    <div className={`w-10 h-px ${i < currentStepIndex ? "bg-white/60" : "bg-white/15"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {step === "prompt" ? (
          <div className="flex flex-col items-center justify-center p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0067A1] shadow-sm">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-bold text-gray-900">Order Prescribed Medicines</h4>
              <p className="text-xs text-gray-600 max-w-sm leading-relaxed">
                Would you like to order the prescribed medicines through MediConnect's network of partner pharmacies?
              </p>
            </div>

            <div className="w-full max-w-sm bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-[#004F7C] flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>Compare prices from multiple pharmacies</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-[#004F7C] flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>View estimated delivery times</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-[#004F7C] flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>Choose your preferred pharmacy</span>
              </div>
            </div>

            <div className="w-full max-w-sm space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep("review")}
                className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Yes, Find Pharmacies</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-colors"
              >
                No, I'll Arrange Medicines Myself
              </button>
            </div>
          </div>
        ) : step === "done" ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center p-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200"
            >
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h4 className="text-xl font-bold text-gray-900">Order Placed!</h4>
              <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
                Your {isChemist ? "medicine" : "lab test"} order has been sent to{" "}
                <span className="font-semibold text-[#0067A1]">{getName(selected)}</span>.
                {isChemist ? " They will review and share pricing details soon." : " They will contact you for scheduling."}
              </p>
              {orderResult?.unid && (
                <p className="text-xs text-gray-400 mt-2">Order #{orderResult.unid}</p>
              )}
            </motion.div>
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              onClick={onClose}
              className="mt-2 px-8 py-2.5 bg-[#0067A1] text-white rounded-xl text-sm font-semibold hover:bg-[#004F7C] transition-colors shadow-md"
            >
              Done
            </motion.button>
          </div>
        ) : step === "broadcast" ? (
          <div className="p-5 space-y-6">
            {/* Header: Pulsing Scanner & Timer */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0067A1]/5 to-transparent pointer-events-none" />
              
              {/* Pulsing Radar Ring */}
              <div className="relative w-20 h-20 flex items-center justify-center mb-4">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#0067A1] opacity-10 animate-ping duration-1000" />
                <span className="absolute inline-flex h-16 w-16 rounded-full bg-[#0067A1]/20 opacity-20 animate-ping duration-1000" style={{ animationDelay: '0.3s' }} />
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#0067A1] to-[#0080C6] flex items-center justify-center text-white shadow-md">
                  <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a10.5 10.5 0 0114.142 0M3.536 9.536a15 15 0 0121.228 0" />
                  </svg>
                </div>
              </div>

              <h4 className="text-base font-bold text-slate-800">Pharmacy Competitive Bidding</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">
                We are searching for partner pharmacies to fulfill your prescription. This window will remain active for 2 minutes.
              </p>
              
              {/* Countdown Timer */}
              <div className="mt-4 px-4 py-1.5 bg-[#0067A1]/10 text-[#0067A1] font-mono text-sm font-bold rounded-full">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} remaining
              </div>
            </div>

            {/* Quotes list */}
            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Received Quotes ({quotes.length})
              </h5>
              
              {quotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <div className="w-8 h-8 border-2 border-[#0067A1]/30 border-t-[#0067A1] rounded-full animate-spin mb-3" />
                  <p className="text-xs text-slate-500 font-medium">Waiting for quotes from pharmacies...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((q) => (
                    <div key={q.id} className="p-4 border-2 border-slate-100 rounded-2xl bg-white hover:border-[#0067A1]/30 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-sm font-bold shadow-md shrink-0">
                          {q.pharmacy_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h6 className="text-sm font-bold text-slate-800">{q.pharmacy_name}</h6>
                            {q.rating && q.rating > 0 && (
                              <span className="text-[10px] font-semibold text-yellow-600 bg-yellow-50 px-1 rounded flex items-center gap-0.5">
                                ★ {q.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{q.address}</p>
                          <p className="text-[11px] text-[#0067A1] font-medium mt-1">
                            🚚 Delivery: {q.delivery_time_minutes} mins
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-xs text-slate-400 block">Total cost</span>
                          <span className="text-lg font-extrabold text-slate-900">₹{q.estimated_cost}</span>
                        </div>
                        <button
                          onClick={() => handleSelectQuote(q.id)}
                          className="px-4 py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                        >
                          Select Pharmacy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : step === "consent" ? (
          <div className="p-5 space-y-4">
            {/* Order summary card */}
            <div className="bg-gradient-to-br from-[#0067A1]/5 to-[#0067A1]/10 rounded-2xl p-4 border border-[#0067A1]/10">
              {isChemist ? (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    📢
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Broadcast Request</p>
                    <p className="text-xs text-gray-500">Competitive Bidding Mode</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0067A1] text-white flex items-center justify-center text-sm font-bold">
                    {getName(selected).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{getName(selected)}</p>
                    <p className="text-xs text-gray-500">{getSubtext(selected)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-[#0067A1]">
                <span className="px-2 py-0.5 bg-[#0067A1]/10 rounded-full font-medium">{items.length} {isChemist ? "medicine" : "test"}{items.length !== 1 ? "s" : ""}</span>
                <span className="text-gray-400">from prescription {prescriptionDisplayId}</span>
              </div>
              {!isChemist && (
                <div className="mt-3 pt-3 border-t border-[#0067A1]/10 flex items-center justify-between text-xs font-semibold text-[#0067A1]">
                  <span>Estimated Total Price:</span>
                  <span>
                    ₹{calculatedTotal}
                    {hasOnRequestTests && <span className="text-[10px] font-normal text-gray-500"> (+ Price on request)</span>}
                  </span>
                </div>
              )}
            </div>

            {/* Consent box */}
            <div className="rounded-2xl overflow-hidden border border-amber-200">
              <div className="bg-amber-50 px-4 py-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                <h4 className="text-sm font-semibold text-amber-800">Patient Consent Required</h4>
              </div>
              <div className="px-4 py-3 bg-white">
                <p className="text-xs text-gray-600 leading-relaxed">
                  By placing this order, you authorize MediConnect to share your prescription details — including{" "}
                  <span className="font-medium">{isChemist ? "prescribed medications, dosages, and doctor information" : "recommended lab tests and doctor information"}</span>{" "}
                  — with <span className="font-semibold text-[#0067A1]">{isChemist ? "partner pharmacies" : getName(selected)}</span> for the sole purpose of{" "}
                  {isChemist ? "fulfilling your medicine order" : "conducting the prescribed laboratory tests"}.
                </p>
              </div>
            </div>

            {/* Custom Tests Consent Warning */}
            {(() => {
              const origNames = labTests.map(t => typeof t === "string" ? t.toLowerCase().trim() : (t?.name || t?.test_name || "").toLowerCase().trim());
              const customTests = items.filter(t => {
                const name = typeof t === "string" ? t : (t?.name || t?.test_name || "");
                return !origNames.includes(name.toLowerCase().trim());
              });
              if (!isChemist && customTests.length > 0) {
                return (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3">
                    <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="text-xs font-bold text-red-800 uppercase">Extra Tests Consent Required</h4>
                      <p className="text-[11px] text-red-700 mt-1 leading-relaxed">
                        You have added extra tests that were not in your doctor&apos;s original prescription. By ticking the consent box below, you explicitly consent to order these custom tests.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Consent check */}
            <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 border-gray-200 hover:border-[#0067A1]/40 transition-all group">
              <div className="mt-0.5 relative">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:border-[#0067A1] peer-checked:bg-[#0067A1] transition-all flex items-center justify-center">
                  {consentChecked && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </div>
              </div>
              <span className="text-xs text-gray-700 leading-relaxed">
                I give my informed consent to share my prescription <span className="font-mono text-[10px] text-[#0067A1] bg-[#0067A1]/5 px-1 py-0.5 rounded">{prescriptionDisplayId}</span> with{" "}
                <span className="font-semibold">{getName(selected)}</span> and confirm I have read and agree to the above terms.
              </span>
            </label>

            {/* Optional notes */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Add a note (optional)</label>
              <textarea
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder={isChemist ? "e.g. Please deliver to my address…" : "e.g. Preferred time for sample collection…"}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1]"
              />
            </div>

            {/* Confirm button */}
            <button
              onClick={handleOrder}
              disabled={sharing}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#0067A1] to-[#0080C6] hover:from-[#004F7C] hover:to-[#0067A1] transition-all shadow-md shadow-[#0067A1]/20"
            >
              {sharing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Placing Order…
                </span>
              ) : (
                isChemist ? "Confirm & Place Order" : `Confirm & Place Order (₹${calculatedTotal})`
              )}
            </button>
          </div>
        ) : step === "review" ? (
          <div className="p-5 space-y-4">
            {/* Selected provider */}
            {isChemist ? (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  📢
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-850">Broadcast to all partner pharmacies</p>
                  <p className="text-xs text-slate-500">Chemists will compete and offer bids within 2 minutes</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-[#0067A1]/5 rounded-xl border border-[#0067A1]/10">
                <div className="w-10 h-10 rounded-xl bg-[#0067A1] text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {getName(selected).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{getName(selected)}</p>
                  <p className="text-xs text-gray-500 truncate">{getSubtext(selected)}</p>
                </div>
                <button onClick={() => setStep("select")} className="text-xs text-[#0067A1] font-medium hover:underline shrink-0">Change</button>
              </div>
            )}

            {/* Items to share */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {isChemist ? "Medicines to Order" : "Lab Tests to Order"} ({items.length})
              </h4>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const matched = memoizedMatches[item.name];
                  const origNames = labTests.map(t => typeof t === "string" ? t.toLowerCase().trim() : (t?.name || t?.test_name || "").toLowerCase().trim());
                  const isCustom = !isChemist && !origNames.includes((item.name || "").toLowerCase().trim());
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-7 h-7 rounded-lg bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          {isCustom && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                              Patient Added
                            </span>
                          )}
                        </div>
                        {item.detail && <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>}
                        {item.instructions && <p className="text-[11px] text-gray-400 mt-0.5 italic">{item.instructions}</p>}
                      </div>
                      {!isChemist && (
                        <div className="text-right shrink-0 mr-1">
                          {loadingCatalog ? (
                            <span className="text-xs text-gray-400">Loading…</span>
                          ) : matched ? (
                            <span className="text-sm font-semibold text-gray-900">₹{matched.price}</span>
                          ) : (
                            <span className="text-[11px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">On Request</span>
                          )}
                        </div>
                      )}
                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(i)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                        title={isChemist ? "Remove medicine" : "Remove test"}
                      >
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Test Autocomplete (Labs Only) */}
              {!isChemist && (
                <div className="mt-4">
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Add More Tests from Catalog</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={testSearch}
                      onChange={(e) => {
                        setTestSearch(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Search and add tests..."
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0067A1] focus:border-[#0067A1]"
                    />
                    {testSearch && (
                      <button
                        onClick={() => { setTestSearch(""); setShowSuggestions(false); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}

                    <AnimatePresence>
                      {showSuggestions && testSearch.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                          {(() => {
                            const q = testSearch.toLowerCase().trim();
                            const suggestions = labTestsCatalog.filter(catTest => {
                              // Don't show tests already added
                              if (items.some(it => (it.name || "").toLowerCase().trim() === (catTest.test_name || "").toLowerCase().trim())) {
                                return false;
                              }
                              return (catTest.test_name || "").toLowerCase().includes(q) || (catTest.tags || "").toLowerCase().includes(q);
                            }).slice(0, 10);

                            if (suggestions.length === 0) {
                              return (
                                <div className="px-3 py-3 text-xs text-gray-400 text-center">No matching tests in lab catalog</div>
                              );
                            }

                            return suggestions.map((catTest, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleAddTest(catTest)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                              >
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{catTest.test_name}</div>
                                  {catTest.tags && <div className="text-[10px] text-gray-400 truncate">{catTest.tags}</div>}
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <div className="text-xs font-semibold text-[#0067A1]">₹{catTest.price}</div>
                                </div>
                              </button>
                            ));
                          })()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Warning block */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 text-amber-800 text-xs">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="font-semibold mb-0.5">Please note:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {isChemist ? (
                    <>
                      <li>Prices and availability will be confirmed by the pharmacy.</li>
                      <li>Pay directly to the pharmacy upon delivery or pickup.</li>
                    </>
                  ) : (
                    <>
                      <li>Tests marked as &quot;On Request&quot; require the lab to quote a price.</li>
                      <li>Pay at lab / sample collection.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <button
              onClick={() => {
                if (items.length === 0) {
                  toast.error("Please select at least one item to order.");
                  return;
                }
                setStep("consent");
              }}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#0067A1] to-[#0080C6] hover:from-[#004F7C] hover:to-[#0067A1] transition-all shadow-md shadow-[#0067A1]/20"
            >
              Continue to Consent
            </button>
          </div>
        ) : (
          <div className="p-5">
            <h4 className="text-sm font-bold text-gray-900 mb-4">
              Choose a {isChemist ? "pharmacy" : "laboratory"} to send your {isChemist ? "medicines" : "lab tests"}
            </h4>

            {/* Search */}
            <div className="relative mb-5">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${isChemist ? "pharmacies" : "laboratories"}…`}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent rounded-xl text-sm focus:bg-white focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all"
              />
              <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Loading {isChemist ? "pharmacies" : "labs"}…</p>
                </div>
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-3">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSelected(item); setStep("review"); }}
                    className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-[#0067A1]/30 hover:bg-[#0067A1]/5 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center text-lg font-bold group-hover:bg-[#0067A1] group-hover:text-white transition-colors">
                        {getName(item).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-[#0067A1] transition-colors">{getName(item)}</p>
                        <p className="text-xs text-gray-500 mt-0.5 max-w-[200px] sm:max-w-xs truncate">{getSubtext(item)}</p>
                      </div>
                    </div>
                    <ArrowLeftIcon className="w-4 h-4 text-gray-300 group-hover:text-[#0067A1] rotate-180 transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <p className="text-sm font-medium text-gray-500">{search ? "No results found" : `No ${isChemist ? "pharmacies" : "labs"} available`}</p>
                {search && <button onClick={() => setSearch("")} className="text-xs text-[#0067A1] mt-2 font-medium hover:underline">Clear search</button>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Online Payment Consent Confirmation Modal (For Labs) */}
      <AnimatePresence>
        {showPaymentConsentConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowPaymentConsentConfirm(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-5">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-center text-lg font-bold text-gray-900">Confirm Booking</h3>
                <p className="text-center text-sm text-gray-600 mt-2">
                  You are about to securely book this lab test online via Razorpay.
                </p>
                
                <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Total Amount:</span>
                    <span className="font-bold text-gray-900">₹{calculatedTotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Provider:</span>
                    <span className="font-semibold text-gray-900 text-right truncate max-w-[150px]">{getName(selected)}</span>
                  </div>
                </div>
                
                <div className="mt-5 space-y-2">
                  <button
                    onClick={startSecurePaymentCheckout}
                    className="w-full py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    Proceed to Payment
                  </button>
                  <button
                    onClick={() => setShowPaymentConsentConfirm(false)}
                    className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showPaymentDisclaimer && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-5">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-center text-lg font-bold text-gray-950">Direct Payment Disclaimer</h3>
                <p className="text-center text-[11px] text-gray-600 mt-2 leading-relaxed">
                  You are approving this pharmacy quote and making a payment directly to a third-party provider. 
                  <span className="font-semibold text-amber-700"> MediConnect does not collect or process these pharmacy payments</span>, and has no involvement in payment disputes.
                </p>
                <p className="text-center text-[11px] text-gray-500 mt-2 leading-relaxed">
                  You will be redirected to the Medicine Orders tracker to make your payment directly via UPI once the chemist prepares your bill.
                </p>
                
                <div className="mt-5 space-y-2">
                  <button
                    onClick={async () => {
                      const quoteId = showPaymentDisclaimer;
                      setShowPaymentDisclaimer(null);
                      await handleSelectQuote(quoteId);
                    }}
                    className="w-full py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-xl text-sm font-semibold transition-colors shadow-md"
                  >
                    I Understand, Proceed
                  </button>
                  <button
                    onClick={() => setShowPaymentDisclaimer(null)}
                    className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default SharePrescriptionModal;
