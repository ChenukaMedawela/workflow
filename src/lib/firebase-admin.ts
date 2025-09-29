
import * as admin from 'firebase-admin';

// Function to create the auditLogs collection if it doesn't exist
async function ensureAuditLogsCollection(db: admin.firestore.Firestore) {
    const auditLogsRef = db.collection('auditLogs');
    const snapshot = await auditLogsRef.limit(1).get();
    if (snapshot.empty) {
        console.log('Creating auditLogs collection with initial document.');
        await auditLogsRef.add({
            action: 'collection_created',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            user: { id: 'system', name: 'System' },
            details: { message: 'auditLogs collection created automatically.' },
        });
    }
}

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

            // Ensure the auditLogs collection exists right after initialization
            ensureAuditLogsCollection(admin.firestore()).catch(console.error);

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
