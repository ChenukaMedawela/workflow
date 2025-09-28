
'use server';

import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuthenticatedUser } from './auth/get-authenticated-user';
import { AuditLog, User } from './types';

type AuditLogInput = {
    action: string;
    from?: any;
    to?: any;
    details?: Record<string, any>;
};

export async function logAudit(log: AuditLogInput) {
    try {
        const { user } = await getAuthenticatedUser();
        
        let auditEntry: Omit<AuditLog, 'id'>;

        if (user) {
            auditEntry = {
                user: {
                    id: user.id,
                    name: user.name,
                    entityId: user.entityId || null,
                },
                ...log,
                timestamp: new Date().toISOString(),
            };
        } else {
            // Handle system actions where there's no logged-in user
            auditEntry = {
                user: {
                    id: 'system',
                    name: 'System',
                },
                ...log,
                timestamp: new Date().toISOString(),
            };
        }

        await addDoc(collection(db, "auditLogs"), auditEntry);

    } catch (error) {
        console.error("Error writing to audit log:", error);
    }
}
