import { prisma } from "./prisma";
import { sendPushToUser } from "./push";

// All active (unpairedAt: null) buddy pairs a user currently belongs to —
// a user can appear as user1 or user2 across several rows, since multi-buddy
// support removed the old single-buddy scalar cache on User.
export async function getActiveBuddyPairs(userId: string) {
  return prisma.buddyPair.findMany({
    where: { unpairedAt: null, OR: [{ user1Id: userId }, { user2Id: userId }] },
    orderBy: { pairedAt: "asc" },
  });
}

// The other user's id for every active pair `userId` belongs to — the
// go-to replacement for every old `user.buddyId` read.
export async function getBuddyIds(userId: string): Promise<string[]> {
  const pairs = await getActiveBuddyPairs(userId);
  return pairs.map((pair) => (pair.user1Id === userId ? pair.user2Id : pair.user1Id));
}

// Pairs two users. Multi-buddy means this no longer clears out unrelated
// pending invites — only invites directly between these two users (in case
// both sides had independently invited each other).
export async function pairUsers(userAId: string, userBId: string) {
  await prisma.$transaction([
    prisma.buddyPair.create({ data: { user1Id: userAId, user2Id: userBId } }),
    prisma.buddyInvite.updateMany({
      where: {
        status: "PENDING",
        OR: [
          { fromUserId: userAId, toUserId: userBId },
          { fromUserId: userBId, toUserId: userAId },
        ],
      },
      data: { status: "CANCELED", respondedAt: new Date() },
    }),
  ]);
}

// Dissolves one specific buddy pair — a user with multiple buddies must say
// which one they're unpairing from.
export async function unpairUsers(userId: string, buddyUserId: string) {
  const pair = await prisma.buddyPair.findFirst({
    where: {
      unpairedAt: null,
      OR: [
        { user1Id: userId, user2Id: buddyUserId },
        { user1Id: buddyUserId, user2Id: userId },
      ],
    },
  });
  if (!pair) return;
  await prisma.buddyPair.update({ where: { id: pair.id }, data: { unpairedAt: new Date() } });
}

// Unconditional on penalty type — fires whenever a task is marked
// FAILED_PENALIZED, independent of what happens to the wallet/streak.
// Notifies every connected buddy, not just one.
export async function notifyBuddyOfFailure(user: { id: string; name: string }, taskTitle: string) {
  const buddyIds = await getBuddyIds(user.id);
  await Promise.all(
    buddyIds.map((buddyId) =>
      sendPushToUser(buddyId, {
        title: "Buddy alert",
        body: `${user.name} missed "${taskTitle}" and was penalized.`,
        url: "/buddy",
      }),
    ),
  );
}
