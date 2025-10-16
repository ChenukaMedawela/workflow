
'use server';

import { revalidatePath } from 'next/cache';
import { db, auth } from '@/lib/firebase-admin';

export async function approveUser(userId: string) {
  const userRef = db.collection('users').doc(userId);
  
  const entitiesSnapshot = await db.collection('entities').limit(1).get();
  const entityId = entitiesSnapshot.docs[0]?.id;

  await userRef.update({
    status: 'approved',
    role: 'Viewer', // Default role
    ...(entityId && { entityId }),
  });

  // Revoke the user's refresh token to force re-authentication
  await auth.revokeRefreshTokens(userId);

  revalidatePath('/(app)/users');
}

export async function rejectUser(userId: string) {
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
