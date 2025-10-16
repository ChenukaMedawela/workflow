import 'dotenv/config';

import { getFirebaseAdmin } from './src/lib/firebase-admin';

const { db } = getFirebaseAdmin();

async function approveSuperAdmin() {
  console.log('Attempting to find and approve Super Admin...');

  const usersRef = db.collection('users');
  const pendingUsersQuery = usersRef.where('status', '==', 'pending').limit(1);

  const snapshot = await pendingUsersQuery.get();

  if (snapshot.empty) {
    console.log('No pending users found. Checking for an existing user to promote.');
    const allUsersQuery = usersRef.orderBy('email').limit(1);
    const allUsersSnapshot = await allUsersQuery.get();
    if (allUsersSnapshot.empty) {
      console.error('CRITICAL: No users found in the database.');
      return;
    }

    const userDoc = allUsersSnapshot.docs[0];
    const userData = userDoc.data();

    if (userData.status === 'approved' && userData.role === 'Super Admin') {
      console.log(`User ${userData.email} is already an approved Super Admin.`);
      return;
    }

    console.log(`Found existing user: ${userData.email}. Promoting to Super Admin.`);
    await userDoc.ref.update({
      status: 'approved',
      role: 'Super Admin',
    });
    console.log(`Successfully promoted ${userData.email} to Super Admin.`);
    return;
  }

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();
  console.log(`Found pending user: ${userData.email}`);

  await userDoc.ref.update({
    status: 'approved',
    role: 'Super Admin',
  });

  console.log(`Successfully approved ${userData.email} and promoted to Super Admin.`);
}

approveSuperAdmin().catch(console.error);
