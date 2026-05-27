import * as admin from 'firebase-admin';

function initAdminApp() {
  if (admin.apps.length) return;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export function getAdminAuth() {
  initAdminApp();
  return admin.auth();
}

export function getAdminDb() {
  initAdminApp();
  return admin.firestore();
}
