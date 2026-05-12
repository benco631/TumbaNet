import webpush from "web-push";
import { prisma } from "./prisma";

// הגדרת המפתחות עבור הספרייה
webpush.setVapidDetails(
  "mailto:your-email@example.com", // שים פה אימייל אמיתי שלך
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

type NotificationType = "BET" | "EVENT" | "HIGHLIGHT";

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

  let recipientIds: string[];

  // 1. חילוץ הנמענים (בדיוק כמו שהיה לך)
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

  // 2. שמירת ההתראות בתוך האפליקציה (בדיוק כמו שהיה לך)
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

    // הכנת המידע שיישלח לטלפון
    const payload = JSON.stringify({
      title: `Update from ${actorName}`,
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
      } catch (error: any) {
        // אם גוגל/אפל אומרים לנו שהמנוי כבר לא בתוקף (למשל המשתמש ביטל התראות בטלפון)
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error("Push notification error:", error);
        }
      }
    });

    await Promise.all(pushPromises);
  } catch (error) {
    console.error("Error processing web pushes:", error);
  }
}