import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App;
let adminAuth: Auth;

function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    let credential;

    // Try parsing the entire JSON config first (better for Render/deployment)
    if (process.env.FIREBASE_ADMIN_SDK_CONFIG) {
      try {
        const config = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG);
        credential = cert(config);
      } catch (error) {
        console.error("Failed to parse FIREBASE_ADMIN_SDK_CONFIG:", error);
      }
    }

    // Fallback to individual environment variables
    if (!credential) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        console.warn("Missing Firebase Admin SDK credentials. Authentication may fail.");
      }

      credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      });
    }

    app = initializeApp({
      credential,
    });
  } else {
    app = getApps()[0];
  }

  adminAuth = getAuth(app);
  return { app, adminAuth };
}

const { adminAuth: auth } = initializeFirebaseAdmin();

export { auth as firebaseAdminAuth };

export async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    throw error;
  }
}
