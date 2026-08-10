"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  PhoneIcon,
  PhoneXMarkIcon,
  ClockIcon,
  UserIcon,
  XMarkIcon,
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  MicrophoneIcon as MicrophoneSolidIcon,
  EllipsisVerticalIcon as EllipsisVerticalSolidIcon,
  VideoCameraIcon as VideoCameraSolidIcon,
  DocumentTextIcon as DocumentTextSolidIcon,
} from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import SessionStateTracker from "@/components/doctor/SessionStateTracker";
import { supabase } from "@/lib/supabaseClient";
import { loadRazorpayScript } from "@/lib/razorpay";
import SharePrescriptionModal from "@/components/public-site/appointments/SharePrescriptionModal";

/* ─── Page Wrapper ──────────────────────────────────── */
export default function Page() {
  const params = useParams();
  const searchParams = useSearchParams();

  const appointmentId = params?.id;
  const [userId, setUserId] = useState(null);
  const role = searchParams.get("role") || "doctor";

  useEffect(() => {
    if (searchParams) {
      const val = searchParams.get("userId") || String(Math.floor(Math.random() * 100000));
      const timer = setTimeout(() => {
        setUserId(val);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="h-screen bg-gray-950 overflow-hidden">
      <main className="h-full">
        {appointmentId && userId ? (
          <>
            <SessionStateTracker
              userId={userId}
              consultationId={appointmentId}
              currentScreen={role === "doctor" ? "DOCTOR_VIDEO_CALL" : "PATIENT_VIDEO_CALL"}
            />
            <VideoCall
              appointmentId={appointmentId}
              userId={userId}
              role={role}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading appointment…</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Main Video Call Component ─────────────────────── */
function VideoCall({ appointmentId, userId, role }) {
  const router = useRouter();
  const channelName = `appointment_${appointmentId}`;

  /* refs */
  const clientRef = useRef(null);
  const localTracks = useRef({ audio: null, video: null });
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteUsersRef = useRef(new Map());
  const leaveInProgressRef = useRef(false);
  const agoraRef = useRef(null);

  /* state */
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [hasRemoteUser, setHasRemoteUser] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  // Prescription (patient only)
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [chemistOrder, setChemistOrder] = useState(null);
  const [chemistInfo, setChemistInfo] = useState(null);
  const [labOrder, setLabOrder] = useState(null);
  const [labInfo, setLabInfo] = useState(null);

  // Write prescription (doctor only)
  const [isWriteRxOpen, setIsWriteRxOpen] = useState(false);
  const [appointmentMeta, setAppointmentMeta] = useState(null); // { patient_id, doctor_id, doctor_specialization }
  const [rxLoading, setRxLoading] = useState(false);
  const [prescriptionTemplates, setPrescriptionTemplates] = useState([]);

  // Media readiness (pre-call check)
  const [mediaState, setMediaState] = useState({
    hasCamera: false,
    hasMicrophone: false,
    cameraError: null,
    microphoneError: null,
  });

  /* ── helpers ─────────────────────────────────── */

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  /* ── call timer ──────────────────────────────── */
  useEffect(() => {
    if (!joined) return;
    const id = setInterval(() => setCallDuration((p) => p + 1), 1000);
    return () => clearInterval(id);
  }, [joined]);

  /* ── pre-call: probe devices ─────────────────── */
  const probeDevices = useCallback(async () => {
    let hasCamera = false,
      hasMicrophone = false,
      cameraError = null,
      microphoneError = null;

    try {
      const vs = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      vs.getTracks().forEach((t) => t.stop());
      hasCamera = true;
    } catch (e) {
      cameraError =
        e.name === "NotAllowedError"
          ? "Camera permission denied"
          : e.name === "NotFoundError"
          ? "No camera found"
          : e.name === "NotReadableError"
          ? "Camera in use"
          : "Camera not accessible";
    }

    try {
      const as = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      as.getTracks().forEach((t) => t.stop());
      hasMicrophone = true;
    } catch (e) {
      microphoneError =
        e.name === "NotAllowedError"
          ? "Microphone permission denied"
          : e.name === "NotFoundError"
          ? "No microphone found"
          : e.name === "NotReadableError"
          ? "Microphone in use"
          : "Microphone not accessible";
    }

    const result = { hasCamera, hasMicrophone, cameraError, microphoneError };
    setMediaState(result);
    return result; // return directly so callers don't rely on stale React state
  }, []);

  useEffect(() => {
    probeDevices();
  }, [probeDevices]);

  /* ── load AgoraRTC SDK lazily ────────────────── */
  const loadAgora = async () => {
    if (agoraRef.current) return agoraRef.current;
    const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
    AgoraRTC.setLogLevel(3); // warnings only
    agoraRef.current = AgoraRTC;
    return AgoraRTC;
  };

  /* ── create tracks using DIRECT probe result (not stale state) ── */
  const createTracks = async (AgoraRTC, probe) => {
    let mic = null,
      cam = null;

    // Audio track
    if (probe.hasMicrophone) {
      try {
        mic = await AgoraRTC.createMicrophoneAudioTrack({
          AEC: true,
          ANS: true,
          AGC: true,
        });
      } catch (e) {
        console.warn("Mic track creation failed:", e.message);
      }
    }

    // Video track – 480p for good quality
    if (probe.hasCamera) {
      try {
        cam = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: "480p_1",
          optimizationMode: "detail",
        });
      } catch {
        try {
          cam = await AgoraRTC.createCameraVideoTrack();
        } catch (e2) {
          console.warn("Camera track creation failed:", e2.message);
        }
      }
    }

    return { mic, cam };
  };

  /* ── play local video into ref ──────────────── */
  const playLocalVideo = useCallback(() => {
    const cam = localTracks.current.video;
    if (!cam || !localVideoRef.current) return;
    try {
      cam.play(localVideoRef.current);
    } catch {
      /* already playing */
    }
  }, []);

  // Re-attach local video whenever layout changes
  useEffect(() => {
    if (joined && camOn) {
      const t = setTimeout(playLocalVideo, 120);
      return () => clearTimeout(t);
    }
  }, [joined, camOn, hasRemoteUser, playLocalVideo]);

  /* ── replay remote video when ref or remote users change ── */
  useEffect(() => {
    if (!joined || !hasRemoteUser) return;
    const t = setTimeout(() => {
      for (const user of remoteUsersRef.current.values()) {
        if (user.videoTrack && remoteVideoRef.current) {
          try {
            user.videoTrack.play(remoteVideoRef.current);
          } catch {}
        }
      }
    }, 150);
    return () => clearTimeout(t);
  }, [joined, hasRemoteUser]);

  /* ── JOIN ─────────────────────────────────────── */
  const joinCall = async () => {
    if (loading || joined) return;
    setLoading(true);

    try {
      if (!navigator.mediaDevices) throw new Error("Browser not supported");

      // Probe devices → returns DIRECT result (bypasses stale React state)
      const probe = await probeDevices();

      const loadingToast = toast.loading("Joining consultation…");

      const [tokenRes, AgoraRTC] = await Promise.all([
        fetch("/api/agora/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointment_id: appointmentId,
            uid: userId,
            role: "publisher",
          }),
        }),
        loadAgora(),
      ]);

      if (!tokenRes.ok) {
        toast.dismiss(loadingToast);
        throw new Error("Token server error");
      }

      const tokenData = await tokenRes.json();
      if (!tokenData.status) {
        toast.dismiss(loadingToast);
        throw new Error(tokenData.message || "Authentication failed");
      }

      const { appId, token } = tokenData;

      // Create Agora client
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      // ── Remote user event listeners (BEFORE join so we don't miss events) ──
      client.on("user-published", async (user, mediaType) => {
        console.log(`[Agora] user-published uid=${user.uid} mediaType=${mediaType}`);
        try {
          await client.subscribe(user, mediaType);
          console.log(`[Agora] Subscribed to ${mediaType} from uid=${user.uid}`);

          if (mediaType === "video") {
            remoteUsersRef.current.set(user.uid, user);
            setHasRemoteUser(true);
            setParticipantCount(2);

            // Play remote video with retry
            const playRemoteVideo = (attempt = 0) => {
              if (!remoteVideoRef.current || !user.videoTrack) {
                if (attempt < 5) setTimeout(() => playRemoteVideo(attempt + 1), 300);
                return;
              }
              try {
                user.videoTrack.play(remoteVideoRef.current);
                console.log(`[Agora] Remote video playing from uid=${user.uid}`);
              } catch (e) {
                console.warn("Remote video play error:", e);
                if (attempt < 5) setTimeout(() => playRemoteVideo(attempt + 1), 300);
              }
            };
            playRemoteVideo();

            const who = role === "doctor" ? "Patient" : "Doctor";
            toast.success(`${who} joined the call`);
          }

          if (mediaType === "audio") {
            // Remote audio – play() routes to speakers automatically
            try {
              if (user.audioTrack) {
                user.audioTrack.play();
                console.log(`[Agora] Remote audio playing from uid=${user.uid}`);
              }
            } catch (e) {
              console.warn("Remote audio play error:", e);
            }
          }
        } catch (err) {
          console.error("Subscribe error:", err);
        }
      });

      client.on("user-unpublished", (user, mediaType) => {
        console.log(`[Agora] user-unpublished uid=${user.uid} mediaType=${mediaType}`);
      });

      client.on("user-left", (user) => {
        console.log(`[Agora] user-left uid=${user.uid}`);
        remoteUsersRef.current.delete(user.uid);
        const remaining = remoteUsersRef.current.size;
        setHasRemoteUser(remaining > 0);
        setParticipantCount(remaining + 1);
        const who = role === "doctor" ? "Patient" : "Doctor";
        toast(`${who} left the call`, { icon: "👋" });
      });

      // ── Join channel with null uid → Agora auto-assigns (matches wildcard token) ──
      const assignedUid = await client.join(appId, channelName, token, null);
      console.log(`[Agora] Joined channel=${channelName} assignedUid=${assignedUid}`);
      toast.dismiss(loadingToast);

      // ── Create local tracks using DIRECT probe result ──
      const { mic, cam } = await createTracks(AgoraRTC, probe);
      localTracks.current.audio = mic;
      localTracks.current.video = cam;

      // Local camera preview
      if (cam) {
        setCamOn(true);
        setTimeout(playLocalVideo, 150);
      }
      setMicOn(!!mic);

      // Publish all available tracks
      const toPublish = [mic, cam].filter(Boolean);
      if (toPublish.length > 0) {
        try {
          await client.publish(toPublish);
          const parts = [];
          if (mic) parts.push("audio");
          if (cam) parts.push("video");
          console.log(`[Agora] Published: ${parts.join(", ")}`);
          toast.success(`Connected: ${parts.join(" & ")}`);
        } catch (pubErr) {
          console.error("Publish error:", pubErr);
          toast.error("Failed to publish media");
        }
      } else {
        console.warn("[Agora] No tracks to publish");
        toast.success("Joined (no media available)");
      }

      setJoined(true);
    } catch (err) {
      console.error("Join error:", err);
      const msg =
        err.message?.includes("PERMISSION") || err.name === "NotAllowedError"
          ? "Camera/mic access denied"
          : err.message?.includes("NOT_READABLE")
          ? "Camera in use by another app"
          : "Failed to join consultation";
      toast.error(msg);
      await leaveCall(false).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  /* ── LEAVE ───────────────────────────────────── */
  const leaveCall = async (showToast = true) => {
    if (leaveInProgressRef.current) return;
    leaveInProgressRef.current = true;

    try {
      const client = clientRef.current;
      if (client) {
        client.removeAllListeners();

        for (const key of ["audio", "video"]) {
          const t = localTracks.current[key];
          if (t) {
            try { t.stop(); } catch {}
            try { t.close(); } catch {}
            localTracks.current[key] = null;
          }
        }

        try { await client.unpublish(); } catch {}
        try { await client.leave(); } catch {}
        clientRef.current = null;

        if (joined && showToast) toast("Call ended", { icon: "📞" });
      }

      remoteUsersRef.current.clear();
      setJoined(false);
      setCallDuration(0);
      setHasRemoteUser(false);
      setParticipantCount(1);
      setMicOn(false);
      setCamOn(false);
    } catch (err) {
      console.error("Leave error:", err);
    } finally {
      leaveInProgressRef.current = false;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { leaveCall(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── TOGGLE MIC ──────────────────────────────── */
  const toggleMic = async () => {
    const mic = localTracks.current.audio;
    if (!mic) { toast.error("Microphone not available"); return; }
    try {
      const next = !micOn;
      await mic.setEnabled(next);
      setMicOn(next);
    } catch {
      toast.error("Failed to toggle microphone");
    }
  };

  /* ── TOGGLE CAM ──────────────────────────────── */
  const toggleCam = async () => {
    const cam = localTracks.current.video;
    if (!cam) { toast.error("Camera not available"); return; }
    try {
      const next = !camOn;
      await cam.setEnabled(next);
      setCamOn(next);
      if (next) setTimeout(playLocalVideo, 150);
    } catch {
      toast.error("Failed to toggle camera");
    }
  };

  /* ── Doctor: open write-prescription modal ──── */
  const openPrescription = async () => {
    setRxLoading(true);
    let resolvedMeta = appointmentMeta;

    // Fetch appointment meta + full doctor + patient details if not already cached
    if (!resolvedMeta) {
      try {
        const res = await fetch(`/api/appointment/web/${appointmentId}`);
        const json = await res.json();
        if (json?.success && json?.data?.appointment) {
          const apt = json.data.appointment;
          resolvedMeta = {
            patient_id: apt.patient?.id,
            doctor_id: apt.doctor?.id,
            // Patient info
            patient_name: apt.patient?.full_name || "Patient",
            patient_gender: apt.patient?.gender || "",
            patient_dob: apt.patient?.date_of_birth || "",
            patient_email: apt.patient?.email || "",
            patient_blood_group: apt.patient?.blood_group || "",
            patient_address: apt.patient?.address || "",
            // Doctor info
            doctor_name: apt.doctor?.full_name || "",
            doctor_specialization: apt.doctor?.specialization || "",
            doctor_qualification: (() => {
              const q = apt.doctor?.qualification;
              if (!q) return "";
              if (Array.isArray(q)) return q.join(", ");
              if (typeof q === "string") {
                try { const p = JSON.parse(q); if (Array.isArray(p)) return p.join(", "); } catch {}
              }
              return String(q);
            })(),
            doctor_license: apt.doctor?.license_number || "",
            doctor_clinic: apt.doctor?.clinic_name || "",
            doctor_clinic_address: apt.doctor?.clinic_address || "",
          };
          setAppointmentMeta(resolvedMeta);
        } else {
          console.warn("Could not load appointment meta:", json?.message);
        }
      } catch (e) {
        console.warn("Failed to fetch appointment meta:", e);
      }
    }

    // Fetch prescription templates for doctor's specialization
    try {
      const spec = resolvedMeta?.doctor_specialization || "";
      const tRes = await fetch(
        `/api/prescriptions/get-temp?specialization=${encodeURIComponent(spec)}&appointment_type=video_call`
      );
      const tData = await tRes.json();
      if (tData?.success) {
        const list = tData.templates ?? (tData.template ? [tData.template] : []);
        setPrescriptionTemplates(list);
      }
    } catch (e) {
      console.warn("Failed to load prescription templates:", e);
      setPrescriptionTemplates([]);
    }

    setRxLoading(false);
    setIsWriteRxOpen(true);
  };

  /* ── Patient: fetch prescription ─────────────── */
  const fetchPatientPrescription = async () => {
    if (!joined) return;
    const patientId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!patientId) { toast.error("Not logged in"); return; }

    setPrescriptionLoading(true);
    const tid = toast.loading("Fetching prescription…");

    try {
      const res = await fetch("/api/prescriptions/by-patient-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, appointment_id: appointmentId }),
      });

      const data = await res.json().catch(() => null);
      toast.dismiss(tid);

      if (!res.ok || !data?.success || !data?.data) {
        setPrescriptionData(null);
        toast.error("Prescription not created yet.");
        return;
      }

      setPrescriptionData({
        ...data.data,
        notes: data.data.notes ?? data.data.special_message ?? "",
      });
      await fetchExistingOrders(data.data.id, patientId);
      setIsPrescriptionOpen(true);
    } catch {
      toast.dismiss(tid);
      toast.error("Failed to fetch prescription.");
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const fetchExistingOrders = async (prescriptionId, patientId) => {
    if (!prescriptionId || !patientId) return;
    try {
      const [medRes, labRes] = await Promise.all([
        fetch("/api/patients/orders/medicine/by-prescription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prescription_id: prescriptionId, patient_id: patientId }),
        }),
        fetch("/api/patients/orders/lab/by-prescription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prescription_id: prescriptionId, patient_id: patientId }),
        }),
      ]);

      const medData = await medRes.json().catch(() => null);
      const labData = await labRes.json().catch(() => null);

      const pickLatest = (orders) => {
        if (!Array.isArray(orders) || orders.length === 0) return null;
        const active = orders.filter((o) => (o.status || "").toLowerCase() !== "cancelled");
        const list = active.length ? active : orders;
        return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      };

      const latestMed = pickLatest(medData?.data || []);
      const latestLab = pickLatest(labData?.data || []);

      setChemistOrder(latestMed || null);
      setLabOrder(latestLab || null);

      if (latestMed?.chemist_id) {
        const chemistRes = await fetch(`/api/chemists/web/${latestMed.chemist_id}`);
        const chemistData = await chemistRes.json().catch(() => null);
        setChemistInfo(chemistData?.data || null);
      } else {
        setChemistInfo(null);
      }

      if (latestLab?.lab_id) {
        const labRes = await fetch(`/api/lab/web/${latestLab.lab_id}`);
        const labInfoData = await labRes.json().catch(() => null);
        setLabInfo(labInfoData?.data || null);
      } else {
        setLabInfo(null);
      }
    } catch {
      setChemistOrder(null);
      setLabOrder(null);
      setChemistInfo(null);
      setLabInfo(null);
    }
  };

  const refreshOrders = async (prescriptionIdOverride) => {
    const patientId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    const pid = prescriptionIdOverride || prescriptionData?.id;
    if (!pid || !patientId) return;
    await fetchExistingOrders(pid, patientId);
  };

  /* ─────────────────────────────────────────────── */
  /*   RENDER                                        */
  /* ─────────────────────────────────────────────── */
  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Left Column: Video call & controls */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Override Agora SDK injected video to use contain instead of cover */}
        <style jsx global>{`
          .agora-video-contain video,
          .agora-video-contain .agora_video_player {
            object-fit: contain !important;
            width: 100% !important;
            height: 100% !important;
            background: #000;
          }
        `}</style>
        {/* ── Video area ── */}
        <div className="flex-1 relative overflow-hidden">
        {/* Back button (doctor + patient) */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push(
                role === "doctor"
                  ? "/doctor/appointments"
                  : "/website/appointments"
              );
            }
          }}
          className="absolute top-4 left-4 z-30 inline-flex items-center gap-2 rounded-full bg-black/60 text-white px-3 py-2 text-xs sm:text-sm font-medium backdrop-blur-sm hover:bg-black/70 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>
        {!joined ? (
          /* ── Pre-call lobby ── */
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center max-w-sm mx-auto space-y-5">
              <div className="w-24 h-24 bg-gray-800/80 rounded-full flex items-center justify-center mx-auto ring-4 ring-gray-700/50">
                <VideoCameraIcon className="w-10 h-10 text-gray-300" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white">Ready to join?</h2>
                <p className="text-gray-400 text-sm mt-1 capitalize">Joining as {role}</p>
              </div>

              {/* Device status */}
              <div className="flex justify-center gap-8">
                <DeviceIndicator ok={mediaState.hasMicrophone} label={mediaState.hasMicrophone ? "Mic ready" : "No mic"} Icon={MicrophoneIcon} />
                <DeviceIndicator ok={mediaState.hasCamera} label={mediaState.hasCamera ? "Camera ready" : "No camera"} Icon={VideoCameraIcon} />
              </div>

              {mediaState.cameraError && <DeviceWarning text={`📹 ${mediaState.cameraError}`} />}
              {mediaState.microphoneError && <DeviceWarning text={`🎤 ${mediaState.microphoneError}`} />}

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={joinCall}
                disabled={loading}
                className="w-full max-w-xs mx-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-2xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Spinner /><span>Joining…</span></>
                ) : (
                  <><PhoneIcon className="w-5 h-5" /><span>Join Consultation</span></>
                )}
              </motion.button>

              <p className="text-gray-500 text-xs">You can join even without camera/mic</p>
            </div>
          </div>
        ) : (
          /* ── Active call ── */
          <div className="relative w-full h-full">
            {/* Remote video – full screen background */}
            <div className="absolute inset-0 bg-black">
              <div ref={remoteVideoRef} className="w-full h-full agora-video-contain" />

              {/* Waiting overlay when nobody else is in the call */}
              {!hasRemoteUser && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                  <div className="text-center space-y-3">
                    <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto ring-4 ring-gray-700/40">
                      <UserIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Waiting for {role === "doctor" ? "patient" : "doctor"}…</p>
                      <p className="text-gray-500 text-xs mt-1">They will appear here once they join</p>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Remote user label */}
              {hasRemoteUser && (
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                  {role === "doctor" ? "Patient" : "Doctor"}
                </div>
              )}
            </div>

            {/* Local PIP – ALWAYS visible for BOTH doctor and patient */}
            <div className="absolute bottom-20 right-3 w-36 h-48 sm:w-44 sm:h-56 bg-gray-900 rounded-2xl overflow-hidden border-2 border-gray-700/60 shadow-2xl z-10">
              <div ref={localVideoRef} className="w-full h-full agora-video-contain" />

              <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-medium">
                You
              </div>

              {/* Camera-off overlay */}
              {(!localTracks.current.video || !camOn) && (
                <div className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                    <UserIcon className="w-7 h-7 text-gray-400" />
                  </div>
                  <span className="text-gray-500 text-[10px]">Camera off</span>
                </div>
              )}
            </div>

            {/* Call status bar */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-1.5 rounded-full z-10">
              <div className="flex items-center gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span className="font-mono tabular-nums">{formatDuration(callDuration)}</span>
                </div>
                <div className="w-px h-3 bg-white/30" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span>{participantCount} {participantCount === 1 ? "participant" : "participants"}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Controls bar ── */}
      <div className="bg-gray-950 border-t border-gray-800/60 py-4 px-4 z-20">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            {/* Mic */}
            <ControlButton
              onClick={toggleMic}
              disabled={!joined || !localTracks.current.audio}
              active={micOn}
              activeClass="bg-emerald-500 hover:bg-emerald-600"
              inactiveClass="bg-red-600 hover:bg-red-700"
              title={micOn ? "Mute" : "Unmute"}
            >
              {micOn ? (
                <MicrophoneSolidIcon className="w-6 h-6 text-white" />
              ) : (
                <span className="relative flex items-center justify-center">
                  <MicrophoneSolidIcon className="w-6 h-6 text-white" />
                  <span className="absolute w-7 h-0.5 bg-white rotate-45 rounded-full" />
                </span>
              )}
            </ControlButton>

            {/* Camera */}
            <ControlButton
              onClick={toggleCam}
              disabled={!joined || !localTracks.current.video}
              active={camOn}
              activeClass="bg-gray-700 hover:bg-gray-600"
              inactiveClass="bg-red-600 hover:bg-red-700"
              title={camOn ? "Turn off camera" : "Turn on camera"}
            >
              {camOn ? (
                <VideoCameraSolidIcon className="w-6 h-6 text-white" />
              ) : (
                <VideoCameraSlashIcon className="w-6 h-6 text-white" />
              )}
            </ControlButton>

            {/* Join / Hang-up */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={joined ? () => leaveCall(true) : joinCall}
              disabled={loading}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                joined ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {loading ? <Spinner /> : joined ? <PhoneXMarkIcon className="w-6 h-6 text-white" /> : <PhoneIcon className="w-6 h-6 text-white" />}
            </motion.button>

            {/* Role-specific button */}
            {role === "doctor" ? (
              <ControlButton
                onClick={openPrescription}
                disabled={!joined || rxLoading}
                active
                activeClass="bg-[#0067A1] hover:bg-[#004F7C]"
                inactiveClass="bg-gray-700"
                title={rxLoading ? "Loading prescription…" : "Write prescription"}
              >
                {rxLoading ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <Spinner size="w-4 h-4" />
                    <span className="text-white text-[9px] font-semibold leading-none">Loading</span>
                  </div>
                ) : (
                  <span className="text-white text-sm font-bold">Rx</span>
                )}
              </ControlButton>
            ) : (
              <ControlButton
                onClick={fetchPatientPrescription}
                disabled={!joined || prescriptionLoading}
                active
                activeClass="bg-gradient-to-r from-[#0067A1] to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                inactiveClass="bg-gray-700"
                title="Fetch & View Prescription"
              >
                {prescriptionLoading ? (
                  <Spinner size="w-5 h-5" />
                ) : (
                  <DocumentTextSolidIcon className="w-6 h-6 text-white" />
                )}
              </ControlButton>
            )}
          </div>

          {/* Media status */}
          {joined && (
            <div className="mt-3 flex items-center justify-center gap-4 text-xs">
              <StatusDot ok={!!localTracks.current.audio} label={localTracks.current.audio ? "Audio" : "No audio"} />
              <StatusDot ok={!!localTracks.current.video} label={localTracks.current.video ? "Video" : "No video"} />
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Right Column: Write Prescription Panel (Doctor only) */}
      {role === "doctor" && isWriteRxOpen && (
        <div className="hidden lg:block w-[550px] xl:w-[650px] h-full shrink-0 z-30">
          <WritePrescriptionModal
            appointmentId={appointmentId}
            meta={appointmentMeta}
            templates={prescriptionTemplates}
            onClose={() => setIsWriteRxOpen(false)}
            isSidebarPanel={true}
          />
        </div>
      )}

      {/* ── Patient Prescription Modal ── */}
      <AnimatePresence>
        {role === "patient" && isPrescriptionOpen && (
          <PrescriptionModal
            userId={userId}
            data={prescriptionData}
            chemistOrder={chemistOrder}
            chemistInfo={chemistInfo}
            labOrder={labOrder}
            labInfo={labInfo}
            onOrdersUpdated={refreshOrders}
            onClose={() => setIsPrescriptionOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Doctor Write-Prescription Modal (Mobile/Tablet Fallback) ── */}
      <AnimatePresence>
        {role === "doctor" && isWriteRxOpen && (
          <div className="lg:hidden">
            <WritePrescriptionModal
              appointmentId={appointmentId}
              meta={appointmentMeta}
              templates={prescriptionTemplates}
              onClose={() => setIsWriteRxOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Reusable sub-components ────────────────────────── */

function ControlButton({ onClick, disabled, active, activeClass, inactiveClass, title, children }) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.1 }}
      whileTap={{ scale: disabled ? 1 : 0.9 }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
        active ? activeClass : inactiveClass
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {children}
    </motion.button>
  );
}

function Spinner({ size = "w-5 h-5" }) {
  return <div className={`${size} border-2 border-white/30 border-t-white rounded-full animate-spin`} />;
}

function DeviceIndicator({ ok, label, Icon }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${ok ? "text-emerald-400" : "text-red-400"}`}>
      <Icon className="w-5 h-5" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

function DeviceWarning({ text }) {
  return (
    <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-400">
      {text}
    </div>
  );
}

function StatusDot({ ok, label }) {
  return (
    <div className={`flex items-center gap-1.5 ${ok ? "text-emerald-400" : "text-red-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
      <span>{label}</span>
    </div>
  );
}

function formatSpecialMessage(text) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        
        // Match [SECTION NAME]
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          const sectionTitle = trimmed.slice(1, -1).replace(/_/g, " ").toUpperCase();
          return (
            <div
              key={idx}
              className="font-bold text-gray-800 border-b border-gray-150 pb-0.5 mb-1.5 mt-3 first:mt-0 text-xs tracking-wider uppercase"
            >
              {sectionTitle}
            </div>
          );
        }
        
        // Match key: value
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0) {
          const key = trimmed.slice(0, colonIdx).trim();
          const val = trimmed.slice(colonIdx + 1).trim();
          return (
            <div key={idx} className="py-0.5 flex gap-2 text-xs sm:text-sm">
              <span className="text-gray-500 font-semibold shrink-0">{key}:</span>
              <span className="text-gray-900 font-bold">{val}</span>
            </div>
          );
        }
        
        // Plain text line
        return (
          <div key={idx} className="text-gray-700 text-xs sm:text-sm leading-relaxed">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

function PrescriptionModal({ userId, data, chemistOrder, chemistInfo, labOrder, labInfo, onOrdersUpdated, onClose }) {
  const [shareTarget, setShareTarget] = useState(null); // "chemist" | "lab" | null

  if (!data) return null;

  const doc = data.doctor_details || {};
  const pat = data.patient_details || {};
  const appt = data.appointments || {};
  const medicines = Array.isArray(data.medicines) ? data.medicines : [];
  const vitals = data.vital_signs || data.vitals || null;
  const labTestsRaw = Array.isArray(data.lab_tests) ? data.lab_tests : [];
  const investigationsRaw = Array.isArray(data.investigations) ? data.investigations : [];

  const combinedLabsAndInvestigations = [
    ...labTestsRaw.map(t => ({
      name: typeof t === "string" ? t : t.test_name || t.name || "",
      instructions: typeof t === "string" ? "" : t.instructions || "",
      urgency: typeof t === "string" ? "" : t.urgency || ""
    })),
    ...investigationsRaw.map(inv => ({
      name: typeof inv === "string" ? inv : inv?.name || "",
      instructions: typeof inv === "string" ? "" : inv?.instructions || "",
      urgency: typeof inv === "string" ? "" : inv?.urgency || ""
    }))
  ].filter(item => item.name.trim());

  const labTests = combinedLabsAndInvestigations;

  const safeStr = (v) => {
    if (!v) return "";
    if (typeof v === "string") {
      const trimmed = v.trim();
      if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
        try {
          return safeStr(JSON.parse(trimmed));
        } catch {
          return v;
        }
      }
      return v;
    }
    if (Array.isArray(v)) return v.filter(Boolean).join(", ");
    if (typeof v === "object") {
      const tryKeys = ["primary", "notes", "text", "name", "value"];
      for (const k of tryKeys) {
        if (v[k] && typeof v[k] === "string") return v[k];
      }
      const vals = Object.values(v).filter((x) => typeof x === "string" && x);
      return vals.length ? vals.join(", ") : "";
    }
    return String(v);
  };

  const diagnosis = (() => {
    const raw = data.diagnosis;
    if (!raw) return "";
    if (typeof raw === "string") return raw;
    return safeStr(raw.primary || raw.diagnosis || "");
  })();
  const diagnosisNotes = (() => {
    const raw = data.diagnosis;
    if (!raw) return safeStr(data.diagnosis_notes);
    if (typeof raw === "string") return safeStr(data.diagnosis_notes);
    return safeStr(raw.notes);
  })();
  const qualification = safeStr(doc.qualification);
  const specialization = (() => {
    const raw = safeStr(data.specialization || doc.specialization);
    if (!raw || raw === "—") return "";
    return raw.split(",")[0].trim();
  })();

  const isTele = data.appointment_type === 'video_consultation' || data.appointment_type === 'video' || appt.appointment_type === 'video_consultation' || appt.appointment_type === 'video';

  const tagline = (() => {
    if (specialization && specialization !== "—") return `${specialization} Care & Consultation`;
    if (isTele) return "Teleconsultation Care & Consultation";
    return "OPD Care & Consultation";
  })();

  const prescriptionId = `MED-${doc.un_id || "0"}-${pat.un_id || "0"}-${data.unid || data.id?.slice(0, 8) || "0"}`;
  const chemistName = chemistInfo?.pharmacy_name || chemistInfo?.owner_name || "Selected Chemist";
  const chemistSub = [chemistInfo?.address, chemistInfo?.mobile].filter(Boolean).join(" • ");
  const labName = labInfo?.lab_name || labInfo?.owner_name || "Selected Lab";
  const labSub = [labInfo?.address, labInfo?.phone_number].filter(Boolean).join(" • ");

  const fmtDate = (d) => {
    if (!d) return "N/A";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
  };

  const followUpObj = (() => {
    if (!data.follow_up) return null;
    if (typeof data.follow_up === "object") return data.follow_up;
    try {
      return JSON.parse(data.follow_up);
    } catch {
      return { notes: data.follow_up };
    }
  })();

  let warningSignsHtml = followUpObj?.warning_signs || followUpObj?.notes || "";
  if (Array.isArray(warningSignsHtml)) warningSignsHtml = warningSignsHtml.join(", ");
  warningSignsHtml = warningSignsHtml.trim();
  if (!warningSignsHtml || warningSignsHtml === "—") {
    warningSignsHtml = "Seek immediate medical attention if you experience high fever, severe breathlessness, chest pain, or sudden weakness.";
  }

  const followUpDateVal = followUpObj?.date || followUpObj?.return_after || "";
  const followUpNotesVal = followUpObj?.notes || "";
  const isDateVal = followUpDateVal && !isNaN(Date.parse(followUpDateVal));

  const calculateAge = (dob, explicitAge) => {
    if (explicitAge) return `${explicitAge} yrs`;
    if (!dob) return "—";
    const birthDate = new Date(dob);
    if (isNaN(birthDate)) return "—";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} yrs` : "—";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
      >
        {/* ── Close bar ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#0067A1] text-white shrink-0">
          <h3 className="text-sm font-semibold tracking-wide uppercase">Medical Prescription</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable letter body ── */}
        <div className="flex-1 overflow-y-auto bg-white p-5 sm:p-7 space-y-6">
          
          {/* ─── Header / Letterhead ─── */}
          <div 
            className="p-5 sm:p-7 flex flex-row items-center justify-between gap-4 text-black rounded-xl"
            style={{ background: 'linear-gradient(135deg, #66baf7 0%, #62bcfb 100%)' }}
          >
            <div className="flex items-center justify-start shrink-0">
              <div className="w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] rounded-full overflow-hidden bg-white flex items-center justify-center">
                <img
                  src="/real-logo.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="flex-1 text-center min-w-0">
              <h1 
                className="text-2xl sm:text-3xl font-extrabold text-black leading-tight"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.4)' }}
              >
                MediConnect.fit
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-black mt-1 uppercase tracking-wider">
                {tagline}
              </p>
              <p className="text-[10px] sm:text-xs text-black mt-0.5">
                📧 hello@mediconnect.fit
              </p>
            </div>
            <div className="flex items-center justify-end shrink-0">
              <div className="w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] rounded-full bg-white flex items-center justify-center overflow-hidden">
                <img
                  src="/md-pdf/dr.png"
                  alt="Doctor Icon"
                  className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] object-contain"
                />
              </div>
            </div>
          </div>

          {/* ─── Top Info Bar ─── */}
          <div className="bg-[#f0f7ff] px-5 py-3 rounded-lg flex items-center justify-between text-xs sm:text-sm font-semibold text-gray-700">
            <div>
              Prescription ID: <span className="text-[#0067A1] font-bold">{prescriptionId}</span>
            </div>
            <div className="text-right">
              Date: <span className="text-[#0067A1] font-bold">{fmtDate(data.created_at)}</span>
            </div>
          </div>

          {/* ─── Teleconsultation Notice ─── */}
          {isTele && (
            <div className="bg-[#fff8d6] p-3.5 rounded-lg border-l-4 border-amber-500 text-xs text-gray-700 italic">
              This prescription is based solely on information provided during teleconsultation without physical examination. If symptoms worsen, seek in-person evaluation or emergency care immediately.
            </div>
          )}

          {/* ─── Doctor & Patient Info Block ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-900">
            {/* Doctor Details */}
            <div>
              <h3 className="text-base font-extrabold border-b-2 border-gray-950 pb-1 uppercase tracking-wide">
                Doctor Details
              </h3>
              <div className="mt-2 divide-y divide-dotted divide-gray-300 text-xs sm:text-sm">
                <div className="py-2 flex justify-between gap-4">
                  <span className="font-semibold text-gray-500 shrink-0">Name:</span>
                  <span className="text-[#0067A1] font-bold text-right">{doc.full_name || "—"}</span>
                </div>
                <div className="py-2 flex justify-between gap-4">
                  <span className="font-semibold text-gray-500 shrink-0">Qualification:</span>
                  <span className="text-[#0067A1] font-bold text-right">{qualification}</span>
                </div>
                <div className="py-2 flex justify-between gap-4">
                  <span className="font-semibold text-gray-500 shrink-0">Specialization:</span>
                  <span className="text-[#0067A1] font-bold text-right">{specialization || "—"}</span>
                </div>
                <div className="py-2 flex justify-between gap-4">
                  <span className="font-semibold text-gray-500 shrink-0">License No:</span>
                  <span className="text-[#0067A1] font-bold text-right">{doc.license_number || "—"}</span>
                </div>
                <div className="py-2 flex justify-between gap-4">
                  <span className="font-semibold text-gray-500 shrink-0">Clinic:</span>
                  <span className="text-[#0067A1] font-bold text-right">
                    {[doc.clinic_name, doc.clinic_address].filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Patient Details */}
            <div>
              <h3 className="text-base font-extrabold border-b-2 border-gray-950 pb-1 uppercase tracking-wide">
                Patient Details
              </h3>
              <div className="mt-2 divide-y divide-dotted divide-gray-300 text-xs sm:text-sm">
                <div className="py-2 flex justify-between gap-4">
                  <span className="font-semibold text-gray-500 shrink-0">Name:</span>
                  <span className="text-[#0067A1] font-bold text-right">{pat.full_name || "—"}</span>
                </div>
                <div className="py-2 flex justify-between gap-4">
                  <span className="font-semibold text-gray-500 shrink-0">Gender:</span>
                  <span className="text-[#0067A1] font-bold text-right">{pat.gender || "—"}</span>
                </div>
                <div className="py-2 flex justify-between gap-4">
                  <span className="font-semibold text-gray-500 shrink-0">Age:</span>
                  <span className="text-[#0067A1] font-bold text-right">{calculateAge(pat.date_of_birth, pat.age)}</span>
                </div>
                <div className="py-2 flex justify-between gap-4">
                  <span className="font-semibold text-gray-500 shrink-0">Address:</span>
                  <span className="text-[#0067A1] font-bold text-right">{pat.address || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Prescription Badge Banner (Full Width Divider) */}
          <div className="bg-[#6fbdf2] text-black font-extrabold text-center py-2.5 text-sm sm:text-base rounded shadow-sm uppercase tracking-widest my-4">
            Prescription (Rx)
          </div>

          {/* ─── Clinical Columns grid ─── */}
          <div className="md:grid md:grid-cols-2 md:gap-8 space-y-6 md:space-y-0 text-gray-900">
            
            {/* ─── Left Column: Diagnosis & Findings ─── */}
            <div className="space-y-6">
              {/* Diagnosis */}
              <div>
                <h3 className="text-base font-extrabold border-b-2 border-gray-950 pb-1 uppercase tracking-wide">
                  Diagnosis
                </h3>
                <div className="mt-2 border-b border-dotted border-gray-300 py-2 text-xs sm:text-sm">
                  <div className="text-[#0067A1] font-bold">
                    {diagnosis || "—"}
                  </div>
                  {diagnosisNotes && (
                    <p className="text-xs text-gray-500 mt-1 italic">{diagnosisNotes}</p>
                  )}
                </div>
              </div>

              {/* Vital Signs */}
              <div>
                <h3 className="text-base font-extrabold border-b-2 border-gray-950 pb-1 uppercase tracking-wide">
                  Vital Signs
                </h3>
                <div className="mt-2 divide-y divide-dotted divide-gray-300 text-xs sm:text-sm">
                  {vitals && Object.entries(vitals).some(([_, val]) => val) ? (
                    Object.entries(vitals)
                      .filter(([_, val]) => val)
                      .map(([k, val]) => (
                        <div key={k} className="py-2 flex justify-between gap-4">
                          <span className="font-semibold text-gray-500 shrink-0 capitalize">{k.replaceAll("_", " ")}:</span>
                          <span className="text-[#0067A1] font-bold">{val}</span>
                        </div>
                      ))
                  ) : (
                    <div className="py-2 text-gray-500 italic">Not recorded</div>
                  )}
                </div>
              </div>

              {/* Clinical Notes */}
              {data.special_message && data.special_message.trim() && (
                <div>
                  <h3 className="text-base font-extrabold border-b-2 border-gray-950 pb-1 uppercase tracking-wide">
                    Clinical Notes / Instructions
                  </h3>
                  <div className="mt-2 text-gray-800">
                    {formatSpecialMessage(data.special_message.trim())}
                  </div>
                </div>
              )}
            </div>

            {/* ─── Right Column: Treatment & Follow-up ─── */}
            <div className="space-y-6">
              {/* Medicines */}
              <div>
                <h3 className="text-base font-extrabold border-b-2 border-gray-950 pb-1 uppercase tracking-wide">
                  Medicines
                </h3>
                <div className="mt-2 divide-y divide-dotted divide-gray-300 text-xs sm:text-sm">
                  {medicines.length > 0 ? (
                    medicines.map((m, i) => (
                      <div key={i} className="py-2.5 flex flex-col gap-0.5">
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-semibold text-gray-500 shrink-0">{i + 1}.</span>
                          <span className="text-[#0067A1] font-bold text-left flex-1">{m.name || "—"}</span>
                          <span className="text-gray-600 text-xs shrink-0 text-right">
                            {[m.dosage || m.dose, m.frequency, m.duration].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                        {(m.instructions || m.notes) && (
                          <div className="pl-5 text-xs text-gray-500 italic">
                            {m.instructions || m.notes}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-2 text-gray-500 italic">No medicines prescribed</div>
                  )}
                </div>
              </div>

              {/* Investigations / Lab Tests */}
              <div>
                <h3 className="text-base font-extrabold border-b-2 border-gray-950 pb-1 uppercase tracking-wide">
                  Investigations / Lab Tests
                </h3>
                <div className="mt-2 divide-y divide-dotted divide-gray-300 text-xs sm:text-sm">
                  {combinedLabsAndInvestigations.length > 0 ? (
                    combinedLabsAndInvestigations.map((t, i) => {
                      const testName = t.name;
                      const urgency = t.urgency ? ` (${t.urgency})` : "";
                      const instructions = t.instructions ? ` — ${t.instructions}` : "";
                      return (
                        <div key={i} className="py-2 flex flex-col gap-0.5">
                          <div className="flex justify-between gap-4">
                            <span className="font-semibold text-gray-500 shrink-0">{i + 1}.</span>
                            <span className="text-[#0067A1] font-bold text-right flex-1">{testName}{urgency}</span>
                          </div>
                          {instructions && (
                            <div className="pl-5 text-xs text-gray-500 italic">
                              {instructions}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-2 text-gray-500 italic">No investigations or lab tests advised</div>
                  )}
                </div>
              </div>

              {/* Follow Up */}
              <div>
                <h3 className="text-base font-extrabold border-b-2 border-gray-950 pb-1 uppercase tracking-wide">
                  Follow Up
                </h3>
                <div className="mt-2 divide-y divide-dotted divide-gray-300 text-xs sm:text-sm">
                  {followUpDateVal && (
                    <div className="py-2 flex justify-between gap-4">
                      <span className="font-semibold text-gray-500 shrink-0">
                        {isDateVal ? "Follow-up Date:" : "Return After:"}
                      </span>
                      <span className="text-[#0067A1] font-bold">
                        {isDateVal ? fmtDate(followUpDateVal) : followUpDateVal}
                      </span>
                    </div>
                  )}
                  {followUpNotesVal && (
                    <div className="py-2 flex justify-between gap-4">
                      <span className="font-semibold text-gray-500 shrink-0">Notes:</span>
                      <span className="text-[#0067A1] font-bold text-right">{followUpNotesVal}</span>
                    </div>
                  )}
                  {(!followUpDateVal && !followUpNotesVal) && (
                    <div className="py-2 flex justify-between gap-4">
                      <span className="font-semibold text-gray-500 shrink-0">Return After:</span>
                      <span className="text-[#0067A1] font-bold">—</span>
                    </div>
                  )}
                  <div className="py-2 flex flex-col gap-1">
                    <span className="font-semibold text-red-600">Warning Signs:</span>
                    <span className="text-gray-700 text-xs">
                      {warningSignsHtml}
                    </span>
                  </div>
                </div>
              </div>

              {/* Digital Signature */}
              <div>
                <h3 className="text-base font-extrabold border-b-2 border-gray-950 pb-1 uppercase tracking-wide">
                  Digital Signature
                </h3>
                <div className="mt-2 flex flex-col items-end text-xs sm:text-sm">
                  {doc.signature_url && (
                    <img
                      src={(() => {
                        const raw = doc.signature_url;
                        if (!raw) return null;
                        if (typeof raw === 'string' && raw.startsWith('[')) {
                          try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr[0] : raw; } catch { return raw; }
                        }
                        if (Array.isArray(raw)) return raw[0];
                        return raw;
                      })()}
                      alt="Doctor Signature"
                      className="h-10 border-b border-gray-300 pb-1 mb-1 object-contain"
                    />
                  )}
                  <div className="py-1.5 flex justify-between w-full gap-4 border-b border-dotted border-gray-300">
                    <span className="font-semibold text-gray-500">Signed by:</span>
                    <span className="text-[#0067A1] font-bold">{doc.full_name || "—"}</span>
                  </div>
                  <div className="py-1.5 flex justify-between w-full gap-4 border-b border-dotted border-gray-300">
                    <span className="font-semibold text-gray-500">Signed at:</span>
                    <span className="text-[#0067A1] font-bold text-right">
                      {data.signed_at ? fmtDate(data.signed_at) : (data.created_at ? fmtDate(data.created_at) : "—")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Footer Line ─── */}
          <div className="px-5 sm:px-7 border-t border-gray-200 py-4 flex items-center justify-between text-[10px] text-gray-500 bg-gray-50">
            <div>
              <p className="font-semibold">MediConnect Healthcare Services</p>
              <p>&copy; {new Date().getFullYear()} | Confidential Medical Document</p>
            </div>
            <div className="text-right">
              <p>Confidential prescription for patient {pat.full_name || "—"}</p>
            </div>
          </div>

          {/* ─── Order Status / Actions ─── */}
          <div className="px-5 sm:px-7 pb-8 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#0067A1]/15 bg-gradient-to-br from-[#0067A1]/5 to-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#0067A1] text-white flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Chemist Order</p>
                    <p className="text-sm font-semibold text-gray-900">{chemistOrder ? chemistName : "Not ordered"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShareTarget("chemist")}
                  className="text-xs font-semibold text-[#0067A1] hover:underline"
                >
                  {chemistOrder ? "Change" : "Order"}
                </button>
              </div>
              {chemistOrder && (
                <div className="mt-2 text-xs text-gray-500">
                  <div className="truncate text-gray-600">{chemistSub || "Pharmacy selected"}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-medium">
                      {chemistOrder.status || "sent"}
                    </span>
                    {chemistOrder.unid && <span>Order #{chemistOrder.unid}</span>}
                  </div>
                </div>
              )}
            </div>

            {labTests.length > 0 && (
              <div className="rounded-2xl border border-[#0067A1]/15 bg-gradient-to-br from-[#0067A1]/5 to-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-[#0067A1] text-white flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Lab Order</p>
                      <p className="text-sm font-semibold text-gray-900">{labOrder ? labName : "Not ordered"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShareTarget("lab")}
                    className="text-xs font-semibold text-[#0067A1] hover:underline"
                  >
                    {labOrder ? "Change" : "Order"}
                  </button>
                </div>
                {labOrder && (
                  <div className="mt-2 text-xs text-gray-500">
                    <div className="truncate text-gray-600">{labSub || "Lab selected"}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#0067A1]/10 text-[#0067A1] font-medium">
                        {labOrder.status || "sent"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Share Modal overlay ── */}
        <AnimatePresence>
          {shareTarget && (
            <SharePrescriptionModal
              userId={userId}
              type={shareTarget}
              prescriptionId={data.id}
              prescriptionDisplayId={prescriptionId}
              medicines={medicines}
              labTests={labTests}
              existingOrder={shareTarget === "chemist" ? chemistOrder : labOrder}
              onOrdersUpdated={async (pid) => {
                if (typeof onOrdersUpdated === "function") await onOrdersUpdated(pid);
                setShareTarget(null);
              }}
              onClose={() => setShareTarget(null)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ─── Prescription sub-components ─── */
function SectionHeading({ title }) {
  return (
    <h4 className="text-xs font-bold text-[#0067A1] uppercase tracking-wider border-b border-[#0067A1]/30 pb-1">
      {title}
    </h4>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <span className="font-semibold text-gray-500">{label}:</span>{" "}
      <span className="text-gray-800">{value || "—"}</span>
    </div>
  );
}

function VitalChip({ label, value }) {
  return (
    <div className="bg-[#0067A1]/5 rounded-lg px-2 py-1.5 text-center">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className="text-xs font-semibold text-[#0067A1]">{value}</p>
    </div>
  );
}

/* ─── Doctor Write-Prescription Modal ────────────────── */
const EMPTY_MEDICINE = { name: "", dosage: "", frequency: "", duration: "", quantity: "", instructions: "" };
const EMPTY_VITALS = { blood_pressure: "", pulse: "", temperature: "", weight: "", spo2: "", respiratory_rate: "" };

const DEFAULT_STRUCTURE = [
  {
    section: "SYMPTOMS",
    fields: [{ name: "symptoms", type: "textarea", label: "SYMPTOMS", required: false }]
  },
  {
    section: "CONDITIONS",
    fields: [{ name: "conditions", type: "textarea", label: "CONDITIONS", required: false }]
  },
  {
    section: "PROVISIONAL DIAGNOSIS",
    fields: [{ name: "diagnosis", type: "textarea", label: "PROVISIONAL DIAGNOSIS", required: false }]
  },
  {
    section: "VITALS",
    fields: [
      { name: "bp", type: "text", label: "BP:", required: false },
      { name: "pulse", type: "text", label: "Pulse:", required: false },
      { name: "respiratory_rate", type: "text", label: "Respiratory Rate:", required: false },
      { name: "temperature", type: "text", label: "Temperature:", required: false },
      { name: "spo", type: "text", label: "SpO₂:", required: false }
    ]
  },
  {
    section: "EXAMINATION",
    fields: [{ name: "findings", type: "textarea", label: "Examination Findings:", required: false }]
  },
  {
    section: "TREATMENT (Rx)",
    fields: []
  },
  {
    section: "INVESTIGATIONS",
    fields: []
  },
  {
    section: "FOLLOW-UP",
    fields: [
      { name: "return_after", type: "text", label: "Return after:", required: false },
      { name: "warning_signs", type: "textarea", label: "Warning Signs:", required: false }
    ]
  }
];

const COMPLAINT_SUGGESTIONS = [
  "Fever / Chills",
  "Cough / Cold",
  "Sore Throat",
  "Headache",
  "Bodyache / Muscle Pain",
  "Nausea / Vomiting",
  "Diarrhea / Loose Motions",
  "Weakness / Fatigue",
  "Shortness of Breath",
  "Chest Pain",
  "Abdominal Pain",
  "Dizziness / Vertigo",
  "Rash / Skin Irritation",
  "Joint Pain"
];

function WritePrescriptionModal({ appointmentId, meta, templates = [], onClose, isSidebarPanel }) {
  const [templateStep, setTemplateStep] = useState(templates.length > 0 ? "select" : "write");
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [presentingComplaints, setPresentingComplaints] = useState([{ complaint: "", details: "" }]);
  const [medicines, setMedicines] = useState([{ ...EMPTY_MEDICINE }]);
  const [labTests, setLabTests] = useState([{ test_name: "", instructions: "" }]);
  const [vitalSigns, setVitalSigns] = useState({ ...EMPTY_VITALS });
  const [examinationFindings, setExaminationFindings] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("Seek immediate medical attention if you experience high fever, severe breathlessness, chest pain, or sudden weakness.");
  const [specialMessage, setSpecialMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [existingPrescriptionId, setExistingPrescriptionId] = useState(null);
  const [selectedTemplateSpec, setSelectedTemplateSpec] = useState("");
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Dynamic template states
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customFields, setCustomFields] = useState({});
  const [drugMaster, setDrugMaster] = useState([]);
  const [labMaster, setLabMaster] = useState([]);
  const [diagnosisMaster, setDiagnosisMaster] = useState([]);
  
  // Clinical API states for new fields
  const [symptoms, setSymptoms] = useState("");
  const [conditions, setConditions] = useState("");
  const [symptomMaster, setSymptomMaster] = useState([]);
  const [conditionMaster, setConditionMaster] = useState([]);
  const [complaintSuggestions, setComplaintSuggestions] = useState([]);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        // Fetch medicines as usual
        const drugsPromise = fetch("/api/admin/medicines")
          .then(r => r.json())
          .then(json => json.success ? json.data.filter(d => d.is_active) : [])
          .catch(err => {
            console.error("Failed to fetch medicines", err);
            return [];
          });

        // Helper to fetch all pages of a paginated resource
        const fetchAllPages = async (endpoint) => {
          try {
            const res1 = await fetch(`${endpoint}?page=1&limit=1000`);
            const json1 = await res1.json();
            if (!json1.success || !Array.isArray(json1.data)) return [];
            let allData = [...json1.data];
            const total = json1.pagination?.total || 0;
            const totalPages = Math.ceil(total / 1000);

            if (totalPages > 1) {
              const fetchPromises = [];
              for (let p = 2; p <= totalPages; p++) {
                fetchPromises.push(
                  fetch(`${endpoint}?page=${p}&limit=1000`)
                    .then(r => r.json())
                    .then(j => j.success && Array.isArray(j.data) ? j.data : [])
                    .catch(err => {
                      console.error(`Failed fetching page ${p} for ${endpoint}`, err);
                      return [];
                    })
                );
              }
              const results = await Promise.all(fetchPromises);
              for (const pageData of results) {
                allData = allData.concat(pageData);
              }
            }
            return allData;
          } catch (err) {
            console.error(`Error in fetchAllPages for ${endpoint}:`, err);
            return [];
          }
        };

        const complaintsPromise = fetch("/api/admin/clinical-repository?table=cr_complaint_master&limit=1000")
          .then(r => r.json())
          .then(j => {
             if (j.success && j.data) {
                return [...new Set(j.data.map(d => d.canonical_complaint).filter(Boolean))].sort();
             }
             return [];
          })
          .catch(err => {
             console.error("Failed to fetch complaints", err);
             return [];
          });

        const [drugsData, labsData, diagData, complaintsData] = await Promise.all([
          drugsPromise,
          fetchAllPages("/api/admin/lab-tests"),
          fetchAllPages("/api/admin/diagnosis"),
          complaintsPromise
        ]);

        setDrugMaster(drugsData);
        setLabMaster(labsData.filter(l => l.is_active));
        setDiagnosisMaster(diagData.filter(d => d.is_active));
        setComplaintSuggestions(complaintsData);
      } catch (error) {
        console.error("Failed to fetch masters", error);
      }
    };
    fetchMasters();
  }, []);

  const specList = (meta?.doctor_specialization || "").split(",").map(s => s.trim()).filter(Boolean);

  /* ── Get active template structure ── */
  const getActiveStructure = () => {
    let structure = DEFAULT_STRUCTURE;
    if (selectedTemplate && selectedTemplate.template_structure) {
      try {
        const parsed = typeof selectedTemplate.template_structure === "string"
          ? JSON.parse(selectedTemplate.template_structure)
          : selectedTemplate.template_structure;
        if (Array.isArray(parsed) && parsed.length > 0) {
          structure = parsed;
        }
      } catch (e) {
        console.error("Failed to parse template structure:", e);
      }
    }

    return structure;
  };

  /* ── Case-insensitive lookup for field default value ── */
  const getFieldDefaultValue = (defaults, sectionName, fieldName) => {
    if (!defaults) return "";
    // 1. Try exact section and field key
    if (defaults[sectionName] && typeof defaults[sectionName] === "object") {
      if (defaults[sectionName][fieldName] !== undefined) {
        return defaults[sectionName][fieldName];
      }
      const key = Object.keys(defaults[sectionName]).find(k => k.toLowerCase() === fieldName.toLowerCase());
      if (key !== undefined) {
        return defaults[sectionName][key];
      }
    }
    // 2. Try case-insensitive section name
    const secKey = Object.keys(defaults).find(k => k.toLowerCase() === sectionName.toLowerCase());
    if (secKey && typeof defaults[secKey] === "object") {
      if (defaults[secKey][fieldName] !== undefined) {
        return defaults[secKey][fieldName];
      }
      const key = Object.keys(defaults[secKey]).find(k => k.toLowerCase() === fieldName.toLowerCase());
      if (key !== undefined) {
        return defaults[secKey][key];
      }
    }
    // 3. Try fieldName directly at root level
    if (defaults[fieldName] !== undefined) {
      return defaults[fieldName];
    }
    const rootKey = Object.keys(defaults).find(k => k.toLowerCase() === fieldName.toLowerCase());
    if (rootKey !== undefined) {
      return defaults[rootKey];
    }
    return "";
  };

  const normalizeSectionName = (name) => {
    return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  /* ── Case-insensitive key finder for template defaults ── */
  const findTemplateKey = (obj, ...patterns) => {
    for (const pattern of patterns) {
      const lp = pattern.toLowerCase();
      const found = Object.keys(obj).find(k => k.toLowerCase() === lp);
      if (found !== undefined) return obj[found];
    }
    for (const pattern of patterns) {
      const lp = pattern.toLowerCase();
      const found = Object.keys(obj).find(k => k.toLowerCase().includes(lp));
      if (found !== undefined) return obj[found];
    }
    return null;
  };

  /* ── When a template is selected: fill clinical fields from template.default_values ── */
  const applyTemplate = (template) => {
    if (!template) {
      setSelectedTemplate(null);
      setCustomFields({});
      setDiagnosis("");
      setDiagnosisNotes("");
      setMedicines([{ ...EMPTY_MEDICINE }]);
      setLabTests([""]);
      setVitalSigns({ ...EMPTY_VITALS });
      setExaminationFindings("");
      setFollowUpDate("");
      setFollowUpNotes("");
      setSpecialMessage("");
      setSelectedTemplateSpec(specList[0] || "");
      setTemplateStep("write");
      return;
    }

    setSelectedTemplate(template);
    const defaults = template.default_values || {};
    const isSystemTemplate = !template.created_by || template.is_default || (template.name && (template.name.includes("TEMPLATE") || template.name.includes("default")));

    // Populate custom fields values from defaults
    const newCustomFields = {};
    const structure = template.template_structure
      ? (typeof template.template_structure === "string" ? JSON.parse(template.template_structure) : template.template_structure)
      : DEFAULT_STRUCTURE;

    if (Array.isArray(structure)) {
      structure.forEach(sec => {
        if (sec && Array.isArray(sec.fields)) {
          sec.fields.forEach(f => {
            const val = getFieldDefaultValue(defaults, sec.section, f.name);
            newCustomFields[`${sec.section}__${f.name}`] = val || "";
          });
        }
      });
    }
    setCustomFields(newCustomFields);

    // ── 1. Diagnosis ──────────────────────────────────────────────────────────
    // Do not pre-fill provisional diagnosis from default/system templates as they are case-specific
    let diag = "";
    if (!isSystemTemplate) {
      const provDiag = findTemplateKey(defaults, "provisional diagnosis");
      diag =
        defaults.diagnosis ||
        provDiag?.diagnosis ||
        provDiag?.info ||
        "";
    }
    setDiagnosis(typeof diag === "string" ? diag : "");
    setDiagnosisNotes("");

    // ── 2. Medicines (TREATMENT (RX) — numbered keys "1","2","3"…) ───────────
    const rxSection = findTemplateKey(defaults, "treatment (rx)", "treatment(rx)", "treatment (rx)");
    const medArr = [];
    if (rxSection && typeof rxSection === "object") {
      ["1","2","3","4","5","6","7","8","9","10"].forEach(n => {
        const val = rxSection[n];
        if (val && typeof val === "string" && val.trim()) {
          const dosageMatch = val.match(/\b(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|IU|units?))\b/i);
          const freqMatch   = val.match(/\b(OD|BD|TDS|QID|SOS|PRN|HS|AC|PC|1-0-1|1-1-1|0-0-1|1-0-0|2-0-2|1-1-0)\b/gi);
          const durMatch    = val.match(/\bfor\s+(\d+\s+(?:days?|weeks?|months?))\b/i);
          let nameClean = val;
          if (dosageMatch) nameClean = nameClean.replace(dosageMatch[0], "");
          if (freqMatch) {
            freqMatch.forEach(f => {
              nameClean = nameClean.replace(new RegExp(`\\b${f}\\b`, "gi"), "");
            });
          }
          if (durMatch) nameClean = nameClean.replace(durMatch[0], "");
          nameClean = nameClean.replace(/\s+/g, " ").trim();
          nameClean = nameClean.replace(/^[-,\s]+|[-,\s]+$/g, "").trim();
          if (!nameClean) nameClean = val;

          medArr.push({
            ...EMPTY_MEDICINE,
            name: nameClean,
            dosage:      dosageMatch ? dosageMatch[0] : "",
            frequency:   freqMatch   ? freqMatch[0]  : "",
            duration:    durMatch    ? durMatch[1]   : "",
            instructions: "",
          });
        }
      });
    }
    setMedicines(medArr.length > 0 ? medArr : [{ ...EMPTY_MEDICINE }]);

    // ── 3. Lab Tests (INVESTIGATIONS — combine info + others + any string values) ──
    const invSection = findTemplateKey(defaults, "investigations");
    const labs = [];
    if (invSection && typeof invSection === "object") {
      Object.values(invSection).forEach(v => {
        if (typeof v === "string" && v.trim()) {
          v.split(/[,/]+/).forEach(part => {
            const t = part.trim();
            if (t) labs.push(t);
          });
        }
      });
    }
    setLabTests(labs.length > 0 ? labs : [""]);

    // ── 4. Vital Signs (vital_signs key, then VITALS, VITALS (REPORTED), etc.) ──
    // Always clear vital signs from template to ensure patient-specific values are entered fresh
    setVitalSigns({ ...EMPTY_VITALS });

    // ── 5. Examination Findings (find ALL keys with "examination" in name) ───
    // Do not pre-fill physical examination findings from system templates as they are case-specific
    let examFindings = "";
    if (!isSystemTemplate) {
      const examParts = [];
      Object.keys(defaults)
        .filter(k => k.toLowerCase().includes("examination") || k.toLowerCase().includes("tele-examination"))
        .forEach(key => {
          const section = defaults[key];
          if (section && typeof section === "object") {
            Object.entries(section).forEach(([field, val]) => {
              if (typeof val === "string" && val.trim()) {
                if (field === "info") {
                  examParts.push(val.trim());
                } else {
                  examParts.push(`${field.replace(/_/g, " ")}: ${val.trim()}`);
                }
              }
            });
          }
        });
      // Also grab POSITIVE FINDINGS
      const posFindings = findTemplateKey(defaults, "positive findings", "positive findings:");
      if (posFindings?.findings && typeof posFindings.findings === "string") {
        examParts.push(`Positive Findings: ${posFindings.findings}`);
      }
      examFindings = examParts.join("\n");
    }
    setExaminationFindings(examFindings);

    // ── 6. Follow-Up ─────────────────────────────────────────────────────────
    const fUp =
      findTemplateKey(defaults, "follow-up", "follow up", "follow-up:") ||
      defaults.follow_up ||
      {};
    setFollowUpDate(fUp.return_after || fUp.review_after || fUp.review_after_days || "");
    setFollowUpNotes(fUp.info || fUp.warning_signs || fUp.to_report_immediately || "Seek immediate medical attention if you experience high fever, severe breathlessness, chest pain, or sudden weakness.");

    // ── 7. Presenting Complaints ───────────────────────────
    if (defaults._dynamic_complaints && Array.isArray(defaults._dynamic_complaints) && defaults._dynamic_complaints.length > 0) {
      setPresentingComplaints(defaults._dynamic_complaints);
    } else {
      setPresentingComplaints([{ complaint: "", details: "" }]);
    }

    // Legacy fallback for old templates without _dynamic_complaints
    let complaintsStr = "";
    if (!isSystemTemplate && (!defaults._dynamic_complaints || defaults._dynamic_complaints.length === 0)) {
      const complaints = findTemplateKey(defaults, "presenting complaints", "persenting complaints");
      if (complaints && typeof complaints === "object") {
        complaintsStr = Object.entries(complaints)
          .filter(([, v]) => typeof v === "string" && v.trim())
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v.trim()}`)
          .join("\n");
      }
    }
    setSpecialMessage(complaintsStr);

    setSelectedTemplateSpec(template?.specialization || specList[0] || "");
    setTemplateStep("write");
  };

  /* ── complaint helpers ── */
  const addComplaint = () => setPresentingComplaints((prev) => [...prev, { complaint: "", details: "" }]);
  const removeComplaint = (idx) => setPresentingComplaints((prev) => prev.filter((_, i) => i !== idx));
  const updateComplaint = (idx, field, value) => {
    setPresentingComplaints((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  /* ── medicine helpers ── */
  const addMedicine = () => setMedicines((prev) => [...prev, { ...EMPTY_MEDICINE }]);
  const removeMedicine = (idx) => setMedicines((prev) => prev.filter((_, i) => i !== idx));
  const updateMedicine = (idx, field, value) => {
    setMedicines((prev) => {
      const next = prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m));
      // Auto-calculate quantity if frequency or duration changed
      if (field === "frequency" || field === "duration") {
         const m = next[idx];
         let days = 1;
         
         // parse duration e.g., "5 days", "1 week"
         const durMatch = (m.duration || "").match(/(\d+)\s*(day|week|month)s?/i);
         if (durMatch) {
            let num = parseInt(durMatch[1]);
            let unit = durMatch[2].toLowerCase();
            if (unit === 'week') days = num * 7;
            else if (unit === 'month') days = num * 30;
            else days = num;
         } else if (!isNaN(parseInt(m.duration))) {
            days = parseInt(m.duration);
         }
         
         // parse frequency e.g., "1-0-1", "OD", "BD", "TDS", "QID"
         let times = 0;
         const freq = (m.frequency || "").trim().toUpperCase();
         if (freq === "OD") times = 1;
         else if (freq === "BD" || freq === "BID") times = 2;
         else if (freq === "TDS" || freq === "TID") times = 3;
         else if (freq === "QID") times = 4;
         else if (/^\d+(-\d+)+$/.test(freq)) {
            times = freq.split('-').reduce((acc, val) => acc + (parseInt(val) || 0), 0);
         } else if (!isNaN(parseInt(freq))) {
            times = parseInt(freq);
         }
         
         if (times > 0 && days > 0) {
            next[idx].quantity = (times * days).toString();
         }
      }
      return next;
    });
  };

  /* ── lab test helpers ── */
  const addLabTest = () => setLabTests((prev) => [...prev, { test_name: "", instructions: "" }]);
  const removeLabTest = (idx) => setLabTests((prev) => prev.filter((_, i) => i !== idx));
  const updateLabTest = (idx, field, value) => setLabTests((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));

  /* ── vital sign helper ── */
  const updateVital = (key, value) => setVitalSigns((prev) => ({ ...prev, [key]: value }));

  const hydrateFromPrescription = (prescription) => {
    if (!prescription) return;

    if (prescription.id) {
      setExistingPrescriptionId(prescription.id);
    }

    if (prescription.specialization) {
      setSelectedTemplateSpec(prescription.specialization.split(",")[0].trim());
    } else {
      setSelectedTemplateSpec(specList[0] || "");
    }

    const diag = prescription.diagnosis || {};
    if (typeof diag === "string") {
      setDiagnosis(diag);
      setDiagnosisNotes("");
    } else {
      setDiagnosis(diag.primary || diag.diagnosis || "");
      setDiagnosisNotes(diag.notes || "");
    }

    if (Array.isArray(prescription.medicines) && prescription.medicines.length > 0) {
      setMedicines(prescription.medicines);
    }

    if (Array.isArray(prescription.lab_tests) && prescription.lab_tests.length > 0) {
      setLabTests(prescription.lab_tests);
    }

    if (prescription.vital_signs && typeof prescription.vital_signs === "object") {
      setVitalSigns({ ...EMPTY_VITALS, ...prescription.vital_signs });
    }

    if (prescription.follow_up) {
      if (typeof prescription.follow_up === "string") {
        setFollowUpNotes(prescription.follow_up);
      } else {
        setFollowUpDate(prescription.follow_up.date || prescription.follow_up.return_after || "");
        setFollowUpNotes(prescription.follow_up.notes || prescription.follow_up.warning_signs || "");
      }
    }

    if (prescription.template_data && typeof prescription.template_data === "object") {
      setCustomFields(prescription.template_data);
      if (prescription.template_data._dynamic_complaints && Array.isArray(prescription.template_data._dynamic_complaints)) {
        if (prescription.template_data._dynamic_complaints.length > 0) {
          setPresentingComplaints(prescription.template_data._dynamic_complaints);
        }
      }
      if (prescription.template_data.SYMPTOMS__symptoms !== undefined) {
        setSymptoms(prescription.template_data.SYMPTOMS__symptoms);
      }
      if (prescription.template_data.CONDITIONS__conditions !== undefined) {
        setConditions(prescription.template_data.CONDITIONS__conditions);
      }
      if (prescription.template_data.raw_special_message !== undefined) {
        setSpecialMessage(prescription.template_data.raw_special_message);
      } else {
        setSpecialMessage(typeof prescription.special_message === "string" ? prescription.special_message : "");
      }
      if (prescription.template_data.raw_examination_findings !== undefined) {
        setExaminationFindings(prescription.template_data.raw_examination_findings);
      } else {
        setExaminationFindings(typeof prescription.examination_findings === "string" ? prescription.examination_findings : (prescription.examination_findings?.notes || ""));
      }
    } else {
      setCustomFields({});
      setSpecialMessage(typeof prescription.special_message === "string" ? prescription.special_message : "");
      setExaminationFindings(typeof prescription.examination_findings === "string" ? prescription.examination_findings : (prescription.examination_findings?.notes || ""));
    }
  };

  // Sync selectedTemplate based on prescription template_data or specialization
  useEffect(() => {
    if (templates.length > 0) {
      if (customFields.template_id) {
        const matched = templates.find(t => t.id === customFields.template_id);
        if (matched) {
          setSelectedTemplate(matched);
          return;
        }
      }
      
      // Fallback: match by specialization and appointment_type if we have no template_id
      if (selectedTemplateSpec) {
        const matched = templates.find(t =>
          t.specialization?.toLowerCase() === selectedTemplateSpec.toLowerCase()
        );
        if (matched && !selectedTemplate) {
          setSelectedTemplate(matched);
        }
      }
    }
  }, [templates, customFields.template_id, selectedTemplateSpec]);

  // Load existing draft (or last prescription) for this appointment
  useEffect(() => {
    if (hasLoadedDraft) return;

    const loadDraft = async () => {
      const resolvedMeta = await resolveMeta();
      if (!resolvedMeta?.doctor_id) {
        setHasLoadedDraft(true);
        return;
      }

      try {
        const res = await fetch("/api/prescriptions/by-appointment-doctor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointment_id: appointmentId,
            doctor_id: resolvedMeta.doctor_id,
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.success && data?.data?.prescription) {
          hydrateFromPrescription(data.data.prescription);
          setIsEditingExisting(true);
          setTemplateStep("write");
        }
      } catch (err) {
        console.warn("Failed to load prescription draft:", err);
      } finally {
        setHasLoadedDraft(true);
      }
    };

    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, hasLoadedDraft]);

  /* ── submit ── */
  const resolveMeta = async () => {
    if (meta?.patient_id && meta?.doctor_id) return meta;
    try {
      const res = await fetch(`/api/appointment/web/${appointmentId}`);
      const data = await res.json().catch(() => null);
      const appointment = data?.data?.appointment || null;
      if (!appointment) return null;
      return {
        patient_id: appointment.patient?.id,
        doctor_id: appointment.doctor?.id,
        patient_name: appointment.patient?.full_name || "Patient",
      };
    } catch {
      return null;
    }
  };

  const handleSubmit = async (action = "sign") => {
    const resolvedMeta = await resolveMeta();
    if (!resolvedMeta?.patient_id || !resolvedMeta?.doctor_id) {
      toast.error("Appointment details not loaded. Try again.");
      return;
    }

    const filledMedicines = medicines.filter((m) => m.name.trim());
    if (filledMedicines.length === 0) {
      toast.error("Add at least one medicine.");
      return;
    }
    if (!diagnosis.trim() && action === "sign") {
      toast.error("Diagnosis is required to sign.");
      return;
    }

    setSaving(true);
    const tid = toast.loading(action === "sign" ? "Signing prescription…" : "Saving draft…");

    // Build cleaned vital_signs — only include filled fields
    const cleanedVitals = {};
    Object.entries(vitalSigns).forEach(([k, v]) => {
      if (v.trim()) cleanedVitals[k] = v.trim();
    });

    // Compile dynamic custom fields
    let compiledExam = "";
    let compiledSpecial = "";
    
    const activeStructure = getActiveStructure();
    activeStructure.forEach(sec => {
      const normSec = normalizeSectionName(sec.section);
      if (
        normSec.includes("diagnosis") ||
        normSec.includes("vitals") ||
        normSec === "vital" ||
        normSec.includes("treatment") ||
        normSec === "rx" ||
        normSec === "medicines" ||
        normSec.includes("investigation") ||
        normSec.includes("lab") ||
        normSec.includes("followup") ||
        normSec.includes("symptoms") ||
        normSec.includes("conditions") ||
        normSec.includes("presenting complaints") ||
        normSec.includes("complaints")
      ) {
        return;
      }
      
      const parts = [];
      (sec.fields || []).forEach(f => {
        const val = customFields[`${sec.section}__${f.name}`];
        if (val && typeof val === "string" && val.trim()) {
          parts.push(`${f.label || f.name} ${val.trim()}`);
        }
      });
      
      if (parts.length > 0) {
        const sectionText = `[${sec.section}]\n` + parts.join("\n");
        if (normSec.includes("examination") || normSec.includes("findings")) {
          compiledExam += (compiledExam ? "\n\n" : "") + sectionText;
        } else {
          compiledSpecial += (compiledSpecial ? "\n\n" : "") + sectionText;
        }
      }
    });

    const finalExamFindings = compiledExam || examinationFindings.trim();
    const finalSpecialMessage = (compiledSpecial ? compiledSpecial + "\n\n" : "") + specialMessage.trim();

    try {
      const hasExisting = !!existingPrescriptionId;
      const endpoint = hasExisting
        ? "/api/prescriptions/update"
        : "/api/prescriptions/create";

      const payload = {
        doctor_id: resolvedMeta.doctor_id,
        patient_id: resolvedMeta.patient_id,
        appointment_id: appointmentId,
        appointment_type: "video_call",
        specialization: selectedTemplateSpec || specList[0] || "general_medicine",
        diagnosis: { primary: diagnosis.trim(), notes: diagnosisNotes.trim() },
        medicines: filledMedicines,
        lab_tests: labTests.filter((t) => typeof t === "string" ? t.trim() : (t.test_name || "").trim()),
        vital_signs: Object.keys(cleanedVitals).length > 0 ? cleanedVitals : {},
        examination_findings: finalExamFindings ? { notes: finalExamFindings } : {},
        follow_up: followUpDate || followUpNotes.trim()
          ? { 
              date: followUpDate, 
              return_after: followUpDate,
              notes: followUpNotes.trim(), 
              warning_signs: followUpNotes.trim() 
            }
          : {},
        special_message: finalSpecialMessage,
        template_data: {
          ...customFields,
          _dynamic_complaints: presentingComplaints.filter(c => c.complaint.trim()),
          SYMPTOMS__symptoms: symptoms.trim(),
          CONDITIONS__conditions: conditions.trim(),
          template_id: selectedTemplate?.id,
          raw_special_message: specialMessage.trim(),
          raw_examination_findings: examinationFindings.trim()
        },
        action,
      };

      if (hasExisting) {
        payload.prescription_id = existingPrescriptionId;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      toast.dismiss(tid);

      if (!res.ok || !data?.success) {
        toast.error(data?.message || "Failed to save prescription.");
        return;
      }

      toast.success(
        action === "sign"
          ? "Prescription signed & appointment completed!"
          : "Prescription draft saved."
      );
      onClose();
    } catch (err) {
      toast.dismiss(tid);
      console.error("Prescription save error:", err);
      toast.error("Failed to save prescription.");
    } finally {
      setSaving(false);
    }
  };

  /* ── styles ── */
  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0067A1] focus:ring-1 focus:ring-[#0067A1] outline-none transition";
  const sectionTitle =
    "flex items-center gap-2 text-xs font-bold text-[#0067A1] uppercase tracking-wider mb-3";

  const wrapper = (children) => {
    if (isSidebarPanel) {
      return (
        <div className="relative w-full h-full bg-white overflow-hidden flex flex-col border-l border-gray-800">
          {children}
        </div>
      );
    }
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-end p-0 sm:p-4"
      >
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full h-full sm:h-auto sm:max-h-[96vh] sm:max-w-4xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col"
        >
          {children}
        </motion.div>
      </motion.div>
    );
  };

  return wrapper(
    <>
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0067A1] shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                {isEditingExisting ? "Edit Prescription" : "Write Prescription"}
              </h3>
              {isEditingExisting && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400/20 text-yellow-200 border border-yellow-400/30">
                  Existing
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              {meta?.patient_name && (
                <p className="text-xs text-white/70">
                  <span className="text-white/50">Patient:</span> {meta.patient_name}
                  {meta.patient_gender ? `, ${meta.patient_gender}` : ""}
                </p>
              )}
              {meta?.doctor_name && (
                <p className="text-xs text-white/70">
                  <span className="text-white/50">Dr:</span> {meta.doctor_name}
                  {meta.doctor_qualification ? ` (${meta.doctor_qualification})` : ""}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0 ml-3">
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ───── STEP 1: Template Selector ───── */}
          {templateStep === "select" && (
            <div className="p-6">

              {/* Doctor & Patient Info Cards */}
              {(meta?.doctor_name || meta?.patient_name) && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {meta?.doctor_name && (
                    <div className="p-3 rounded-xl bg-[#0067A1]/5 border border-[#0067A1]/10">
                      <p className="text-[10px] font-bold text-[#0067A1] uppercase tracking-wider mb-1">Doctor</p>
                      <p className="text-xs font-semibold text-gray-800">{meta.doctor_name}</p>
                      {meta.doctor_qualification && <p className="text-[11px] text-gray-500">{meta.doctor_qualification}</p>}
                      {meta.doctor_specialization && <p className="text-[11px] text-[#0067A1]">{meta.doctor_specialization}</p>}
                      {meta.doctor_license && <p className="text-[10px] text-gray-400">Reg: {meta.doctor_license}</p>}
                      {meta.doctor_clinic && <p className="text-[10px] text-gray-400">{meta.doctor_clinic}</p>}
                    </div>
                  )}
                  {meta?.patient_name && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-[10px] font-bold text-[#0067A1] uppercase tracking-wider mb-1">Patient</p>
                      <p className="text-xs font-semibold text-gray-800">{meta.patient_name}</p>
                      {meta.patient_gender && <p className="text-[11px] text-gray-500 capitalize">{meta.patient_gender}</p>}
                      {meta.patient_dob && <p className="text-[10px] text-gray-400">DOB: {new Date(meta.patient_dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                      {meta.patient_blood_group && <p className="text-[10px] text-gray-400">Blood: {meta.patient_blood_group}</p>}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-5">
                <h4 className="text-sm font-bold text-gray-800">Choose a Prescription Template</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Select a template to pre-fill your prescription, or start with a blank form.
                </p>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {templates.map((tpl, idx) => (
                  <button
                    key={tpl.id || idx}
                    onClick={() => applyTemplate(tpl)}
                    className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#0067A1] hover:bg-[#0067A1]/5 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#0067A1]/10 flex items-center justify-center shrink-0 group-hover:bg-[#0067A1]/20 transition-colors">
                      <span className="text-[#0067A1] font-bold text-xs">Rx</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{tpl.name || `Template ${idx + 1}`}</p>
                      {tpl.specialization && (
                        <p className="text-[11px] text-[#0067A1] font-medium capitalize mt-0.5">{tpl.specialization.replace(/_/g, " ")}</p>
                      )}
                      {tpl.appointment_type && (
                        <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{tpl.appointment_type.replace(/_/g, " ")}</p>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-[#0067A1] shrink-0 mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>


              <button
                onClick={() => applyTemplate(null)}
                className="w-full mt-4 py-3 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all font-medium"
              >
                + Start with Blank Form
              </button>
            </div>
          )}

          {/* ───── STEP 2: Prescription Form ───── */}
          {templateStep === "write" && (
          <div className="p-6 space-y-6">

          {/* ── Doctor & Patient Info Summary ── */}
          {(meta?.doctor_name || meta?.patient_name) && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              {meta?.doctor_name && (
                <div>
                  <p className="text-[10px] font-bold text-[#0067A1] uppercase tracking-wider mb-0.5">Doctor</p>
                  <p className="text-xs font-semibold text-gray-800">{meta.doctor_name}</p>
                  {meta.doctor_qualification && <p className="text-[11px] text-gray-500">{meta.doctor_qualification}</p>}
                  
                  {specList.length > 1 ? (
                    <div className="mt-1">
                      <label className="text-[10px] text-gray-500 font-medium block">Active Specialization</label>
                      <select
                        value={selectedTemplateSpec}
                        onChange={(e) => setSelectedTemplateSpec(e.target.value)}
                        className="text-xs bg-white border border-gray-200 rounded p-1 text-[#0067A1] font-semibold mt-0.5 focus:outline-none focus:ring-1 focus:ring-[#0067A1]"
                      >
                        {specList.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    selectedTemplateSpec && <p className="text-[11px] text-[#0067A1]">{selectedTemplateSpec}</p>
                  )}

                  {meta.doctor_license && <p className="text-[10px] text-gray-400">Reg: {meta.doctor_license}</p>}
                  {meta.doctor_clinic && <p className="text-[10px] text-gray-400">{meta.doctor_clinic}</p>}
                </div>
              )}
              {meta?.patient_name && (
                <div>
                  <p className="text-[10px] font-bold text-[#0067A1] uppercase tracking-wider mb-0.5">Patient</p>
                  <p className="text-xs font-semibold text-gray-800">{meta.patient_name}</p>
                  {meta.patient_gender && <p className="text-[11px] text-gray-500 capitalize">{meta.patient_gender}</p>}
                  {meta.patient_dob && <p className="text-[10px] text-gray-400">DOB: {new Date(meta.patient_dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                  {meta.patient_blood_group && <p className="text-[10px] text-gray-400">Blood: {meta.patient_blood_group}</p>}
                  {meta.patient_address && <p className="text-[10px] text-gray-400 truncate">{meta.patient_address}</p>}
                </div>
              )}
            </div>
          )}
          {/* ── Existing Prescription Notice ── */}
          {isEditingExisting && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-xs font-medium">
                You&apos;ve already written a prescription for this appointment. You can review and update it below.
              </p>
            </div>
          )}

          {/* Dynamic rendering of sections */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className={`${sectionTitle} mb-0`}>
                <span className="w-6 h-6 rounded-full bg-[#0067A1]/10 flex items-center justify-center text-[10px] font-bold text-[#0067A1]">★</span>
                Presenting Complaints
              </div>
              <button
                type="button"
                onClick={addComplaint}
                className="inline-flex items-center gap-1 text-xs text-[#0067A1] hover:text-[#004F7C] font-semibold bg-[#0067A1]/5 hover:bg-[#0067A1]/10 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
            <div className="space-y-3">
              {presentingComplaints.map((comp, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs font-bold text-gray-400 shrink-0 w-5">#{idx + 1}</span>
                  <Autocomplete
                    value={comp.complaint}
                    onChange={(val) => updateComplaint(idx, "complaint", val)}
                    onSelect={(opt) => updateComplaint(idx, "complaint", opt.name)}
                    options={complaintSuggestions.map(s => ({ name: s }))}
                    placeholder="Symptom / Complaint *"
                    className={`${inputClass} flex-1 font-medium bg-white`}
                  />
                  <input
                    type="text"
                    placeholder="Details (e.g. since 3 days, mild/severe)"
                    value={comp.details}
                    onChange={(e) => updateComplaint(idx, "details", e.target.value)}
                    className={`${inputClass} flex-1 bg-white`}
                  />
                  {presentingComplaints.length > 1 && (
                    <button
                      onClick={() => removeComplaint(idx)}
                      className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {getActiveStructure().map((sec, secIdx) => {
            const normSec = normalizeSectionName(sec.section);
            const displayIndex = secIdx + 1;

            if (normSec.includes("presenting complaints") || normSec.includes("complaints") || normSec === "presenting complaints") {
              return null; // Handled dynamically above
            }

            if (normSec.includes("symptoms")) {
              return (
                <section key={secIdx}>
                  <div className={sectionTitle}>
                    <span className="w-6 h-6 rounded-full bg-[#0067A1]/10 flex items-center justify-center text-[10px] font-bold text-[#0067A1]">{displayIndex}</span>
                    {sec.section || "Symptoms"}
                  </div>
                  <Autocomplete
                    value={symptoms}
                    onChange={(val) => {
                      setSymptoms(val);
                      if (val.trim().length > 2) {
                        fetch(`/api/clinical/complaint-mapping?query=${encodeURIComponent(val)}`)
                          .then(res => res.json())
                          .then(json => {
                            if (json.success && json.data) {
                              const mapped = json.data.map(d => ({
                                id: d.canonical_complaint,
                                name: d.canonical_complaint,
                                description: d.diagnoses.map(dx => dx.diagnosis_name).join(", ")
                              }));
                              setSymptomMaster(mapped);
                            }
                          })
                          .catch(console.error);
                      } else {
                        setSymptomMaster([]);
                      }
                    }}
                    onSelect={(opt) => {
                      setSymptoms(opt.name);
                    }}
                    options={symptomMaster}
                    placeholder="Search symptoms (e.g. fever, headache)"
                    className={`${inputClass} font-bold text-[#0067A1]`}
                  />
                </section>
              );
            }

            if (normSec.includes("conditions")) {
              return (
                <section key={secIdx}>
                  <div className={sectionTitle}>
                    <span className="w-6 h-6 rounded-full bg-[#0067A1]/10 flex items-center justify-center text-[10px] font-bold text-[#0067A1]">{displayIndex}</span>
                    {sec.section || "Conditions"}
                  </div>
                  <Autocomplete
                    value={conditions}
                    onChange={(val) => {
                      setConditions(val);
                      if (val.trim().length > 2) {
                        fetch(`/api/clinical/search?type=diagnosis&query=${encodeURIComponent(val)}`)
                          .then(res => res.json())
                          .then(json => {
                            if (json.success && json.data) {
                              const mapped = json.data.map(d => ({
                                id: d.diagnosis_id,
                                name: d.diagnosis_name,
                                description: ''
                              }));
                              setConditionMaster(mapped);
                            }
                          })
                          .catch(console.error);
                      } else {
                        setConditionMaster([]);
                      }
                    }}
                    onSelect={(opt) => {
                      setConditions(opt.name);
                    }}
                    options={conditionMaster}
                    placeholder="Search clinical conditions"
                    className={`${inputClass} font-bold text-[#0067A1]`}
                  />
                </section>
              );
            }

            if (normSec.includes("diagnosis")) {
              return (
                <section key={secIdx}>
                  <div className={sectionTitle}>
                    <span className="w-6 h-6 rounded-full bg-[#0067A1]/10 flex items-center justify-center text-[10px] font-bold text-[#0067A1]">{displayIndex}</span>
                    {sec.section || "Diagnosis"} *
                  </div>
                  <Autocomplete
                    value={diagnosis}
                    onChange={(val) => setDiagnosis(val)}
                    onSelect={(opt) => {
                      setDiagnosis(opt.name);
                      if (opt.description) {
                        setDiagnosisNotes(opt.description);
                      }
                    }}
                    options={diagnosisMaster}
                    placeholder="Primary diagnosis (e.g. Essential Hypertension, Type 2 Diabetes)"
                    className={`${inputClass} font-bold text-[#0067A1]`}
                    renderOption={(opt) => (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{opt.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {opt.icd_code && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-md font-bold">{opt.icd_code}</span>}
                          {opt.description && <span className="text-xs text-gray-500 line-clamp-1">{opt.description}</span>}
                        </div>
                      </div>
                    )}
                  />
                  <textarea
                    placeholder="Clinical notes / history (optional)"
                    value={diagnosisNotes}
                    onChange={(e) => setDiagnosisNotes(e.target.value)}
                    rows={2}
                    className={`${inputClass} mt-2 resize-none`}
                  />
                </section>
              );
            }

            if (normSec.includes("vitals") || normSec === "vital") {
              return (
                <section key={secIdx}>
                  <div className={sectionTitle}>
                    <span className="w-6 h-6 rounded-full bg-[#0067A1]/10 flex items-center justify-center text-[10px] font-bold text-[#0067A1]">{displayIndex}</span>
                    {sec.section || "Vital Signs"}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { key: "blood_pressure", label: "BP", type: "bp_range", unit: "mmHg", sysDef: 120, diaDef: 80, sysMin: 60, sysMax: 250, diaMin: 40, diaMax: 150 },
                      { key: "pulse", label: "Pulse", placeholder: "72 bpm", type: "range", min: 40, max: 200, step: 1, unit: "bpm", def: 72 },
                      { key: "temperature", label: "Temp", placeholder: "98.6 °F", type: "range", min: 90, max: 110, step: 0.1, unit: "°F", def: 98.6 },
                      { key: "weight", label: "Weight", placeholder: "70 kg", type: "range", min: 1, max: 200, step: 0.5, unit: "kg", def: 70 },
                      { key: "spo2", label: "SpO₂", placeholder: "98%", type: "range", min: 50, max: 100, step: 1, unit: "%", def: 98 },
                      { key: "respiratory_rate", label: "Resp Rate", placeholder: "16/min", type: "range", min: 10, max: 60, step: 1, unit: "/min", def: 16 },
                    ].map(({ key, label, placeholder, type, min, max, step, unit, def, sysDef, diaDef, sysMin, sysMax, diaMin, diaMax }) => (
                      <div key={key}>
                        <div className="flex justify-between items-end mb-1">
                          <label className="block text-[11px] font-medium text-gray-500">{label}</label>
                          {(type === "range" || type === "bp_range") && vitalSigns[key] && (
                            <span className="text-[10px] font-bold text-[#0067A1]">{vitalSigns[key]} {unit}</span>
                          )}
                        </div>
                        {type === "bp_range" ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-gray-400 font-bold w-4">SYS</span>
                              <input
                                type="range"
                                min={sysMin}
                                max={sysMax}
                                step={1}
                                value={(vitalSigns[key] || "").split("/")[0] || sysDef}
                                onChange={(e) => {
                                  const dia = (vitalSigns[key] || "").split("/")[1] || diaDef;
                                  updateVital(key, `${e.target.value}/${dia}`);
                                }}
                                className="w-full accent-[#0067A1]"
                              />
                              <input
                                type="number"
                                min={sysMin}
                                max={sysMax}
                                value={(vitalSigns[key] || "").split("/")[0] || ""}
                                onChange={(e) => {
                                  const dia = (vitalSigns[key] || "").split("/")[1] || diaDef;
                                  updateVital(key, `${e.target.value}/${dia}`);
                                }}
                                className={`${inputClass} !w-12 !px-1 !py-1 text-[10px] text-center`}
                                placeholder={sysDef}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-gray-400 font-bold w-4">DIA</span>
                              <input
                                type="range"
                                min={diaMin}
                                max={diaMax}
                                step={1}
                                value={(vitalSigns[key] || "").split("/")[1] || diaDef}
                                onChange={(e) => {
                                  const sys = (vitalSigns[key] || "").split("/")[0] || sysDef;
                                  updateVital(key, `${sys}/${e.target.value}`);
                                }}
                                className="w-full accent-[#0067A1]"
                              />
                              <input
                                type="number"
                                min={diaMin}
                                max={diaMax}
                                value={(vitalSigns[key] || "").split("/")[1] || ""}
                                onChange={(e) => {
                                  const sys = (vitalSigns[key] || "").split("/")[0] || sysDef;
                                  updateVital(key, `${sys}/${e.target.value}`);
                                }}
                                className={`${inputClass} !w-12 !px-1 !py-1 text-[10px] text-center`}
                                placeholder={diaDef}
                              />
                            </div>
                          </div>
                        ) : type === "text" ? (
                          <input
                            type="text"
                            placeholder={placeholder}
                            value={vitalSigns[key] || ""}
                            onChange={(e) => updateVital(key, e.target.value)}
                            className={inputClass}
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="range"
                              min={min}
                              max={max}
                              step={step}
                              value={vitalSigns[key] || def}
                              onChange={(e) => updateVital(key, e.target.value)}
                              className="w-full accent-[#0067A1]"
                            />
                            <input
                              type="number"
                              min={min}
                              max={max}
                              step={step}
                              value={vitalSigns[key] || ""}
                              onChange={(e) => updateVital(key, e.target.value)}
                              className={`${inputClass} !w-14 !px-1.5 !py-1 text-[10px]`}
                              placeholder={def}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            }

            if (normSec.includes("treatment") || normSec === "rx" || normSec === "medicines") {
              return (
                <section key={secIdx}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`${sectionTitle} mb-0`}>
                      <span className="w-6 h-6 rounded-full bg-[#0067A1]/10 flex items-center justify-center text-[10px] font-bold text-[#0067A1]">{displayIndex}</span>
                      {sec.section || "Medicines"} *
                    </div>
                    <button
                      type="button"
                      onClick={addMedicine}
                      className="inline-flex items-center gap-1 text-xs text-[#0067A1] hover:text-[#004F7C] font-semibold bg-[#0067A1]/5 hover:bg-[#0067A1]/10 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <PlusIcon className="w-3.5 h-3.5" /> Add Medicine
                    </button>
                  </div>
                  <div className="space-y-3">
                    {medicines.map((med, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-[#0067A1]/[0.03] border border-[#0067A1]/10 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0067A1]/60 shrink-0 w-5">#{idx + 1}</span>
                          <Autocomplete
                            value={med.name}
                            onChange={(val) => updateMedicine(idx, "name", val)}
                            onSelect={(opt) => {
                              updateMedicine(idx, "name", opt.name);
                              if (opt.dose || opt.power) updateMedicine(idx, "dosage", opt.dose || opt.power);
                            }}
                            options={drugMaster}
                            placeholder="Medicine name *"
                            className={`${inputClass} flex-1 font-medium`}
                            renderOption={(opt) => (
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{opt.name}</span>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  {opt.category && <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 rounded-md font-bold">{opt.category}</span>}
                                  {opt.salt && <span className="text-xs text-gray-500 truncate max-w-[200px]">{opt.salt}</span>}
                                  {opt.power && <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-1.5 rounded-md">{opt.power}</span>}
                                </div>
                              </div>
                            )}
                          />
                          {medicines.length > 1 && (
                            <button
                              onClick={() => removeMedicine(idx)}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7">
                          <input
                            type="text"
                            placeholder="Dosage (e.g. 500mg)"
                            value={med.dosage}
                            onChange={(e) => updateMedicine(idx, "dosage", e.target.value)}
                            className={inputClass}
                          />
                          <input
                            type="text"
                            placeholder="Frequency (e.g. 1-0-1)"
                            value={med.frequency}
                            onChange={(e) => updateMedicine(idx, "frequency", e.target.value)}
                            className={inputClass}
                          />
                          <input
                            type="text"
                            placeholder="Duration (e.g. 5 days)"
                            value={med.duration}
                            onChange={(e) => updateMedicine(idx, "duration", e.target.value)}
                            className={inputClass}
                          />
                          <input
                            type="text"
                            placeholder="Quantity (Auto)"
                            value={med.quantity || ""}
                            onChange={(e) => updateMedicine(idx, "quantity", e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div className="pl-7">
                          <input
                            type="text"
                            placeholder="Instructions (e.g. Take after food)"
                            value={med.instructions}
                            onChange={(e) => updateMedicine(idx, "instructions", e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            }

            if (normSec.includes("investigation") || normSec.includes("lab")) {
              return (
                <section key={secIdx}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`${sectionTitle} mb-0`}>
                      <span className="w-6 h-6 rounded-full bg-[#0067A1]/10 flex items-center justify-center text-[10px] font-bold text-[#0067A1]">{displayIndex}</span>
                      {sec.section || "Lab Tests"}
                    </div>
                    <button
                      type="button"
                      onClick={addLabTest}
                      className="inline-flex items-center gap-1 text-xs text-[#0067A1] hover:text-[#004F7C] font-semibold bg-[#0067A1]/5 hover:bg-[#0067A1]/10 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <PlusIcon className="w-3.5 h-3.5" /> Add Test
                    </button>
                  </div>
                  <div className="space-y-2">
                    {labTests.map((test, idx) => (
                      <div key={idx} className="flex flex-col gap-2 p-2 rounded-xl border border-gray-100 dark:border-gray-800 relative group bg-white dark:bg-gray-900 shadow-sm">
                        <div className="flex items-center gap-2">
                           <Autocomplete
                            value={typeof test === "string" ? test : (test?.test_name || "")}
                            onChange={(val) => updateLabTest(idx, "test_name", val)}
                            onSelect={(opt) => {
                              updateLabTest(idx, "test_name", opt.test_name);
                              if (opt.remarks || opt.instructions) updateLabTest(idx, "instructions", opt.remarks || opt.instructions);
                            }}
                            options={labMaster}
                            placeholder="e.g. CBC, Blood Sugar..."
                            className={`${inputClass} w-full font-bold text-[#0067A1] dark:text-[#0dc2b6]`}
                            renderOption={(opt) => (
                              <div className="flex flex-col py-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {opt.test_name} {opt.test_code ? `(${opt.test_code})` : ""}
                                  </span>
                                  {opt.category && (
                                    <span className="text-[10px] bg-blue-50 text-[#0067A1] dark:bg-blue-950/40 dark:text-blue-400 px-1.5 py-0.5 rounded font-black shrink-0">
                                      {opt.category}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 space-y-0.5">
                                  {opt.container && (
                                    <p><span className="font-semibold text-gray-500">Container:</span> {opt.container} {opt.temp ? `(${opt.temp})` : ""}</p>
                                  )}
                                  {opt.remarks && (
                                    <p className="line-clamp-2 text-gray-500 italic"><span className="font-semibold text-gray-500">Remarks:</span> {opt.remarks}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          />
                          {labTests.length > 1 && (
                            <button
                              onClick={() => removeLabTest(idx)}
                              className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Specific Instructions for patient (e.g. 10 hours fasting)"
                            value={typeof test === "string" ? "" : (test?.instructions || "")}
                            onChange={(e) => updateLabTest(idx, "instructions", e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            }

            if (normSec.includes("followup")) {
              return (
                <section key={secIdx}>
                  <div className={sectionTitle}>
                    <span className="w-6 h-6 rounded-full bg-[#0067A1]/10 flex items-center justify-center text-[10px] font-bold text-[#0067A1]">{displayIndex}</span>
                    {sec.section || "Follow-Up"}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Follow-up Date</label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Follow-up Notes / Warning Signs</label>
                      <input
                        type="text"
                        placeholder="e.g. Review after 1 week"
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </section>
              );
            }

            if (normSec.includes("specialinstructions") || normSec.includes("instructions") || normSec.includes("advice")) {
              return (
                <section key={secIdx}>
                  <div className={sectionTitle}>
                    <span className="w-6 h-6 rounded-full bg-[#0067A1]/10 flex items-center justify-center text-[10px] font-bold text-[#0067A1]">{displayIndex}</span>
                    {sec.section || "Special Instructions / Advice"}
                  </div>
                  <textarea
                    placeholder="Dietary advice, lifestyle changes, precautions…"
                    value={specialMessage}
                    onChange={(e) => setSpecialMessage(e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </section>
              );
            }

            // Custom Section
            return (
              <section key={secIdx}>
                <div className={sectionTitle}>
                  <span className="w-6 h-6 rounded-full bg-[#0067A1]/10 flex items-center justify-center text-[10px] font-bold text-[#0067A1]">{displayIndex}</span>
                  {sec.section}
                </div>
                <div className="space-y-3">
                  {(sec.fields || []).map((field, fieldIdx) => {
                    const fieldKey = `${sec.section}__${field.name}`;
                    const isTextarea = field.type === "textarea";
                    return (
                      <div key={fieldIdx}>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {isTextarea ? (
                          <textarea
                            rows={2}
                            placeholder={field.placeholder || `Enter ${field.label || field.name}`}
                            value={customFields[fieldKey] || ""}
                            onChange={(e) => setCustomFields(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                            className={`${inputClass} resize-none`}
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder={field.placeholder || `Enter ${field.label || field.name}`}
                            value={customFields[fieldKey] || ""}
                            onChange={(e) => setCustomFields(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                            className={inputClass}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          </div>
          )}
        </div>

        {/* ── Footer ── */}
        {templateStep === "write" && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
            <div>
              {templates.length > 0 && (
                <button
                  onClick={() => setTemplateStep("select")}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  Back to Templates
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit("save")}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#0067A1]/30 text-[#0067A1] bg-white hover:bg-[#0067A1]/5 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Draft"}
              </button>
              <button
                onClick={() => handleSubmit("sign")}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[#0067A1] text-white hover:bg-[#004F7C] transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
              >
                {saving ? <><Spinner size="w-4 h-4" />Processing…</> : "Sign & Complete"}
              </button>
            </div>
          </div>
        )}
    </>
  );
}
