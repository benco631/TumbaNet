import webpush from "web-push";
import { prisma } from "./prisma";

// הגדרת המפתחות עבור הספרייה
webpush.setVapidDetails(
  "mailto:your-email@example.com", // שים פה אימייל אמיתי שלך
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

type NotificationType = "BET" | "EVENT" | "HIGHLIGHT" | "TRANSFER" | "REWARD" | "REJECTED" | "NEW_REQUEST";

interface CreateNotificationParams {
  actorId: string;
  actorName: string;
  type: NotificationType;
  message: string;
  targetUrl?: string;
  groupId?: string | null;
}

export async function notifyAllUsers(params: CreateNotificationParams) {
  const { actorId, actorName, type, message, targetUrl, groupId } = params;

  // התיקון לאדום: אתחול המערך עם ערך דיפולטיבי ריק
  let recipientIds: string[] = [];

  // 1. חילוץ הנמענים
  if (groupId) {
    const members = await prisma.groupMembership.findMany({
      where: { groupId, userId: { not: actorId } },
      select: { userId: true },
    });
    recipientIds = members.map((m) => m.userId);
  } else {
    const users = await prisma.user.findMany({
      where: { id: { not: actorId } },
      select: { id: true },
    });
    recipientIds = users.map((u) => u.id);
  }

  if (recipientIds.length === 0) return;

  // 2. שמירת ההתראות בתוך האפליקציה
  await prisma.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      recipientId,
      actorId,
      type,
      message,
      targetUrl: targetUrl || null,
      groupId: groupId || null,
    })),
  });

  // 3. --- התוספת החדשה: שליחת פוש לטלפונים ---
  try {
    // שליפת כל המכשירים הרשומים של הנמענים
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: recipientIds } },
    });

    if (subscriptions.length === 0) return;

    // לוגיקה לבחירת כותרת דינמית לפי סוג ההתראה
    let notificationTitle = "New Update";
    
    switch (type) {
      case "BET":
        notificationTitle = `New Bet by ${actorName}`;
        break;
      case "EVENT":
        notificationTitle = `New Event: ${actorName} invited you`;
        break;
      case "HIGHLIGHT":
        notificationTitle = `New Highlight from ${actorName}`;
        break;
      case "TRANSFER": // <--- הקייס החדש שהוספנו
        notificationTitle = `TumbaCoins Received!`; 
      case "TRANSFER":
        notificationTitle = `TumbaCoins Received! `;
        break;
      case "REWARD":
        notificationTitle = `Report Approved!`;
        break;
      case "REJECTED":
        notificationTitle = `Report Update`;
        break;
      case "NEW_REQUEST":
        notificationTitle = `Action Required `;
        break;  
      default:
        notificationTitle = `Update from ${actorName}`;
    }

    // הכנת המידע שיישלח לטלפון
    const payload = JSON.stringify({
      title: notificationTitle,
      message: message,
      targetUrl: targetUrl || "/",
    });

    // יריית ההודעות במקביל לכל המכשירים
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
      } catch (error) {
        // המרה זהירה ותקנית לסוג השגיאה ש-web-push מחזיר
        const pushError = error as webpush.WebPushError;
        
        // אם גוגל/אפל אומרים לנו שהמנוי כבר לא בתוקף
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error("Push notification error:", pushError);
        }
      }
    });

    await Promise.all(pushPromises);
  } catch (error) {
    console.error("Error processing web pushes:", error);
  }
}

export async function notifySingleUser(recipientId: string, params: CreateNotificationParams) {
  const { actorId, actorName, type, message, targetUrl } = params;

  // 1. שמירת ההתראה ב-DB (In-App)
  await prisma.notification.create({
    data: {
      recipientId,
      actorId,
      type,
      message,
      targetUrl: targetUrl || null,
    },
  });

  // 2. יריית פוש למכשירים הספציפיים של המשתמש הזה
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: recipientId },
    });

    if (subscriptions.length === 0) return;

    let notificationTitle = "New Update";
    switch (type) {
      case "TRANSFER":
        notificationTitle = `TumbaCoins Received! 🪙`;
        break;
      case "BET":
        notificationTitle = `New Bet by ${actorName}`;
        break;
      case "EVENT":
        notificationTitle = `New Event: ${actorName} invited you`;
        break;
      default:
        notificationTitle = `Update from ${actorName}`;
    }

    const payload = JSON.stringify({
      title: notificationTitle,
      message: message,
      targetUrl: targetUrl || "/",
    });

    const pushPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (error) {
        const pushError = error as webpush.WebPushError;
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    });

    await Promise.all(pushPromises);
  } catch (error) {
    console.error("Error sending single web push:", error);
  }
}