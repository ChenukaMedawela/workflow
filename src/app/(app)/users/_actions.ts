
'use server';

import { revalidatePath } from 'next/cache';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

const { db, auth } = getFirebaseAdmin();

export async function approveUser(userId: string) {
  const userRef = db.collection('users').doc(userId);
  await userRef.update({
    status: 'approved',
    role: 'Viewer', // Default role
  });
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
