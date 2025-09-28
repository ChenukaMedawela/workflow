
import * as admin from 'firebase-admin';

export function getFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
                throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please set it in your .env.local file.');
            }
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } catch (error: any) {
            console.error('Failed to initialize firebase-admin:', error.message);
            // Re-throwing the error is important so the caller knows initialization failed.
            throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
        }
    }
    return {
        auth: admin.auth(),
        db: admin.firestore(),
    };
}
