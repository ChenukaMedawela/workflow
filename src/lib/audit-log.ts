
'use server';

import { getFirebaseAdmin } from './firebase-admin';
import { User } from './types';

type AuditLogInput = {
    action: string;
    from?: Record<string, any>;
    to?: Record<string, any>;
    details?: Record<string, any>;
    user?: User | null;
    timestamp?: Date;
};

// Helper function to find differences between two objects.
// It returns an object with `from` and `to` properties containing only the changed fields,
// or `null` if no changes are detected.
const getChangedFields = (from: Record<string, any> | undefined, to: Record<string, any> | undefined): { from: Record<string, any>, to: Record<string, any> } | null => {
    if (!from || !to) return null;

    const fromChanges: Record<string, any> = {};
    const toChanges: Record<string, any> = {};
    let hasChanges = false;

    // Use all unique keys from both objects to catch additions, deletions, and modifications.
    const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);

    for (const key of allKeys) {
        // Exclude the stageHistory field from the comparison
        if (key === 'stageHistory') {
            continue;
        }

        const fromValue = from[key];
        const toValue = to[key];

        // Using JSON.stringify is a robust way to compare values, including nested objects and arrays.
        // It correctly handles null, undefined, and type differences that might occur after serialization.
        if (JSON.stringify(fromValue) !== JSON.stringify(toValue)) {
            hasChanges = true;
            // Use `?? null` to ensure that `undefined` values are stored as `null` in Firestore,
            // which makes queries more consistent.
            fromChanges[key] = fromValue ?? null;
            toChanges[key] = toValue ?? null;
        }
    }

    return hasChanges ? { from: fromChanges, to: toChanges } : null;
};


export async function logAudit(log: AuditLogInput) {
    try {
        const { db } = getFirebaseAdmin();
        const { user, action, details, timestamp } = log;

        let fromPayload = log.from;
        let toPayload = log.to;

        // For any action starting with 'update_', we'll calculate the actual changes.
        if (action.startsWith('update_') && fromPayload && toPayload) {
            const changes = getChangedFields(fromPayload, toPayload);

            if (!changes) {
                // If no changes are detected, we prevent logging to avoid "false positives".
                console.log(`Audit log for action '${action}' skipped: No changes detected.`);
                return;
            }
            // If changes are found, we replace the payloads with the filtered changes.
            fromPayload = changes.from;
            toPayload = changes.to;
        }
        
        const auditEntry = {
            user: {
                id: user?.id ?? 'system',
                name: user?.name ?? 'System',
                entityId: user?.entityId ?? null, // Correctly placing entityId inside the user object.
            },
            action: action,
            from: fromPayload, // This will be the filtered changes or the original if not an update.
            to: toPayload,   // This will be the filtered changes or the original if not an update.
            details: details,
            timestamp: timestamp || new Date(),
        };

        await db.collection('auditLogs').add(auditEntry);

    } catch (error) {
        console.error("Error writing to audit log:", error);
    }
}
