import { db, usersTable, postsTable, conversationsTable, messagesTable, articlesTable } from "@workspace/db";
import { and, asc, count, eq, isNotNull } from "drizzle-orm";

export async function seedDatabase(): Promise<void> {
  const [existing] = await db.select({ value: count() }).from(usersTable);
  if (Number(existing?.value ?? 0) === 0) {
    const users = await db.insert(usersTable).values([
    { username: "omito", displayName: "OMITO", category: "influencer", avatarUrl: "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=160", bio: "Curating the night's best tables, pours, and people.", followers: 12400, isAdmin: true },
    { username: "mariaafterdark", displayName: "Maria After Dark", category: "influencer", avatarUrl: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=160", bio: "Cocktail culture, late nights, good light.", followers: 8900 },
    { username: "leo_pours", displayName: "Leo Pours", category: "bartender", avatarUrl: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=160", bio: "Bartender at The Violet Room. Ask me about amaro.", followers: 5200 },
    { username: "nightshift_nyc", displayName: "Nightshift NYC", category: "bartender", avatarUrl: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=160", bio: "Behind the bar, after hours.", followers: 4100 },
    ]).returning();

    const [owner, maria, leo, nightshift] = users;
    await db.insert(postsTable).values([
    { authorId: owner.id, caption: "The city starts glowing around midnight. Meet me where the lights change.", imageUrl: "https://images.pexels.com/photos/1268855/pexels-photo-1268855.jpeg?auto=compress&cs=tinysrgb&w=1200", category: "influencer", location: "Lower East Side" },
    { authorId: maria.id, caption: "A little violet, a little smoke, a lot of conversation.", imageUrl: "https://images.pexels.com/photos/941864/pexels-photo-941864.jpeg?auto=compress&cs=tinysrgb&w=1200", category: "influencer", location: "SoHo" },
    { authorId: leo.id, caption: "Tonight's special: clarified milk punch with a black tea finish.", imageUrl: "https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=1200", category: "bartender", location: "The Violet Room" },
    { authorId: nightshift.id, caption: "Last call is a feeling, not a time.", imageUrl: "https://images.pexels.com/photos/5535038/pexels-photo-5535038.jpeg?auto=compress&cs=tinysrgb&w=1200", category: "bartender", location: "Williamsburg" },
    ]);
    const [conversation] = await db.insert(conversationsTable).values({ ownerId: leo.id, participantId: owner.id }).returning();
    await db.insert(messagesTable).values({ conversationId: conversation.id, senderId: leo.id, body: "You coming through tonight?" });
  }

  const [legacyOwner] = await db.select().from(usersTable)
    .where(and(eq(usersTable.isAdmin, true), isNotNull(usersTable.clerkId)))
    .orderBy(asc(usersTable.id))
    .limit(1);
  const [seededOwner] = await db.select().from(usersTable).where(eq(usersTable.username, "omito"));
  const owner = legacyOwner ?? seededOwner;
  if (!owner) return;
  if (owner.adminRole !== "owner") {
    await db.update(usersTable).set({ isAdmin: true, adminRole: "owner" }).where(eq(usersTable.id, owner.id));
  }
  await db.insert(articlesTable).values([
    {
      authorId: owner.id,
      slug: "the-new-rules-of-last-call",
      title: "The new rules of last call",
      excerpt: "The people behind the bar are rewriting what the final hour can feel like.",
      body: "Last call used to mean a rush toward the exit. The best rooms now treat it as an invitation to slow down: one thoughtful pour, one final song, and enough space for a conversation that would not fit anywhere else. We spent a week with the bartenders, hosts, and regulars shaping that last hour across the city.",
      coverImageUrl: "https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
      authorId: owner.id,
      slug: "how-to-find-a-great-bar-seat",
      title: "How to find a great bar seat",
      excerpt: "A small field guide to reading a room before you order.",
      body: "The best seat is rarely the loudest one. Arrive with enough time to notice the pace of the room, watch where the regulars gather, and let the bartender finish a round before you ask for a recommendation. A good bar seat gives you a view of the craft and a reason to stay for one more.",
      coverImageUrl: "https://images.pexels.com/photos/5535038/pexels-photo-5535038.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
      authorId: owner.id,
      slug: "the-light-after-midnight",
      title: "The light after midnight",
      excerpt: "Why the city looks different when the crowd starts to thin.",
      body: "After midnight, the city softens. Reflections lengthen across the pavement, conversations get more honest, and every walk between rooms becomes part of the night. This is the hour that BY OMITO was made to document: the people, pours, and places worth remembering.",
      coverImageUrl: "https://images.pexels.com/photos/941864/pexels-photo-941864.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
  ]).onConflictDoNothing();
}