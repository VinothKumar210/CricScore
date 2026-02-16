import admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';

const firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        // Private key comes as a string with escaped newlines from env vars
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '',
    }),
});

export const firebaseAuth: Auth = firebaseApp.auth();
export default firebaseApp;
