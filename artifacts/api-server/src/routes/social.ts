import { Router, type IRouter } from "express";
import { and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db, usersTable, postsTable, likesTable, commentsTable, followsTable } from "@workspace/db";
import { getViewer, requireViewer } from "../lib/viewer";
import {
  GetFeedQueryParams, GetProfileParams, SearchSocialQueryParams, CreatePostBody,
  TogglePostLikeParams, GetPostCommentsParams, CreatePostCommentParams, CreatePostCommentBody, ToggleFollowParams,
  GetCurrentUserResponse, GetFeedResponse, GetTrendingResponse, SearchSocialResponse,
  GetProfileResponse, CreatePostResponse, TogglePostLikeResponse, GetPostCommentsResponse,
  CreatePostCommentResponse, ToggleFollowResponse, UpdateProfileBody, UpdateProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function userShape(user: typeof usersTable.$inferSelect, viewerId?: number) {
  const following = viewerId && viewerId !== user.id
    ? await db.select({ id: followsTable.id }).from(followsTable).where(and(eq(followsTable.followerId, viewerId), eq(followsTable.followingId, user.id))).limit(1)
    : [];
  return {
    id: user.id, username: user.username, displayName: user.displayName,
    category: user.category as "influencer" | "bartender" | "everyone", avatarUrl: user.avatarUrl,
    bio: user.bio, basicInfo: user.basicInfo, followers: user.followers, isFollowing: following.length > 0,
  };
}

async function postShape(post: typeof postsTable.$inferSelect, viewerId?: number) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.authorId));
  if (!author) throw new Error(`Post ${post.id} is missing its author.`);
  const [likeCount] = await db.select({ value: count() }).from(likesTable).where(eq(likesTable.postId, post.id));
  const [commentCount] = await db.select({ value: count() }).from(commentsTable).where(and(eq(commentsTable.postId, post.id), eq(commentsTable.moderationStatus, "visible")));
  const viewerLike = viewerId ? await db.select().from(likesTable).where(and(eq(likesTable.postId, post.id), eq(likesTable.userId, viewerId))) : [];
  return {
    id: post.id, author: await userShape(author, viewerId), caption: post.caption, imageUrl: post.imageUrl,
    category: post.category as "influencer" | "bartender" | "everyone", location: post.location,
    likes: Number(likeCount?.value ?? 0), comments: Number(commentCount?.value ?? 0),
    createdAt: post.createdAt.toISOString(), likedByMe: viewerLike.length > 0,
  };
}

function validImageUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function validUsername(value: string): string | undefined {
  const username = value.trim().toLowerCase();
  return /^[a-z0-9_]{3,28}$/.test(username) ? username : undefined;
}

router.get("/me", async (req, res): Promise<void> => {
  const viewer = await requireViewer(req, res);
  if (!viewer) return;
  res.json(GetCurrentUserResponse.parse({
    ...await userShape(viewer, viewer.id),
    adminRole: viewer.adminRole as "member" | "admin" | "owner",
  }));
});

router.put("/me/profile", async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const viewer = await requireViewer(req, res);
  if (!viewer) return;

  const username = validUsername(parsed.data.username);
  if (!username) {
    res.status(400).json({ error: "Username must use 3–28 lowercase letters, numbers, or underscores." });
    return;
  }
  const displayName = parsed.data.displayName.trim();
  if (!displayName) {
    res.status(400).json({ error: "Display name cannot be empty." });
    return;
  }
  const avatarUrl = validImageUrl(parsed.data.avatarUrl);
  if (!avatarUrl) {
    res.status(400).json({ error: "Use a valid http or https URL for your profile photo." });
    return;
  }
  const [taken] = await db.select({ id: usersTable.id }).from(usersTable)
    .where(and(eq(usersTable.username, username), ne(usersTable.id, viewer.id))).limit(1);
  if (taken) {
    res.status(409).json({ error: "That username is already taken." });
    return;
  }
  const [updated] = await db.update(usersTable).set({
    username,
    displayName,
    avatarUrl,
    category: parsed.data.category,
    bio: parsed.data.bio.trim(),
    basicInfo: parsed.data.basicInfo.trim(),
  }).where(eq(usersTable.id, viewer.id)).returning();
  res.json(UpdateProfileResponse.parse(await userShape(updated, updated.id)));
});

