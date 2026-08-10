import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FCM_PROJECT_ID,
      client_email: process.env.FCM_CLIENT_EMAIL,
      private_key: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export default admin;
