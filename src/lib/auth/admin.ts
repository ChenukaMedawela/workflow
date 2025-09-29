
'use server';

import { auth as adminAuth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { User, UserRole } from '@/lib/types';
import { logAudit } from '@/lib/audit-log';

interface CreateUserArgs {
  email: string;
  password: string;
  name: string;
  entityId?: string;
  role: UserRole;
  actor?: User | null;
}

export async function createUser({ email, password, name, entityId, role, actor }: CreateUserArgs): Promise<User> {
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const newUser: User = {
      id: userRecord.uid,
      name,
      email,
      role,
      avatarUrl: `https://i.pravatar.cc/150?u=${userRecord.uid}`,
      ...(entityId && entityId !== 'global' && { entityId }),
    };

    await setDoc(doc(db, 'users', userRecord.uid), newUser);

    await logAudit({
      action: 'create_user',
      user: actor,
      details: {
        createdUserId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        entityId: newUser.entityId,
      },
      timestamp: new Date(),
    });

    return newUser;
  } catch (error: any) {
    console.error("Error creating user with admin privileges:", error);
    throw new Error(error.code || 'admin/user-creation-failed');
  }
}


interface DeleteUserArgs {
    userToDelete: User;
    actor?: User | null;
}

export async function deleteUser({ userToDelete, actor }: DeleteUserArgs): Promise<void> {
    try {
        await adminAuth.deleteUser(userToDelete.id);
        await deleteDoc(doc(db, "users", userToDelete.id));
        
        await logAudit({
            action: 'delete_user',
            from: { id: userToDelete.id, name: userToDelete.name, email: userToDelete.email },
            details: { deletedUserName: userToDelete.name },
            user: actor,
            timestamp: new Date(),
        });

    } catch (error: any) {
        console.error("Error deleting user with admin privileges:", error);
        throw new Error(error.code || 'admin/user-deletion-failed');
    }
}
