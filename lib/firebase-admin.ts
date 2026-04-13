import { getApps, initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const firebaseAdminConfig = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
}

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert(firebaseAdminConfig as any),
      })
    : getApps()[0]

export const adminDb = getFirestore(app);
export const db = adminDb;
