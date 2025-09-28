
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
    user?: User | null;
};

export async function logAudit(log: AuditLogInput) {
    try {
        let actingUser: User | null = null;
        
        if (log.user) {
            actingUser = log.user;
        } else {
            const authResult = await getAuthenticatedUser();
            actingUser = authResult.user;
        }
        
        let auditEntry: Omit<AuditLog, 'id'>;

        if (actingUser) {
            auditEntry = {
                user: {
                    id: actingUser.id,
                    name: actingUser.name,
                    entityId: actingUser.entityId || null,
                },
                action: log.action,
                from: log.from,
                to: log.to,
                details: log.details,
                timestamp: new Date().toISOString(),
            };
        } else {
            // Handle system actions where there's no logged-in user
            auditEntry = {
                user: {
                    id: 'system',
                    name: 'System',
                },
                action: log.action,
                from: log.from,
                to: log.to,
                details: log.details,
                timestamp: new Date().toISOString(),
            };
        }

        await addDoc(collection(db, "auditLogs"), auditEntry);

    } catch (error) {
        console.error("Error writing to audit log:", error);
    }
}
