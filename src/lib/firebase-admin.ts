
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Failed to initialize firebase-admin:', error.message);
    // Depending on the environment, you might want to handle this differently.
    // For instance, in a critical path, you might want to throw the error.
  }
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };
