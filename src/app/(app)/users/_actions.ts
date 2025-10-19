
'use server';

import { revalidatePath } from 'next/cache';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function approveUser(userId: string) {
  const { db, auth } = getFirebaseAdmin();
  const userRef = db.collection('users').doc(userId);
  
  const entitiesSnapshot = await db.collection('entities').limit(1).get();
  const entityId = entitiesSnapshot.docs[0]?.id;

  await userRef.update({
    status: 'approved',
    role: 'Viewer', // Default role
    ...(entityId && { entityId }),
  });

  await auth.setCustomUserClaims(userId, { role: 'Viewer' });

  // Revoke the user's refresh token to force re-authentication
  await auth.revokeRefreshTokens(userId);

  revalidatePath('/(app)/users');
}

export async function rejectUser(userId: string) {
  const { db, auth } = getFirebaseAdmin();
  const userRef = db.collection('users').doc(userId);
  await userRef.delete();
  
  try {
    await auth.deleteUser(userId);
  } catch (error) {
    console.error(`Error deleting user from Firebase Auth: ${userId}`, error);
    // Even if auth deletion fails, the user is removed from the app's user list.
  }

  revalidatePath('/(app)/users');
}

export async function updateUser(userId: string, data: { name: string; email: string; role?: string; entity?: string }) {
  const { db, auth } = getFirebaseAdmin();
  const userRef = db.collection('users').doc(userId);

  const updateData: { [key: string]: any } = {
    name: data.name,
    email: data.email,
  };

  if (data.role) {
    updateData.role = data.role;
  }

  if (data.entity !== undefined) {
    if (data.entity) {
        updateData.entityId = data.entity;
    } else {
        updateData.entityId = FieldValue.delete();
    }
  }


  await userRef.update(updateData);

  await auth.updateUser(userId, {
    displayName: data.name,
    email: data.email,
  });

  if (data.role) {
    await auth.setCustomUserClaims(userId, { role: data.role });
  }

  await auth.revokeRefreshTokens(userId);

  revalidatePath('/(app)/users');
}
