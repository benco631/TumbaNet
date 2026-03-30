import { prisma } from "./prisma";

type NotificationType = "BET" | "EVENT" | "HIGHLIGHT";

interface CreateNotificationParams {
  actorId: string;
  actorName: string;
  type: NotificationType;
  message: string;
  targetUrl?: string;
}

/**
 * Create notifications for all users except the actor.
 * Runs in the background — does not block the response.
 */
export async function notifyAllUsers(params: CreateNotificationParams) {
  const { actorId, type, message, targetUrl } = params;
  const users = await prisma.user.findMany({
    where: { id: { not: actorId } },
    select: { id: true },
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      recipientId: u.id,
      actorId,
      type,
      message,
      targetUrl: targetUrl || null,
    })),
  });
}
