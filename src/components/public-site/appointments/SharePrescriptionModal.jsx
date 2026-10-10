"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  Check,
  Star,
  Truck,
  ShieldCheck,
  X,
  Zap,
  AlertTriangle,
  ArrowRight,
  Radio,
  Building2,
  Home,
  Search,
  Trash2,
  MapPin,
  Phone,
  Info,
  Pill,
  Store,
  Clock,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { loadRazorpayScript } from "@/lib/razorpay";

/* ─── Test Name Sanitizer ───────────────────────────── */
function cleanTestName(name) {
  if (!name) return "—";
  let s = String(name).trim();
  // Strip trailing punctuation & symbols like & - / ,
  s = s.replace(/[\s&,-/]+$/, "").trim();
  // Clean dangling ampersands
  s = s.replace(/\s+&\s*$/, "").trim();
  // Fix hyphen spacing if space exists only on right: "Count- CBC" -> "Count - CBC"
  s = s.replace(/-\s+/g, " - ");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ");
  return s || "—";
}

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
  const quotesRef = useRef([]);
  useEffect(() => {
    quotesRef.current = quotes;
  }, [quotes]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [visitType, setVisitType] = useState("home_collection"); // "home_collection" | "walk_in"

  const patientId = userId || (typeof window !== "undefined" ? (localStorage.getItem("userId") || localStorage.getItem("user_id")) : null);

  // Auto-detect if an active broadcast already exists for this prescription
  useEffect(() => {
    if (type !== "chemist" || !prescriptionId) return;

    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/patients/orders/medicine/broadcast/active?prescription_id=${prescriptionId}`);
        const data = await res.json();
        if (isMounted && data?.success && data?.data?.broadcast) {
          const b = data.data.broadcast;
          setBroadcastId(b.id);
          setTimeLeft(b.seconds_remaining || 0);
          if (Array.isArray(data.data.quotes) && data.data.quotes.length > 0) {
            setQuotes(data.data.quotes);
          }
          setStep("broadcast");
        }
      } catch (err) {
        console.warn("Could not check active broadcast:", err);
      }
    })();

    return () => { isMounted = false; };
  }, [type, prescriptionId]);

  const [labTestsCatalog, setLabTestsCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const isChemist = type === "chemist";
  const title = isChemist ? "Order Medicines" : "Order Lab Tests";
  const stepLabels = isChemist ? ["Prompt", "Review", "Broadcast"] : ["Select", "Review", "Consent"];

  const origCleanNames = useMemo(() => {
    return labTests.map((t) => {
      const raw = typeof t === "string" ? t : (t?.name || t?.test_name || "");
      return cleanTestName(raw).toLowerCase().trim();
    });
  }, [labTests]);

  const checkIsCustom = (item) => {
    if (isChemist) return false;
    if (item?.isCustom) return true;
    if (item?.isPrescribed) return false;
    const name = typeof item === "string" ? item : (item?.name || item?.test_name || "");
    const clean = cleanTestName(name).toLowerCase().trim();
    return !origCleanNames.includes(clean);
  };

  const [itemsState, setItemsState] = useState(() => {
    return type === "chemist"
      ? medicines.map((m) => ({ name: m.name || "—", detail: [m.dosage, m.frequency, m.duration].filter(Boolean).join(" · "), isPrescribed: true, isCustom: false, ...m }))
      : labTests.map((t) => {
          const raw = typeof t === "string" ? t : (t?.name || t?.test_name || "—");
          return { name: cleanTestName(raw), detail: "", isPrescribed: true, isCustom: false };
        });
  });

  const items = itemsState;
  const [showPaymentConsentConfirm, setShowPaymentConsentConfirm] = useState(false);
  const [quoteToConfirm, setQuoteToConfirm] = useState(null);
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);
  const [showPaymentDisclaimer, setShowPaymentDisclaimer] = useState(null);

  // Real-time SSE Stream for broadcast quotes (0 DB polling load)
  useEffect(() => {
    if (step !== "broadcast" || !broadcastId) return;

    let es = null;
    let sseActive = false;

    try {
      es = new EventSource(`/api/patients/orders/medicine/broadcast/stream?broadcast_id=${broadcastId}`);

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "INITIAL_QUOTES" && Array.isArray(payload.quotes)) {
            sseActive = true;
            setQuotes(payload.quotes);
            if (payload.seconds_remaining !== undefined) {
              setTimeLeft(payload.seconds_remaining);
            }
          } else if (payload.type === "NEW_QUOTE" && payload.quote) {
            sseActive = true;
            const isUpdate = quotesRef.current.some((q) => q.id === payload.quote.id);
            if (isUpdate) {
              toast.success(`Offer updated: ₹${payload.quote.final_amount || payload.quote.estimated_cost} from ${payload.quote.chemist?.pharmacy_name || "Pharmacy"}`);
            } else {
              toast.success(`New offer: ₹${payload.quote.final_amount || payload.quote.estimated_cost} from ${payload.quote.chemist?.pharmacy_name || "Pharmacy"}`);
            }
            setQuotes((prev) => {
              const exists = prev.some((q) => q.id === payload.quote.id);
              if (exists) return prev.map((q) => (q.id === payload.quote.id ? payload.quote : q));
              return [payload.quote, ...prev];
            });
          } else if (payload.type === "QUOTE_WITHDRAWN" || (payload.type === "BROADCAST_STATUS" && payload.quote_id && payload.status === "withdrawn")) {
            toast("A chemist withdrew their quotation", { icon: "ℹ️" });
            setQuotes((prev) => prev.filter((q) => q.id !== payload.quote_id));
          } else if (payload.type === "BROADCAST_STATUS" && payload.status === "completed") {
            toast("Bidding window closed", { icon: "ℹ️" });
          }
        } catch (e) {
          console.warn("SSE parse error:", e);
        }
      };

      es.onerror = (err) => {
        console.warn("SSE connection error or interrupted, will use gentle fallback sync:", err);
      };
    } catch (e) {
      console.warn("EventSource not supported or failed to initialize:", e);
    }

    // Immediate initial sync & reliable 4-second safety polling so patient never misses quotes
    const fallbackSync = async () => {
      try {
        const res = await fetch(`/api/patients/orders/medicine/broadcast/responses?broadcast_id=${broadcastId}`);
        const data = await res.json();
        if (data?.success && Array.isArray(data.data?.quotes)) {
          setQuotes(data.data.quotes);
          if (data.data?.broadcast?.seconds_remaining !== undefined) {
            setTimeLeft(data.data.broadcast.seconds_remaining);
          }
        }
      } catch (err) {
        console.warn("Fallback fetch error:", err);
      }
    };

    fallbackSync();
    const fallbackTimer = setInterval(fallbackSync, 4000);

    return () => {
      if (es) {
        es.close();
      }
      clearInterval(fallbackTimer);
    };
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
    const tid = toast.loading("Confirming quote & preparing secure payment...");
    try {
      const res = await fetch("/api/patients/orders/medicine/select-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broadcast_id: broadcastId, quote_id: quoteId })
      });
      const data = await res.json();
      toast.dismiss(tid);

      if (!res.ok || !data?.success) {
        toast.error(data?.message || "Failed to select quote");
        setSharing(false);
        return;
      }

      const { order, razorpay_order_id, razorpay_key, amount, pharmacy_name } = data.data || {};

      // Launch Razorpay online payment gateway if order was created
      if (razorpay_order_id && razorpay_key) {
        await loadRazorpayScript();

        if (typeof window === "undefined" || !window.Razorpay) {
          toast.error("Razorpay payment gateway failed to load. Please check your internet connection.");
          setSharing(false);
          return;
        }

        // Prefill patient information
        let prefName = "Patient";
        let prefPhone = "";
        let prefEmail = "";
        if (patientId) {
          try {
            const pRes = await fetch(`/api/profile/get?id=${encodeURIComponent(patientId)}`);
            const pJson = await pRes.json();
            const pData = pJson?.data?.user || pJson?.data?.profile || pJson?.data;
            if (pData) {
              prefName = pData.full_name || pData.owner_name || prefName;
              prefPhone = pData.phone_number || pData.phone || prefPhone;
              prefEmail = pData.email || prefEmail;
            }
          } catch (e) {
            // fallback
          }
        }

        const options = {
          key: razorpay_key,
          amount: Math.round(Number(amount || order?.total_amount || 0) * 100),
          currency: "INR",
          name: "MediConnect Pharmacy",
          description: `Medicine Order - ${pharmacy_name || "Partner Pharmacy"}`,
          order_id: razorpay_order_id,
          handler: async function (paymentResponse) {
            const verifyTid = toast.loading("Verifying payment transaction…");
            try {
              const verifyRes = await fetch("/api/patients/orders/medicine/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  order_id: order.id,
                  razorpay_order_id: paymentResponse.razorpay_order_id,
                  razorpay_payment_id: paymentResponse.razorpay_payment_id,
                  razorpay_signature: paymentResponse.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json().catch(() => null);
              toast.dismiss(verifyTid);

              if (verifyRes.ok && verifyData?.success) {
                toast.success("Payment verified successfully! 🎉");
                if (typeof onOrdersUpdated === "function") await onOrdersUpdated(prescriptionId);
                setOrderResult({
                  unid: order.unid || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
                  id: order.id,
                  amount: amount || order.total_amount,
                  pharmacy_name: pharmacy_name,
                  paid: true,
                  type: "medicine",
                });
                setStep("done");
              } else {
                toast.error(verifyData?.message || "Payment signature verification failed. Please contact support.");
              }
            } catch (vErr) {
              toast.dismiss(verifyTid);
              toast.error("Payment verification failed. Your funds are safe — contact support.");
            } finally {
              setSharing(false);
            }
          },
          image: `${typeof window !== "undefined" ? window.location.origin : ""}/real-logo.png`,
          prefill: {
            name: prefName,
            contact: prefPhone,
            email: prefEmail,
          },
          theme: { color: "#0067A1" },
          modal: {
            ondismiss: () => {
              setSharing(false);
              toast("Payment not completed yet. You can pay anytime from the medicine orders tracker.", { icon: "ℹ️" });
              setOrderResult({
                unid: order?.unid || (order?.id ? `ORD-${order.id.slice(0, 8).toUpperCase()}` : ""),
                id: order?.id,
                amount: amount || order?.total_amount,
                pharmacy_name: pharmacy_name,
                paid: false,
                type: "medicine",
              });
              setStep("done");
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response) => {
          setSharing(false);
          toast.error("Payment failed: " + (response.error?.description || "Transaction declined"));
        });
        rzp.open();
      } else {
        toast.success("Pharmacy quote selected successfully!");
        setOrderResult({
          unid: order?.unid || (order?.id ? `ORD-${order.id.slice(0, 8).toUpperCase()}` : ""),
          id: order?.id,
          amount: amount || order?.total_amount,
          pharmacy_name: pharmacy_name,
          paid: false,
          type: "medicine",
        });
        setStep("done");
      }
    } catch (err) {
      toast.error("Error locking in pharmacy quote and initiating payment.");
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
    setItemsState((prev) => [...prev, { name: cleanTestName(catTest.test_name), detail: "", isPrescribed: false, isCustom: true }]);
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

  const testsTotal = useMemo(() => {
    if (isChemist || loadingCatalog) return 0;
    return items.reduce((sum, item) => {
      const match = memoizedMatches[item.name];
      return sum + (match ? parseFloat(match.price) || 0 : 0);
    }, 0);
  }, [items, memoizedMatches, isChemist, loadingCatalog]);

  const calculatedTotal = useMemo(() => {
    if (isChemist) return 0;
    const fee = (!isChemist && testsTotal > 0 && visitType === "home_collection") ? 150 : 0;
    return testsTotal + fee;
  }, [isChemist, testsTotal, visitType]);

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

    const totalToPay = calculatedTotal;

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
          const bId = data.data?.id || data.data?.broadcast?.id;
          setBroadcastId(bId);
          setTimeLeft(120);
          setQuotes([]);
          setStep("broadcast");
        } else {
          toast.error(data?.message || "Failed to start pharmacy search.");
        }
      } else {
        const endpoint = "/api/patients/orders/lab/create";
        const mappedTests = items.map((t) => {
          const name = typeof t === "string" ? t : (t?.name || t?.test_name || "");
          const cleanName = cleanTestName(name);
          const match = getTestPrice(cleanName);
          const isCustom = checkIsCustom(t);
          return {
            test_id: match?.id || null,
            test_name: cleanName,
            price: match?.price || null,
            notes: isCustom ? "Added by patient (custom test)" : null
          };
        });

        const customTests = items.filter(t => checkIsCustom(t));

        let finalNotes = patientNotes || "";
        if (customTests.length > 0) {
          const listStr = customTests.map(t => typeof t === "string" ? t : (t?.name || t?.test_name || "")).join(", ");
          finalNotes = `[PATIENT_CONSENT_FOR_CUSTOM_TESTS: AGREED] Patient explicitly consented to add these custom tests not in original prescription: ${listStr}.\n${finalNotes}`;
        }

        const body = { 
          prescription_id: prescriptionId, 
          patient_id: patientId, 
          lab_id: selected.id, 
          tests: mappedTests, 
          patient_notes: finalNotes || undefined,
          visit_type: visitType
        };

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

  const handleRestartBroadcast = async () => {
    setSharing(true);
    const tid = toast.loading("Restarting pharmacy search & broadcasting prescription…");
    try {
      const res = await fetch("/api/patients/orders/medicine/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescription_id: prescriptionId,
          patient_id: patientId,
          delivery_address: patientNotes || "Home Address",
        }),
      });
      const data = await res.json().catch(() => null);
      toast.dismiss(tid);
      if (res.ok && data?.success) {
        toast.success("Broadcast restarted! Scanning partner pharmacies.");
        const bId = data.data?.id || data.data?.broadcast?.id;
        setBroadcastId(bId);
        setQuotes([]);
        setTimeLeft(120);
        setStep("broadcast");
      } else {
        toast.error(data?.message || "Failed to restart pharmacy search.");
      }
    } catch (err) {
      toast.dismiss(tid);
      toast.error("Error restarting broadcast.");
    } finally {
      setSharing(false);
    }
  };

  const startSecurePaymentCheckout = async () => {
    setShowPaymentConsentConfirm(false);
    setSharing(true);
    const payTid = toast.loading("Initiating secure payment checkout…");
    try {
      const mappedTests = items.map((t) => {
        const name = typeof t === "string" ? t : (t?.name || t?.test_name || "");
        const cleanName = cleanTestName(name);
        const match = getTestPrice(cleanName);
        const isCustom = checkIsCustom(t);
        return {
          test_id: match?.id || null,
          test_name: cleanName,
          price: match?.price || null,
          notes: isCustom ? "Added by patient (custom test)" : null
        };
      });

      const customTests = items.filter(t => checkIsCustom(t));

      let finalNotes = patientNotes || "";
      if (customTests.length > 0) {
        const listStr = customTests.map(t => typeof t === "string" ? t : (t?.name || t?.test_name || "")).join(", ");
        finalNotes = `[PATIENT_CONSENT_FOR_CUSTOM_TESTS: AGREED] Patient explicitly consented to add these custom tests not in original prescription: ${listStr}.\n${finalNotes}`;
      }

      let prefName = "Patient";
      let prefEmail = "";
      let prefPhone = "";

      if (patientId) {
        try {
          const profileRes = await fetch(`/api/patient/profile?id=${encodeURIComponent(patientId)}`);
          if (profileRes.ok) {
            const profileJson = await profileRes.json();
            const pData = profileJson?.data?.profile || profileJson?.data?.user;
            if (pData) {
              prefName = pData.full_name || prefName;
              prefEmail = pData.email || prefEmail;
              prefPhone = pData.phone_number || prefPhone;
            }
          }
        } catch (e) {
          console.warn("[SharePrescriptionModal] Could not fetch patient profile:", e);
        }
      }

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
          visit_type: visitType,
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
      className="fixed inset-0 z-[10000] flex flex-col bg-white w-full h-[100dvh] sm:h-full sm:absolute sm:inset-0 sm:rounded-2xl sm:z-10 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#005B8E] via-[#0067A1] to-[#007EA7] text-white shrink-0 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
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
              className="p-1.5 hover:bg-white/20 active:scale-95 rounded-xl transition-all cursor-pointer shrink-0"
              title="Go back"
            >
              <ArrowLeftIcon className="w-4.5 h-4.5" />
            </button>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold tracking-tight truncate">{title}</h3>
              <p className="text-[11px] text-white/70 font-mono tracking-wide truncate">
                Ref: {prescriptionDisplayId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 active:scale-95 transition-all cursor-pointer text-white/90 hover:text-white"
            title="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        {step !== "done" && (
          <div className="px-4 sm:px-8 pb-3 pt-0.5">
            <div className="flex items-center justify-between max-w-sm mx-auto">
              {stepLabels.map((label, i) => {
                const isDone = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <React.Fragment key={label}>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all shadow-xs ${
                          isCurrent
                            ? "bg-white text-[#0067A1] ring-4 ring-white/25 scale-105"
                            : isDone
                            ? "bg-white/95 text-[#0067A1]"
                            : "bg-white/15 text-white/60 border border-white/20"
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : i + 1}
                      </div>
                      <span className={`text-[11px] sm:text-xs font-semibold tracking-wide ${
                        isCurrent ? "text-white font-bold" : isDone ? "text-white/85" : "text-white/45"
                      }`}>
                        {label}
                      </span>
                    </div>
                    {i < stepLabels.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${
                          i < currentStepIndex ? "bg-white/80" : "bg-white/20"
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {step === "prompt" ? (
          <div className="flex flex-col items-center justify-center p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0067A1]/10 to-teal-50 border border-teal-100 flex items-center justify-center text-[#0067A1] shadow-xs">
              <Pill className="w-8 h-8 -rotate-45" />
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-bold text-gray-900">Order Prescribed Medicines</h4>
              <p className="text-xs text-gray-600 max-w-sm leading-relaxed">
                Would you like to order the prescribed medicines through MediConnect's network of partner pharmacies?
              </p>
            </div>

            <div className="w-full max-w-sm bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-[#004F7C] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span>Compare prices from multiple pharmacies</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-[#004F7C] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span>View estimated delivery times</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-[#004F7C] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
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
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6 max-w-md mx-auto">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                orderResult?.paid
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200"
                  : "bg-gradient-to-br from-[#0067A1] to-[#004F7C] text-white shadow-sky-200"
              }`}
            >
              {orderResult?.paid ? (
                <Check className="w-8 h-8 stroke-[3]" />
              ) : (
                <ShieldCheck className="w-8 h-8" />
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-1.5">
              <h4 className="text-lg sm:text-xl font-bold text-slate-900">
                {orderResult?.paid ? "Payment Confirmed & Verified! 🎉" : "Order Placed Successfully"}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                {orderResult?.paid
                  ? `Payment of ₹${orderResult.amount || ""} was securely received and audited. ${orderResult.pharmacy_name || "The pharmacy"} has been notified to pack and dispatch your medicines immediately.`
                  : isChemist
                  ? "Your medicine order has been locked. You can complete payment or track fulfillment status anytime."
                  : `Your lab test order has been sent to ${getName(selected)}. They will contact you for sample collection.`}
              </p>

              {orderResult?.unid && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-bold mt-2">
                  <span>Order #{orderResult.unid}</span>
                  {orderResult?.paid && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-full flex flex-col sm:flex-row items-center gap-2 pt-3"
            >
              {isChemist && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.location.href = `/website/medicine-order?prescription_id=${prescriptionId}`;
                  }}
                  className="w-full sm:flex-1 py-2 px-3 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Live Order Tracker</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-2 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </div>
        ) : step === "broadcast" ? (
          <div className="p-5 space-y-6">
            {/* Header: Animated Medicine Radar Scanner & Timer */}
            <div className="flex flex-col items-center justify-center p-6 sm:p-7 bg-gradient-to-b from-sky-50/60 via-slate-50/50 to-white border border-sky-100/80 rounded-2xl sm:rounded-3xl relative overflow-hidden shadow-xs">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0067A1]/10 via-transparent to-transparent pointer-events-none" />
              
              {/* Animated Medicine & Pharmacy Radar */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center mb-4">
                {/* Concentric radar waves */}
                <span className="absolute inline-flex h-full w-full rounded-full border border-sky-300/60 bg-sky-400/10 animate-ping duration-1000" />
                <span 
                  className="absolute inline-flex h-20 w-20 rounded-full border border-teal-300/60 bg-teal-400/10 animate-ping duration-1000" 
                  style={{ animationDelay: '0.4s' }} 
                />
                <span className="absolute inline-flex h-24 w-24 rounded-full border border-dashed border-sky-200 animate-spin" style={{ animationDuration: '12s' }} />

                {/* Floating Pharmacy Node 1: Chemist Store (Top Right) */}
                <motion.div
                  className="absolute -top-1 -right-2 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full shadow-md border border-emerald-100 z-10"
                  animate={{ y: [-2, 3, -2], x: [1, -1, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Store className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] font-bold text-slate-700">Chemist</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </motion.div>

                {/* Floating Pharmacy Node 2: Pharmacy Hub (Bottom Left) */}
                <motion.div
                  className="absolute -bottom-1 -left-2 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full shadow-md border border-sky-100 z-10"
                  animate={{ y: [2, -3, 2], x: [-1, 1, -1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                >
                  <Building2 className="w-3 h-3 text-[#0067A1]" />
                  <span className="text-[10px] font-bold text-slate-700">Pharmacy</span>
                </motion.div>

                {/* Floating Badge 3: Best Price (Top Left) */}
                <motion.div
                  className="absolute top-1 -left-3 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-full shadow-xs border border-amber-100 z-10"
                  animate={{ scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                  <span className="text-[9px] font-bold text-amber-700">Best Price</span>
                </motion.div>

                {/* Central Hub: Glowing Medicine Pill with gentle pulse & tilt */}
                <motion.div
                  className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#005B8E] via-[#0067A1] to-[#00A896] flex items-center justify-center text-white shadow-lg shadow-sky-900/20 z-10"
                  animate={{ rotate: [-6, 6, -6], scale: [1, 1.05, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Pill className="w-7 h-7 text-white drop-shadow -rotate-45" />
                </motion.div>
              </div>

              {/* Status Badge */}
              {timeLeft <= 0 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full mb-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] font-bold text-amber-700 tracking-wide">
                    Search Window Ended
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full mb-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 tracking-wide">
                    Searching Nearby Pharmacies
                  </span>
                </div>
              )}

              <h4 className="text-base font-bold text-slate-800 text-center">Pharmacy Competitive Bidding</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm text-center leading-relaxed">
                Your prescription is sent to local verified chemists. They are reviewing medicine availability and competing to offer you the best discounts.
              </p>
              
              {/* Countdown Timer & Re-broadcast action */}
              {timeLeft <= 0 ? (
                <div className="mt-3.5 flex flex-col sm:flex-row items-center gap-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 text-slate-600 font-mono text-xs font-bold rounded-full border border-slate-200">
                    <Clock className="w-3.5 h-3.5" />
                    <span>0:00 remaining</span>
                  </div>
                  <button
                    type="button"
                    disabled={sharing}
                    onClick={handleRestartBroadcast}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs font-bold rounded-full shadow-xs cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-Broadcast (Search Again)</span>
                  </button>
                </div>
              ) : (
                <div className="mt-3.5 flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0067A1]/10 text-[#0067A1] font-mono text-xs sm:text-sm font-bold rounded-full border border-[#0067A1]/20 shadow-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} remaining</span>
                  </div>
                  <button
                    type="button"
                    disabled={sharing}
                    onClick={handleRestartBroadcast}
                    title="Restart search and broadcast again"
                    className="p-1.5 text-slate-400 hover:text-[#0067A1] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Quotes list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Received Quotes ({quotes.length})
                </h5>
                {quotes.length > 0 && (
                  <button
                    type="button"
                    disabled={sharing}
                    onClick={handleRestartBroadcast}
                    className="text-[11px] font-semibold text-[#0067A1] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restart Search</span>
                  </button>
                )}
              </div>
              
              {quotes.length === 0 ? (
                timeLeft <= 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-amber-200 rounded-2xl bg-amber-50/30 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-700 flex items-center justify-center mb-3">
                      <Clock className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">No quotes received in this window</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                      Pharmacies may not have responded in time. Click below to re-broadcast your prescription and alert chemists again.
                    </p>
                    <button
                      type="button"
                      disabled={sharing}
                      onClick={handleRestartBroadcast}
                      className="mt-4 px-5 py-2.5 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Re-Broadcast Prescription</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-sky-100 rounded-2xl bg-gradient-to-b from-sky-50/30 to-slate-50/40 text-center">
                    <div className="relative mb-3 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#0067A1]/10 flex items-center justify-center text-[#0067A1]">
                        <Store className="w-6 h-6 animate-pulse" />
                      </div>
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700">Waiting for quotes from pharmacies...</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                      Local chemists are calculating their discount and delivery ETA. Quotes will appear here automatically.
                    </p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0067A1] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0067A1] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0067A1] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )
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
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                <span>{q.rating.toFixed(1)}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{q.address}</p>
                          <p className="text-[11px] text-[#0067A1] font-medium mt-1 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-[#0067A1]" />
                            <span>Delivery: {q.delivery_time_minutes} mins</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-[11px] text-slate-400 block font-medium">Final Amount</span>
                          <span className="text-lg font-extrabold text-slate-900">₹{q.final_amount || q.estimated_cost}</span>
                        </div>
                        <button
                          onClick={() => {
                            setQuoteToConfirm(q);
                            setDisclosureAccepted(false);
                          }}
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

            {/* V3 PAYMENT & PHARMACY DISCLOSURE MODAL (Page 5 Step 2 & 3) */}
            {quoteToConfirm && (
              <div className="fixed inset-0 z-[10005] flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border sm:border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left">
                  
                  {/* Fixed Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">Payment & Pharmacy Disclosure</h4>
                        <p className="text-[11px] text-slate-400 truncate">Step 2 & 3 • Final Review & Consent</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuoteToConfirm(null)}
                      className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Scrollable Content Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
                    {/* Selected Offer Breakdown Card */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/80 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h5 className="text-sm font-bold text-slate-900 truncate">
                            {quoteToConfirm.pharmacy_name || quoteToConfirm.chemist?.pharmacy_name || "Partner Pharmacy"}
                          </h5>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {quoteToConfirm.address || quoteToConfirm.chemist?.address || "Registered Pharmacy Partner"}
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold text-[#0067A1] bg-[#0067A1]/10 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-[#0067A1] fill-[#0067A1]" />
                          <span>{quoteToConfirm.delivery_time_minutes || 45} mins ETA</span>
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span>Medicine Subtotal:</span>
                          <span className="font-semibold text-slate-800">
                            ₹{Number(quoteToConfirm.medicine_subtotal || quoteToConfirm.estimated_cost).toFixed(2)}
                          </span>
                        </div>
                        {quoteToConfirm.delivery_charge !== undefined && (
                          <div className="flex justify-between">
                            <span>Delivery Charge:</span>
                            <span className="font-semibold text-slate-800">₹{Number(quoteToConfirm.delivery_charge || 0).toFixed(2)}</span>
                          </div>
                        )}
                        {Number(quoteToConfirm.discount || 0) > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Discount Applied:</span>
                            <span className="font-semibold">-₹{Number(quoteToConfirm.discount).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-slate-200/60 text-sm font-bold text-slate-900">
                          <span>Total Payable Amount:</span>
                          <span className="text-emerald-700 text-base font-extrabold">
                            ₹{Number(quoteToConfirm.final_amount || quoteToConfirm.estimated_cost).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mandatory V3 Step 3 Disclosure Notice */}
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 leading-relaxed space-y-1.5">
                      <p className="font-bold flex items-center gap-1.5 text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Important Service Disclosure:</span>
                      </p>
                      <p className="text-[11px] text-amber-800/90 leading-normal">
                        &ldquo;You are proceeding to pay for your selected pharmacy order. The selected pharmacy is responsible for dispensing and fulfilling the medicines. MediConnect.fit facilitates pharmacy offer discovery, comparison and order coordination. Payment will be processed for the selected pharmacy transaction through the configured payment service.&rdquo;
                      </p>
                    </div>

                    {/* Mandatory V3 Step 2 Confirmation Checkbox */}
                    <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={disclosureAccepted}
                        onChange={(e) => setDisclosureAccepted(e.target.checked)}
                        className="mt-0.5 w-4.5 h-4.5 rounded text-[#0067A1] focus:ring-[#0067A1] cursor-pointer"
                      />
                      <span className="text-xs text-slate-700 font-medium leading-relaxed select-none">
                        &ldquo;I have reviewed the selected pharmacy, medicines, delivery address, estimated delivery time and total payable amount, and I wish to proceed with payment.&rdquo;
                      </span>
                    </label>
                  </div>

                  {/* Fixed Bottom Action Buttons */}
                  <div className="flex items-center gap-2.5 p-3 sm:p-4 border-t border-slate-100 bg-white/95 backdrop-blur-xs shrink-0 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setQuoteToConfirm(null)}
                      className="px-4 py-2 sm:py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!disclosureAccepted || sharing}
                      onClick={() => {
                        const qId = quoteToConfirm.id;
                        setQuoteToConfirm(null);
                        handleSelectQuote(qId);
                      }}
                      className={`flex-1 py-2 sm:py-2.5 px-4 text-white font-medium rounded-lg text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                        disclosureAccepted && !sharing
                          ? "bg-[#0067A1] hover:bg-[#004F7C] cursor-pointer"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <span>Proceed to Pay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : step === "consent" ? (
          <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto w-full">
            {/* Order summary card */}
            <div className="bg-gradient-to-br from-[#0067A1]/5 via-white to-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
              {isChemist ? (
                <div className="flex items-center gap-3.5 mb-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Radio className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Broadcast Request</p>
                    <p className="text-xs text-slate-500">Competitive Bidding Mode</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3.5 mb-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0067A1] to-[#005282] text-white flex items-center justify-center text-base font-bold shadow-xs shrink-0">
                    {getName(selected).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{getName(selected)}</p>
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" /> Partner Lab
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{getSubtext(selected)}</span>
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-[#0067A1] pt-1">
                <span className="px-2.5 py-0.5 bg-[#0067A1]/10 rounded-full font-bold">
                  {items.length} {isChemist ? "medicine" : "test"}{items.length !== 1 ? "s" : ""}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">from Rx {prescriptionDisplayId}</span>
              </div>
              {!isChemist && (
                <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Tests Subtotal:</span>
                    <span className="font-semibold text-slate-900">₹{testsTotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Collection Method:</span>
                    <span className="font-semibold text-slate-900">
                      {visitType === "home_collection" ? "Home Collection (+₹150)" : "Walk-in Lab Visit (FREE)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-sm text-[#0067A1] pt-2 border-t border-slate-100">
                    <span>Total Amount:</span>
                    <span className="text-base font-extrabold">
                      ₹{calculatedTotal}
                      {hasOnRequestTests && <span className="text-[11px] font-normal text-slate-500"> (+ Quote on request)</span>}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Consent box */}
            <div className="rounded-2xl overflow-hidden border border-amber-200/90 shadow-xs">
              <div className="bg-amber-50 px-4 py-3 flex items-center gap-2 border-b border-amber-200/60">
                <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">Informed Patient Consent</h4>
              </div>
              <div className="px-4 py-3.5 bg-white">
                <p className="text-xs text-slate-600 leading-relaxed">
                  By placing this order, you authorize MediConnect to securely share your prescription details — including{" "}
                  <span className="font-medium text-slate-900">
                    {isChemist ? "prescribed medications, dosages, and doctor information" : "recommended lab tests and doctor information"}
                  </span>{" "}
                  — with <span className="font-bold text-[#0067A1]">{isChemist ? "partner pharmacies" : getName(selected)}</span> for the sole purpose of{" "}
                  {isChemist ? "fulfilling your medicine order" : "conducting the prescribed laboratory investigations"}.
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
                  <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 flex gap-3 shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide">Additional Tests Authorization</h4>
                      <p className="text-[11px] text-red-700 mt-1 leading-relaxed">
                        You have added extra tests that were not in your doctor&apos;s original prescription. By ticking the consent box below, you explicitly authorize and consent to order these custom tests.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Consent check */}
            <label className="flex items-start gap-3 cursor-pointer p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#0067A1]/50 hover:bg-slate-50/50 transition-all shadow-xs group">
              <div className="mt-0.5 relative">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded-lg border-2 border-slate-300 peer-checked:border-[#0067A1] peer-checked:bg-[#0067A1] transition-all flex items-center justify-center shadow-xs">
                  {consentChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </div>
              </div>
              <span className="text-xs text-slate-700 leading-relaxed">
                I give my informed consent to share my prescription <span className="font-mono text-[10px] text-[#0067A1] bg-[#0067A1]/10 px-1.5 py-0.5 rounded font-bold">{prescriptionDisplayId}</span> with{" "}
                <span className="font-bold text-slate-900">{getName(selected)}</span> and confirm I agree to the healthcare terms.
              </span>
            </label>

            {/* Optional notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                <span>Special Instructions / Notes</span>
                <span className="text-[11px] text-slate-400 font-normal">Optional</span>
              </label>
              <textarea
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder={isChemist ? "e.g. Please deliver after 5 PM, ring bell on 2nd floor…" : "e.g. Preferred morning time for fasting blood sample…"}
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all"
              />
            </div>

            {/* Confirm button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOrder}
                disabled={sharing}
                className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#0067A1] via-[#0074b7] to-[#0080C6] hover:brightness-105 active:scale-[0.99] transition-all shadow-md hover:shadow-lg shadow-[#0067A1]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sharing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Placing Order…
                  </span>
                ) : (
                  <>
                    <span>{isChemist ? "Confirm & Place Order" : `Confirm & Place Order (₹${calculatedTotal})`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : step === "review" ? (
          <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto w-full">
            {/* Selected provider */}
            {isChemist ? (
              <div className="flex items-center gap-3.5 p-3.5 sm:p-4 bg-gradient-to-r from-amber-50/70 to-orange-50/50 rounded-2xl border border-amber-200/90 shadow-xs">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">Broadcast to all partner pharmacies</p>
                  <p className="text-xs text-slate-500 mt-0.5">Chemists will compete and offer bids within 2 minutes</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Lab Card */}
                <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-[#0067A1]/40 transition-all">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0067A1] to-[#005282] text-white flex items-center justify-center text-base font-bold shadow-xs shrink-0">
                      {getName(selected).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900 truncate">{getName(selected)}</p>
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" /> Partner Lab
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{getSubtext(selected)}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("select")}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#0067A1] bg-[#0067A1]/8 hover:bg-[#0067A1]/15 active:scale-95 transition-all border border-[#0067A1]/20 cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                </div>

                {/* Visit Type / Collection Method Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Collection Method
                    </label>
                    <span className="text-[11px] text-slate-400">Select preference</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Home Collection Option */}
                    <button
                      type="button"
                      onClick={() => setVisitType("home_collection")}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative flex items-start gap-3 ${
                        visitType === "home_collection"
                          ? "border-[#0067A1] bg-[#0067A1]/5 shadow-sm ring-2 ring-[#0067A1]/20"
                          : "border-slate-200 bg-white hover:bg-slate-50/70 hover:border-slate-300"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        visitType === "home_collection"
                          ? "bg-[#0067A1] text-white shadow-xs"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        <Home className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0 pr-5">
                        <p className="text-xs font-bold text-slate-900">Home Collection</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Sample collected at home</p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200">
                          + ₹150
                        </span>
                      </div>
                      <div className={`absolute top-3.5 right-3.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        visitType === "home_collection"
                          ? "border-[#0067A1] bg-[#0067A1] text-white"
                          : "border-slate-300"
                      }`}>
                        {visitType === "home_collection" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>

                    {/* Walk-in Option */}
                    <button
                      type="button"
                      onClick={() => setVisitType("walk_in")}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative flex items-start gap-3 ${
                        visitType === "walk_in"
                          ? "border-[#0067A1] bg-[#0067A1]/5 shadow-sm ring-2 ring-[#0067A1]/20"
                          : "border-slate-200 bg-white hover:bg-slate-50/70 hover:border-slate-300"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        visitType === "walk_in"
                          ? "bg-[#0067A1] text-white shadow-xs"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        <Building2 className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0 pr-5">
                        <p className="text-xs font-bold text-slate-900">Walk-in Lab Visit</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Visit the lab directly</p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          FREE (₹0)
                        </span>
                      </div>
                      <div className={`absolute top-3.5 right-3.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        visitType === "walk_in"
                          ? "border-[#0067A1] bg-[#0067A1] text-white"
                          : "border-slate-300"
                      }`}>
                        {visitType === "walk_in" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Items to share */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span>{isChemist ? "Medicines to Order" : "Lab Tests to Order"}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0067A1]/10 text-[#0067A1]">
                    {items.length}
                  </span>
                </h4>
                {!isChemist && (
                  <span className="text-[11px] text-slate-500">
                    Est. Tests: <strong className="text-slate-900">₹{testsTotal}</strong>
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {items.map((item, i) => {
                  const matched = memoizedMatches[item.name];
                  const isCustom = checkIsCustom(item);
                  const displayName = cleanTestName(item.name);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-[#0067A1]/30 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0067A1]/10 to-[#0067A1]/20 text-[#0067A1] flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900 break-words leading-snug">
                              {displayName}
                            </p>
                            {isCustom && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                                Patient Added
                              </span>
                            )}
                          </div>
                          {item.detail && <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>}
                          {item.instructions && <p className="text-[11px] text-slate-400 mt-0.5 italic">{item.instructions}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isChemist && (
                          <div className="text-right shrink-0">
                            {loadingCatalog ? (
                              <span className="text-xs text-slate-400">Loading…</span>
                            ) : matched ? (
                              <span className="text-sm font-bold text-slate-900 bg-slate-100/90 border border-slate-200 px-2.5 py-1 rounded-xl">
                                ₹{matched.price}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-600 font-semibold bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-xl whitespace-nowrap">
                                On Request
                              </span>
                            )}
                          </div>
                        )}
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(i)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
                          title={isChemist ? "Remove medicine" : "Remove test"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Test Autocomplete (Labs Only) */}
              {!isChemist && (
                <div className="mt-3.5 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Add More Tests from Catalog</span>
                    <span className="text-[11px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={testSearch}
                      onChange={(e) => {
                        setTestSearch(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Search and add tests (e.g. CBC, Thyroid, Vitamin D)..."
                      className="w-full text-xs sm:text-sm pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0067A1]/20 focus:border-[#0067A1] transition-all"
                    />
                    {testSearch && (
                      <button
                        type="button"
                        onClick={() => { setTestSearch(""); setShowSuggestions(false); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    <AnimatePresence>
                      {showSuggestions && testSearch.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute z-20 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100"
                        >
                          {(() => {
                            const q = testSearch.toLowerCase().trim();
                            const suggestions = labTestsCatalog.filter(catTest => {
                              if (items.some(it => (it.name || "").toLowerCase().trim() === (catTest.test_name || "").toLowerCase().trim())) {
                                return false;
                              }
                              return (catTest.test_name || "").toLowerCase().includes(q) || (catTest.tags || "").toLowerCase().includes(q);
                            }).slice(0, 10);

                            if (suggestions.length === 0) {
                              return (
                                <div className="px-4 py-3.5 text-xs text-slate-400 text-center">
                                  No matching tests found in lab catalog
                                </div>
                              );
                            }

                            return suggestions.map((catTest, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleAddTest(catTest)}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <div>
                                  <div className="text-xs sm:text-sm font-semibold text-slate-900">{catTest.test_name}</div>
                                  {catTest.tags && <div className="text-[10px] text-slate-400 mt-0.5">{catTest.tags}</div>}
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <span className="text-xs font-bold text-[#0067A1] bg-[#0067A1]/8 px-2 py-0.5 rounded-lg border border-[#0067A1]/20">
                                    ₹{catTest.price}
                                  </span>
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

            {/* Warning / Note block */}
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 flex gap-3 text-amber-900 text-xs">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-amber-950">Please note:</p>
                <ul className="space-y-0.5 text-[11px] text-amber-800/90">
                  {isChemist ? (
                    <>
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-600 shrink-0" />
                        Prices and availability will be confirmed by the pharmacy.
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-600 shrink-0" />
                        Pay directly to the pharmacy upon delivery or pickup.
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-600 shrink-0" />
                        Tests marked as &quot;On Request&quot; require the lab to quote a price.
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-600 shrink-0" />
                        Pay at lab or during sample collection.
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (items.length === 0) {
                    toast.error("Please select at least one item to order.");
                    return;
                  }
                  setStep("consent");
                }}
                className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#0067A1] via-[#0074b7] to-[#0080C6] hover:brightness-105 active:scale-[0.99] transition-all shadow-md hover:shadow-lg shadow-[#0067A1]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Consent</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Choose a {isChemist ? "pharmacy" : "laboratory"} to fulfill your {isChemist ? "medicines" : "lab tests"}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an authorized healthcare partner near your location
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${isChemist ? "pharmacies" : "laboratories"} by name or location…`}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-[#0067A1] focus:ring-2 focus:ring-[#0067A1]/20 transition-all"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-7 h-7 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium text-slate-400">Locating authorized {isChemist ? "pharmacies" : "labs"}…</p>
                </div>
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-2.5">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSelected(item); setStep("review"); }}
                    className="w-full text-left p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-[#0067A1] hover:bg-[#0067A1]/5 transition-all group flex items-center justify-between gap-3 cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0067A1]/10 to-[#0067A1]/20 text-[#0067A1] flex items-center justify-center text-base font-bold group-hover:bg-[#0067A1] group-hover:text-white transition-all shrink-0">
                        {getName(item).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-[#0067A1] transition-colors truncate">
                            {getName(item)}
                          </p>
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            Verified
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{getSubtext(item)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#0067A1] group-hover:translate-x-0.5 transition-transform">
                      <span>Select</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-slate-200/80">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Building2 className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-slate-700">{search ? "No matching providers found" : `No ${isChemist ? "pharmacies" : "labs"} available in your area`}</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Try refining your search keyword or clearing the search filter</p>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-xs text-[#0067A1] mt-3 font-bold hover:underline cursor-pointer"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Online Payment Consent Confirmation Modal (For Labs) */}
      <AnimatePresence>
        {showPaymentConsentConfirm && (
          <div className="fixed inset-0 z-[10005] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setShowPaymentConsentConfirm(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full h-[100dvh] sm:h-auto sm:max-w-sm bg-white rounded-none sm:rounded-2xl shadow-xl overflow-y-auto flex flex-col justify-center p-6 z-10"
            >
              <div>
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
                    className="w-full py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Proceed to Pay
                  </button>
                  <button
                    onClick={() => setShowPaymentConsentConfirm(false)}
                    className="w-full py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showPaymentDisclaimer && (
          <div className="fixed inset-0 z-[10005] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full h-[100dvh] sm:h-auto sm:max-w-sm bg-white rounded-none sm:rounded-2xl shadow-xl overflow-y-auto flex flex-col justify-center p-6 z-10"
            >
              <div>
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
                    className="w-full py-2 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
                  >
                    Proceed
                  </button>
                  <button
                    onClick={() => setShowPaymentDisclaimer(null)}
                    className="w-full py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
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
