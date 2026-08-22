import { Router, type IRouter } from "express";
import { and, asc, desc, eq, or } from "drizzle-orm";
import { db, usersTable, conversationsTable, messagesTable } from "@workspace/db";
import {
  CreateChatBody,
  CreateChatResponse,
  GetChatsResponse,
  GetChatMessagesParams,
  GetChatMessagesResponse,
  SendChatMessageParams,
  SendChatMessageBody,
  SendChatMessageResponse,
} from "@workspace/api-zod";
import { requireViewer } from "../lib/viewer";

const router: IRouter = Router();

const userShape = (user: typeof usersTable.$inferSelect) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  category: user.category as "influencer" | "bartender" | "everyone",
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  basicInfo: user.basicInfo,
  followers: user.followers,
  isFollowing: false,
});

async function getAccessibleConversation(id: number, viewerId: number) {
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, id),
        or(
          eq(conversationsTable.ownerId, viewerId),
          eq(conversationsTable.participantId, viewerId),
        ),
      ),
    )
    .limit(1);
  return conversation;
}

async function conversationShape(
  conversation: typeof conversationsTable.$inferSelect,
  viewerId: number,
) {
  const partnerId =
    conversation.ownerId === viewerId
      ? conversation.participantId
      : conversation.ownerId;

  if (!partnerId) return null;

  const [participant] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, partnerId), eq(usersTable.accountStatus, "active")))
    .limit(1);
  if (!participant) return null;

  const [last] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversation.id))
    .orderBy(desc(messagesTable.createdAt), desc(messagesTable.id))
    .limit(1);

  return {
    id: conversation.id,
    participant: userShape(participant),
    lastMessage: last?.body ?? "Start a conversation",
    unread: 0,
  };
}

router.get("/chats", async (req, res): Promise<void> => {
  const me = await requireViewer(req, res);
  if (!me) return;

  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.ownerId, me.id),
        eq(conversationsTable.participantId, me.id),
      ),
    )
    .orderBy(desc(conversationsTable.createdAt));

  const shaped = await Promise.all(
    conversations.map((conversation) => conversationShape(conversation, me.id)),
  );
  res.json(GetChatsResponse.parse(shaped.filter((item) => item !== null)));
});

router.post("/chats", async (req, res): Promise<void> => {
  const body = CreateChatBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Enter a valid member username." });
    return;
  }

  const me = await requireViewer(req, res);
  if (!me) return;

  const username = body.data.username.trim().toLowerCase();
  const [participant] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.username, username), eq(usersTable.accountStatus, "active")))
    .limit(1);
  if (!participant) {
    res.status(404).json({ error: "Member not found." });
    return;
  }
  if (participant.id === me.id) {
    res.status(400).json({ error: "Choose another member to start a conversation." });
    return;
  }

  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        and(
          eq(conversationsTable.ownerId, me.id),
          eq(conversationsTable.participantId, participant.id),
        ),
        and(
          eq(conversationsTable.ownerId, participant.id),
          eq(conversationsTable.participantId, me.id),
        ),
      ),
    )
    .limit(1);

  const [conversation] = existing
    ? [existing]
    : await db
        .insert(conversationsTable)
        .values({ ownerId: me.id, participantId: participant.id })
        .returning();

  const shaped = await conversationShape(conversation, me.id);
  if (!shaped) {
    res.status(404).json({ error: "Conversation partner is unavailable." });
    return;
  }
  res.status(existing ? 200 : 201).json(CreateChatResponse.parse(shaped));
});

router.get("/chats/:id/messages", async (req, res): Promise<void> => {
  const params = GetChatMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const me = await requireViewer(req, res);
  if (!me) return;
  const conversation = await getAccessibleConversation(params.data.id, me.id);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const rows = await db
    .select({ message: messagesTable, sender: usersTable })
    .from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(asc(messagesTable.createdAt), asc(messagesTable.id));
  res.json(
    GetChatMessagesResponse.parse(
      rows.map(({ message, sender }) => ({
        id: message.id,
        sender: userShape(sender),
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/chats/:id/messages", async (req, res): Promise<void> => {
  const params = SendChatMessageParams.safeParse(req.params);
  const body = SendChatMessageBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid message" });
    return;
  }
  const me = await requireViewer(req, res);
  if (!me) return;
  const conversation = await getAccessibleConversation(params.data.id, me.id);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const [message] = await db
    .insert(messagesTable)
    .values({ conversationId: params.data.id, senderId: me.id, body: body.data.body.trim() })
    .returning();
  res.status(201).json(
    SendChatMessageResponse.parse({
      id: message.id,
      sender: userShape(me),
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    }),
  );
});

export default router;