router.get("/feed", async (req, res): Promise<void> => {
  const parsed = GetFeedQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const viewer = await getViewer(req);
  const category = parsed.data.category;
  const rows = await db.select({ post: postsTable }).from(postsTable).innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(and(eq(postsTable.moderationStatus, "visible"), eq(usersTable.accountStatus, "active"), category && category !== "all" ? eq(postsTable.category, category === "influencers" ? "influencer" : "bartender") : undefined))
    .orderBy(desc(postsTable.createdAt)).limit(30);
  const items = await Promise.all(rows.map(({ post }) => postShape(post, viewer?.id)));
  res.json(GetFeedResponse.parse({ items, nextCursor: null }));
});

router.get("/trending", async (req, res): Promise<void> => {
  const viewer = await getViewer(req);
  const rows = await db.select({ post: postsTable }).from(postsTable).innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .leftJoin(likesTable, eq(likesTable.postId, postsTable.id))
    .where(and(eq(postsTable.moderationStatus, "visible"), eq(usersTable.accountStatus, "active")))
    .groupBy(postsTable.id)
    .orderBy(desc(count(likesTable.id)), desc(postsTable.createdAt))
    .limit(6);
  res.json(GetTrendingResponse.parse(await Promise.all(rows.map(({ post }) => postShape(post, viewer?.id)))));
});

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchSocialQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const viewer = await getViewer(req);
  const term = `%${parsed.data.q}%`;
  const [users, posts] = await Promise.all([
    db.select().from(usersTable).where(and(eq(usersTable.accountStatus, "active"), or(ilike(usersTable.username, term), ilike(usersTable.displayName, term)))).limit(10),
    db.select({ post: postsTable }).from(postsTable).innerJoin(usersTable, eq(postsTable.authorId, usersTable.id)).where(and(eq(postsTable.moderationStatus, "visible"), eq(usersTable.accountStatus, "active"), ilike(postsTable.caption, term))).orderBy(desc(postsTable.createdAt)).limit(10),
  ]);
  res.json(SearchSocialResponse.parse({
    users: await Promise.all(users.map((user) => userShape(user, viewer?.id))),
    posts: await Promise.all(posts.map(({ post }) => postShape(post, viewer?.id))),
  }));
});

router.get("/users/:username", async (req, res): Promise<void> => {
  const parsed = GetProfileParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.username));
  if (!user || user.accountStatus !== "active") { res.status(404).json({ error: "Profile not found" }); return; }
  const viewer = await getViewer(req);
  const posts = await db.select().from(postsTable).where(and(eq(postsTable.authorId, user.id), eq(postsTable.moderationStatus, "visible"))).orderBy(desc(postsTable.createdAt));
  res.json(GetProfileResponse.parse({ ...(await userShape(user, viewer?.id)), posts: await Promise.all(posts.map((post) => postShape(post, viewer?.id))) }));
});

router.post("/users/:username/follow", async (req, res): Promise<void> => {
  const parsed = ToggleFollowParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const viewer = await requireViewer(req, res);
  if (!viewer) return;
  const [target] = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.username));
  if (!target || target.accountStatus !== "active") { res.status(404).json({ error: "Profile not found" }); return; }
  if (target.id === viewer.id) { res.status(400).json({ error: "You cannot follow your own profile." }); return; }
  const [existing] = await db.select({ id: followsTable.id }).from(followsTable)
    .where(and(eq(followsTable.followerId, viewer.id), eq(followsTable.followingId, target.id)));
  if (existing) {
    await db.delete(followsTable).where(eq(followsTable.id, existing.id));
    const followers = Math.max(0, target.followers - 1);
    await db.update(usersTable).set({ followers }).where(eq(usersTable.id, target.id));
    res.json(ToggleFollowResponse.parse({ following: false, followers }));
    return;
  }
  const inserted = await db.insert(followsTable)
    .values({ followerId: viewer.id, followingId: target.id })
    .onConflictDoNothing()
    .returning({ id: followsTable.id });
  const followers = inserted.length ? target.followers + 1 : target.followers;
  if (inserted.length) await db.update(usersTable).set({ followers: sql`${usersTable.followers} + 1` }).where(eq(usersTable.id, target.id));
  res.json(ToggleFollowResponse.parse({ following: true, followers }));
});

