import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    // עוטפים את פרטי ההתחברות בתוך admin.credential.cert
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// ייצוא של הכלים שאתם צריכים מהאדמין
export const adminAuth = admin.auth();
export const adminDb = admin.firestore(); // אם אתם משתמשים גם ב-Firestore שם
