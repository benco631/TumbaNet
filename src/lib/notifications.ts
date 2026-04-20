import { prisma } from "./prisma";

type NotificationType = "BET" | "EVENT" | "HIGHLIGHT";

interface CreateNotificationParams {
  actorId: string;
  actorName: string;
  type: NotificationType;
  message: string;
  targetUrl?: string;
  groupId?: string | null;
}

/**
 * Create notifications for all group members (or all users if no group) except the actor.
 * Runs in the background — does not block the response.
 */
export async function notifyAllUsers(params: CreateNotificationParams) {
  const { actorId, type, message, targetUrl, groupId } = params;

  let recipientIds: string[];

  if (groupId) {
    // Only notify members of the same group
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
}
