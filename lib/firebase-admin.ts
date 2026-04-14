import { getApps, initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const firebaseAdminConfig = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
}

let app;
if (getApps().length === 0) {
  if (firebaseAdminConfig.project_id) {
    app = initializeApp({
      credential: cert(firebaseAdminConfig as any),
    })
  } else {
    console.warn("Firebase Admin project_id is missing. Admin SDK will not be initialized.");
  }
} else {
  app = getApps()[0]
}

export const adminDb = (app ? getFirestore(app) : null) as any;
export const db = adminDb;