router.post("/posts", async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const viewer = await requireViewer(req, res);
  if (!viewer) return;
  const imageUrl = validImageUrl(parsed.data.imageUrl);
  if (!imageUrl) { res.status(400).json({ error: "Use a valid http or https image URL." }); return; }
  const caption = parsed.data.caption.trim();
  if (!caption) { res.status(400).json({ error: "Caption cannot be empty." }); return; }
  const [post] = await db.insert(postsTable).values({
    authorId: viewer.id,
    caption,
    imageUrl,
    category: viewer.category,
    location: parsed.data.location?.trim() || null,
  }).returning();
  res.status(201).json(CreatePostResponse.parse(await postShape(post, viewer.id)));
});

router.post("/posts/:id/like", async (req, res): Promise<void> => {
  const params = TogglePostLikeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const viewer = await requireViewer(req, res);
  if (!viewer) return;
  const [post] = await db.select({ id: postsTable.id }).from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(and(eq(postsTable.id, params.data.id), eq(postsTable.moderationStatus, "visible"), eq(usersTable.accountStatus, "active")));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  const [existing] = await db.select().from(likesTable).where(and(eq(likesTable.postId, params.data.id), eq(likesTable.userId, viewer.id)));
  let liked: boolean;
  if (existing) {
    await db.delete(likesTable).where(eq(likesTable.id, existing.id));
    liked = false;
  } else {
    await db.insert(likesTable).values({ postId: params.data.id, userId: viewer.id }).onConflictDoNothing();
    const [persisted] = await db.select({ id: likesTable.id }).from(likesTable)
      .where(and(eq(likesTable.postId, params.data.id), eq(likesTable.userId, viewer.id)));
    liked = Boolean(persisted);
  }
  const [likeCount] = await db.select({ value: count() }).from(likesTable).where(eq(likesTable.postId, params.data.id));
  res.json(TogglePostLikeResponse.parse({ liked, likes: Number(likeCount?.value ?? 0) }));
});

router.get("/posts/:id/comments", async (req, res): Promise<void> => {
  const params = GetPostCommentsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [post] = await db.select({ id: postsTable.id }).from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(and(eq(postsTable.id, params.data.id), eq(postsTable.moderationStatus, "visible"), eq(usersTable.accountStatus, "active")));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  const rows = await db.select({ comment: commentsTable, author: usersTable }).from(commentsTable)
    .innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
    .where(and(eq(commentsTable.postId, params.data.id), eq(commentsTable.moderationStatus, "visible"), eq(usersTable.accountStatus, "active"))).orderBy(asc(commentsTable.createdAt));
  res.json(GetPostCommentsResponse.parse(await Promise.all(rows.map(async ({ comment, author }) => ({
    id: comment.id, author: await userShape(author), body: comment.body, createdAt: comment.createdAt.toISOString(),
  })))));
});

router.post("/posts/:id/comments", async (req, res): Promise<void> => {
  const params = CreatePostCommentParams.safeParse(req.params);
  const body = CreatePostCommentBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid comment" }); return; }
  const viewer = await requireViewer(req, res);
  if (!viewer) return;
  const [post] = await db.select({ id: postsTable.id }).from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(and(eq(postsTable.id, params.data.id), eq(postsTable.moderationStatus, "visible"), eq(usersTable.accountStatus, "active")));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  const [comment] = await db.insert(commentsTable).values({ postId: params.data.id, authorId: viewer.id, body: body.data.body }).returning();
  res.status(201).json(CreatePostCommentResponse.parse({ id: comment.id, author: await userShape(viewer, viewer.id), body: comment.body, createdAt: comment.createdAt.toISOString() }));
});

export default router;