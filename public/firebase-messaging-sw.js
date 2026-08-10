importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyB4hN2TkGcgLF6-MS5opr1jzHRA16PCsXI",
  authDomain: "mediconnect-4e704.firebaseapp.com",
  projectId: "mediconnect-4e704",
  storageBucket: "mediconnect-4e704.firebasestorage.app",
  messagingSenderId: "914735542884",
  appId: "1:914735542884:web:2e7afc4e9de87e1d196571"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo.png",
  });
});
