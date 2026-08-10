import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

/* --------------------------------
   Check if browser supports FCM
-------------------------------- */
function isMessagingSupported() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  );
}

/* --------------------------------
   Lazy messaging instance getter
-------------------------------- */
let _messaging = null;
function getMessagingInstance() {
  if (!isMessagingSupported()) return null;
  if (_messaging) return _messaging;
  try {
    const { getMessaging } = require("firebase/messaging");
    _messaging = getMessaging(app);
    return _messaging;
  } catch (err) {
    console.warn("Firebase Messaging is not supported in this browser:", err?.message);
    return null;
  }
}

/* --------------------------------
   Generate Device Token
-------------------------------- */
export async function generateDeviceToken() {
  const messaging = getMessagingInstance();
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const registration = await navigator.serviceWorker.ready;
    const { getToken } = await import("firebase/messaging");
    return await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch (err) {
    console.warn("Failed to generate FCM device token:", err?.message);
    return null;
  }
}

/* --------------------------------
   Foreground Push Handler
-------------------------------- */
export async function onForegroundMessage(cb) {
  const messaging = getMessagingInstance();
  if (!messaging) return;
  try {
    const { onMessage } = await import("firebase/messaging");
    onMessage(messaging, cb);
  } catch (err) {
    console.warn("Firebase onMessage error:", err?.message);
  }
}
