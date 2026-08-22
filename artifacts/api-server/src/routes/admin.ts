import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  articlesTable,
  auditLogsTable,
  bannerEventsTable,
  bannersTable,
  commentsTable,
  db,
  followsTable,
  likesTable,
  postsTable,
  reportsTable,
  usersTable,
  type User,
} from "@workspace/db";
import {
  CreateAdminArticleBody,
  CreateAdminArticleResponse,
  CreateAdminBannerBody,
  CreateAdminBannerResponse,
  GetActiveBannersQueryParams,
  GetActiveBannersResponse,
  GetAdminArticlesResponse,
  GetAdminAuditResponse,
  GetAdminBannersResponse,
  GetAdminCommentsQueryParams,
  GetAdminCommentsResponse,
  GetAdminDashboardResponse,
  GetAdminPostsQueryParams,
  GetAdminPostsResponse,
  GetAdminReportsResponse,
  GetAdminUsersQueryParams,
  GetAdminUsersResponse,
  ModerateAdminCommentBody,
  ModerateAdminCommentParams,
  ModerateAdminCommentResponse,
  ModerateAdminPostBody,
  ModerateAdminPostParams,
  ModerateAdminPostResponse,
  ResolveAdminReportBody,
  ResolveAdminReportParams,
  ResolveAdminReportResponse,
  TrackBannerEventBody,
  TrackBannerEventParams,
  TrackBannerEventResponse,
  UpdateAdminArticleBody,
  UpdateAdminArticleParams,
  UpdateAdminArticleResponse,
  UpdateAdminBannerBody,
  UpdateAdminBannerParams,
  UpdateAdminBannerResponse,
  UpdateAdminUserBody,
  UpdateAdminUserParams,
  UpdateAdminUserResponse,
} from "@workspace/api-zod";
import { isOwner, requireAdmin } from "../lib/viewer";

const router: IRouter = Router();
const validUrl = (value: string): string | undefined => {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};
const validSlug = (value: string): string | undefined => {
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : undefined;
};
const toIso = (value: Date | null | undefined): string | null => value ? value.toISOString() : null;
const parsePlacements = (value: string): ("room" | "explore" | "journal")[] => {
  try {
    const items = JSON.parse(value);
    return Array.isArray(items) ? items.filter((item): item is "room" | "explore" | "journal" => ["room", "explore", "journal"].includes(item)) : ["room"];
  } catch {
    return value.split(",").filter((item): item is "room" | "explore" | "journal" => ["room", "explore", "journal"].includes(item));
  }
};
const parseDate = (value: string | Date | null | undefined): Date | null | undefined => {
  if (value === null) return null;
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? undefined : value;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date;
};
const bannerEventBuckets = new Map<string, { count: number; resetAt: number }>();
const bannerVisitorSecret = (() => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for banner event attribution.");
  return secret;
})();

function signBannerVisitor(visitorId: string, expiresAt: number): string {
  return createHmac("sha256", bannerVisitorSecret).update(`${visitorId}.${expiresAt}`).digest("base64url");
}

function readBannerVisitorId(req: Request): string | undefined {
  const token = req.headers.cookie?.match(/(?:^|;\s*)omito_banner_visitor=([^;]+)/)?.[1];
  if (!token) return undefined;
  const [visitorId, expiryText, signature] = token.split(".");
  const expiresAt = Number(expiryText);
  if (!visitorId || !signature || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !/^[a-zA-Z0-9-]{16,80}$/.test(visitorId)) return undefined;
  const expected = signBannerVisitor(visitorId, expiresAt);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return undefined;
  return visitorId;
}

function issueBannerVisitorId(req: Request, res: Response): string {
  const existing = readBannerVisitorId(req);
  if (existing) return existing;
  const visitorId = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const token = `${visitorId}.${expiresAt}.${signBannerVisitor(visitorId, expiresAt)}`;
  res.cookie("omito_banner_visitor", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 * 30, path: "/" });
  return visitorId;
}

function canRecordBannerEvent(req: Request): boolean {
  const now = Date.now();
  const key = req.ip || "unknown";
  const bucket = bannerEventBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bannerEventBuckets.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (bucket.count >= 20) return false;
  bucket.count += 1;
  return true;
}

function publicUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    category: user.category as "influencer" | "bartender" | "everyone",
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    basicInfo: user.basicInfo,
    followers: user.followers,
    isFollowing: false,
  };
}

async function audit(actorId: number, action: string, targetType: string, targetId: number | null, summary: string) {
  await db.insert(auditLogsTable).values({ actorId, action, targetType, targetId, summary });
}

async function auditShape(item: typeof auditLogsTable.$inferSelect) {
  const [actor] = item.actorId ? await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, item.actorId)) : [];
  return {
    id: item.id,
    actor: actor?.username ?? null,
    action: item.action,
    targetType: item.targetType,
    targetId: item.targetId,
    summary: item.summary,
    createdAt: item.createdAt.toISOString(),
  };
}

async function adminUserShape(user: typeof usersTable.$inferSelect) {
  const [postTotal] = await db.select({ value: count() }).from(postsTable).where(eq(postsTable.authorId, user.id));
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    basicInfo: user.basicInfo,
    category: user.category as "influencer" | "bartender" | "everyone",
    adminRole: (user.adminRole === "owner" || user.adminRole === "admin" ? user.adminRole : "member") as "member" | "admin" | "owner",
    accountStatus: (user.accountStatus === "suspended" ? "suspended" : "active") as "active" | "suspended",
    suspensionReason: user.suspensionReason,
    followers: user.followers,
    posts: Number(postTotal?.value ?? 0),
    createdAt: user.createdAt.toISOString(),
  };
}

async function adminPostShape(post: typeof postsTable.$inferSelect, author: typeof usersTable.$inferSelect) {
  const [[likeTotal], [commentTotal]] = await Promise.all([
    db.select({ value: count() }).from(likesTable).where(eq(likesTable.postId, post.id)),
    db.select({ value: count() }).from(commentsTable).where(eq(commentsTable.postId, post.id)),
  ]);
  return {
    id: post.id,
    author: publicUser(author),
    caption: post.caption,
    imageUrl: post.imageUrl,
    category: post.category as "influencer" | "bartender" | "everyone",
    location: post.location,
    likes: Number(likeTotal?.value ?? 0),
    comments: Number(commentTotal?.value ?? 0),
    moderationStatus: (post.moderationStatus === "hidden" ? "hidden" : "visible") as "visible" | "hidden",
    moderationReason: post.moderationReason,
    createdAt: post.createdAt.toISOString(),
  };
}

function adminCommentShape(comment: typeof commentsTable.$inferSelect, author: typeof usersTable.$inferSelect) {
  return {
    id: comment.id,
    postId: comment.postId,
    author: publicUser(author),
    body: comment.body,
    moderationStatus: (comment.moderationStatus === "hidden" ? "hidden" : "visible") as "visible" | "hidden",
    moderationReason: comment.moderationReason,
    createdAt: comment.createdAt.toISOString(),
  };
}

async function adminBannerShape(banner: typeof bannersTable.$inferSelect) {
  const events = await db.select({ eventType: bannerEventsTable.eventType }).from(bannerEventsTable).where(eq(bannerEventsTable.bannerId, banner.id));
  return {
    id: banner.id,
    title: banner.title,
    body: banner.body,
    imageUrl: banner.imageUrl,
    destinationUrl: banner.destinationUrl,
    placements: parsePlacements(banner.placements),
    displayOrder: banner.displayOrder,
    isActive: banner.isActive,
    startsAt: toIso(banner.startsAt),
    endsAt: toIso(banner.endsAt),
    impressions: events.filter((event) => event.eventType === "impression").length,
    clicks: events.filter((event) => event.eventType === "click").length,
    createdAt: banner.createdAt.toISOString(),
  };
}

function articleShape(article: typeof articlesTable.$inferSelect, author: typeof usersTable.$inferSelect) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    body: article.body,
    coverImageUrl: article.coverImageUrl,
    publishedAt: article.publishedAt.toISOString(),
    author: publicUser(author),
    status: (["draft", "hidden"].includes(article.status) ? article.status : "published") as "draft" | "published" | "hidden",
    updatedAt: article.updatedAt.toISOString(),
  };
}

router.get("/admin/dashboard", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  if (!viewer) return;
  const [[users], [posts], [comments], [follows], [activeBanners], [openReports], events] = await Promise.all([
    db.select({ value: count() }).from(usersTable),
    db.select({ value: count() }).from(postsTable),
    db.select({ value: count() }).from(commentsTable),
    db.select({ value: count() }).from(followsTable),
    db.select({ value: count() }).from(bannersTable).where(eq(bannersTable.isActive, true)),
    db.select({ value: count() }).from(reportsTable).where(eq(reportsTable.status, "open")),
    db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(8),
  ]);
  res.json(GetAdminDashboardResponse.parse({
    users: Number(users?.value ?? 0),
    posts: Number(posts?.value ?? 0),
    comments: Number(comments?.value ?? 0),
    followers: Number(follows?.value ?? 0),
    activeBanners: Number(activeBanners?.value ?? 0),
    openReports: Number(openReports?.value ?? 0),
    recentActivity: await Promise.all(events.map(auditShape)),
  }));
});

router.get("/admin/users", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  const parsed = GetAdminUsersQueryParams.safeParse(req.query);
  if (!viewer) return;
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const term = parsed.data.q?.trim();
  const rows = await db.select().from(usersTable).where(term ? or(ilike(usersTable.username, `%${term}%`), ilike(usersTable.displayName, `%${term}%`)) : undefined).orderBy(desc(usersTable.createdAt));
  res.json(GetAdminUsersResponse.parse(await Promise.all(rows.map(adminUserShape))));
});

router.patch("/admin/users/:id", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  const params = UpdateAdminUserParams.safeParse(req.params);
  const body = UpdateAdminUserBody.safeParse(req.body);
  if (!viewer) return;
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid member update." }); return; }
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!target) { res.status(404).json({ error: "Member not found." }); return; }
  if (target.adminRole === "owner") { res.status(403).json({ error: "The Owner account cannot be changed from the panel." }); return; }
  if (body.data.adminRole !== undefined && !isOwner(viewer)) { res.status(403).json({ error: "Only the Owner can manage administrator roles." }); return; }
  const updates: Record<string, unknown> = {};
  if (body.data.displayName !== undefined) updates.displayName = body.data.displayName.trim();
  if (body.data.bio !== undefined) updates.bio = body.data.bio.trim();
  if (body.data.basicInfo !== undefined) updates.basicInfo = body.data.basicInfo.trim();
  if (body.data.category !== undefined) updates.category = body.data.category;
  if (body.data.adminRole !== undefined) {
    updates.adminRole = body.data.adminRole;
    updates.isAdmin = body.data.adminRole === "admin";
  }
  if (body.data.accountStatus !== undefined) {
    updates.accountStatus = body.data.accountStatus;
    updates.suspendedAt = body.data.accountStatus === "suspended" ? new Date() : null;
    updates.suspensionReason = body.data.accountStatus === "suspended" ? (body.data.suspensionReason?.trim() || "Suspended by administration") : null;
  }
  const [updated] = Object.keys(updates).length
    ? await db.update(usersTable).set(updates).where(eq(usersTable.id, target.id)).returning()
    : [target];
  await audit(viewer.id, "member_updated", "user", target.id, `Updated @${target.username}`);
  res.json(UpdateAdminUserResponse.parse(await adminUserShape(updated)));
});

router.get("/admin/posts", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  const parsed = GetAdminPostsQueryParams.safeParse(req.query);
  if (!viewer) return;
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const status = parsed.data.status;
  const term = parsed.data.q?.trim();
  const rows = await db.select({ post: postsTable, author: usersTable }).from(postsTable).innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(and(status && status !== "all" ? eq(postsTable.moderationStatus, status) : undefined, term ? ilike(postsTable.caption, `%${term}%`) : undefined)).orderBy(desc(postsTable.createdAt));
  res.json(GetAdminPostsResponse.parse(await Promise.all(rows.map(({ post, author }) => adminPostShape(post, author)))));
});

router.patch("/admin/posts/:id", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  const params = ModerateAdminPostParams.safeParse(req.params);
  const body = ModerateAdminPostBody.safeParse(req.body);
  if (!viewer) return;
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid post moderation request." }); return; }
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  if (!post) { res.status(404).json({ error: "Post not found." }); return; }
  const [updated] = await db.update(postsTable).set({
    moderationStatus: body.data.status,
    moderationReason: body.data.status === "hidden" ? (body.data.reason?.trim() || "Hidden by administration") : null,
    moderatedAt: new Date(),
  }).where(eq(postsTable.id, post.id)).returning();
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, updated.authorId));
  if (!author) { res.status(404).json({ error: "Post author not found." }); return; }
  await audit(viewer.id, body.data.status === "hidden" ? "post_hidden" : "post_restored", "post", updated.id, `${body.data.status === "hidden" ? "Hidden" : "Restored"} post ${updated.id}`);
  res.json(ModerateAdminPostResponse.parse(await adminPostShape(updated, author)));
});

router.get("/admin/comments", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  const parsed = GetAdminCommentsQueryParams.safeParse(req.query);
  if (!viewer) return;
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const status = parsed.data.status;
  const term = parsed.data.q?.trim();
  const rows = await db.select({ comment: commentsTable, author: usersTable }).from(commentsTable).innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
    .where(and(status && status !== "all" ? eq(commentsTable.moderationStatus, status) : undefined, term ? ilike(commentsTable.body, `%${term}%`) : undefined)).orderBy(desc(commentsTable.createdAt));
  res.json(GetAdminCommentsResponse.parse(rows.map(({ comment, author }) => adminCommentShape(comment, author))));
});

router.patch("/admin/comments/:id", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  const params = ModerateAdminCommentParams.safeParse(req.params);
  const body = ModerateAdminCommentBody.safeParse(req.body);
  if (!viewer) return;
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid comment moderation request." }); return; }
  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, params.data.id));
  if (!comment) { res.status(404).json({ error: "Comment not found." }); return; }
  const [updated] = await db.update(commentsTable).set({
    moderationStatus: body.data.status,
    moderationReason: body.data.status === "hidden" ? (body.data.reason?.trim() || "Hidden by administration") : null,
    moderatedAt: new Date(),
  }).where(eq(commentsTable.id, comment.id)).returning();
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, updated.authorId));
  if (!author) { res.status(404).json({ error: "Comment author not found." }); return; }
  await audit(viewer.id, body.data.status === "hidden" ? "comment_hidden" : "comment_restored", "comment", updated.id, `${body.data.status === "hidden" ? "Hidden" : "Restored"} comment ${updated.id}`);
  res.json(ModerateAdminCommentResponse.parse(adminCommentShape(updated, author)));
});

router.get("/admin/banners", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  if (!viewer) return;
  const rows = await db.select().from(bannersTable).orderBy(desc(bannersTable.createdAt));
  res.json(GetAdminBannersResponse.parse(await Promise.all(rows.map(adminBannerShape))));
});

router.post("/admin/banners", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  const body = CreateAdminBannerBody.safeParse(req.body);
  if (!viewer) return;
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const imageUrl = validUrl(body.data.imageUrl);
  const destinationUrl = validUrl(body.data.destinationUrl);
  const startsAt = parseDate(body.data.startsAt);
  const endsAt = parseDate(body.data.endsAt);
  if (!imageUrl || !destinationUrl || (body.data.startsAt && !startsAt) || (body.data.endsAt && !endsAt)) { res.status(400).json({ error: "Use valid image, destination, and schedule URLs/dates." }); return; }
  if (startsAt && endsAt && startsAt > endsAt) { res.status(400).json({ error: "The campaign end must be after its start." }); return; }
  const [banner] = await db.insert(bannersTable).values({
    title: body.data.title.trim(), body: body.data.body?.trim() || "", imageUrl, destinationUrl,
    placements: JSON.stringify(body.data.placements), displayOrder: body.data.displayOrder ?? 0,
    isActive: body.data.isActive ?? true, startsAt: startsAt ?? null, endsAt: endsAt ?? null, createdById: viewer.id,
  }).returning();
  await audit(viewer.id, "banner_created", "banner", banner.id, `Created banner ${banner.title}`);
  res.status(201).json(CreateAdminBannerResponse.parse(await adminBannerShape(banner)));
});

router.patch("/admin/banners/:id", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  const params = UpdateAdminBannerParams.safeParse(req.params);
  const body = UpdateAdminBannerBody.safeParse(req.body);
  if (!viewer) return;
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid banner update." }); return; }
  const [banner] = await db.select().from(bannersTable).where(eq(bannersTable.id, params.data.id));
  if (!banner) { res.status(404).json({ error: "Banner not found." }); return; }
  const updates: Record<string, unknown> = {};
  if (body.data.title !== undefined) updates.title = body.data.title.trim();
  if (body.data.body !== undefined) updates.body = body.data.body.trim();
  if (body.data.imageUrl !== undefined) { const imageUrl = validUrl(body.data.imageUrl); if (!imageUrl) { res.status(400).json({ error: "Use a valid image URL." }); return; } updates.imageUrl = imageUrl; }
  if (body.data.destinationUrl !== undefined) { const destinationUrl = validUrl(body.data.destinationUrl); if (!destinationUrl) { res.status(400).json({ error: "Use a valid destination URL." }); return; } updates.destinationUrl = destinationUrl; }
  if (body.data.placements !== undefined) updates.placements = JSON.stringify(body.data.placements);
  if (body.data.displayOrder !== undefined) updates.displayOrder = body.data.displayOrder;
  if (body.data.isActive !== undefined) updates.isActive = body.data.isActive;
  if (body.data.startsAt !== undefined) { const date = parseDate(body.data.startsAt); if (body.data.startsAt && !date) { res.status(400).json({ error: "Use a valid start date." }); return; } updates.startsAt = date; }
  if (body.data.endsAt !== undefined) { const date = parseDate(body.data.endsAt); if (body.data.endsAt && !date) { res.status(400).json({ error: "Use a valid end date." }); return; } updates.endsAt = date; }
  const nextStart = updates.startsAt === undefined ? banner.startsAt : updates.startsAt as Date | null;
  const nextEnd = updates.endsAt === undefined ? banner.endsAt : updates.endsAt as Date | null;
  if (nextStart && nextEnd && nextStart > nextEnd) { res.status(400).json({ error: "The campaign end must be after its start." }); return; }
  const [updated] = await db.update(bannersTable).set(updates).where(eq(bannersTable.id, banner.id)).returning();
  await audit(viewer.id, "banner_updated", "banner", banner.id, `Updated banner ${updated.title}`);
  res.json(UpdateAdminBannerResponse.parse(await adminBannerShape(updated)));
});

router.get("/admin/articles", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  if (!viewer) return;
  const rows = await db.select({ article: articlesTable, author: usersTable }).from(articlesTable).innerJoin(usersTable, eq(articlesTable.authorId, usersTable.id)).orderBy(desc(articlesTable.updatedAt));
  res.json(GetAdminArticlesResponse.parse(rows.map(({ article, author }) => articleShape(article, author))));
});

router.post("/admin/articles", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  const body = CreateAdminArticleBody.safeParse(req.body);
  if (!viewer) return;
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const slug = validSlug(body.data.slug);
  const coverImageUrl = validUrl(body.data.coverImageUrl);
  if (!slug || !coverImageUrl) { res.status(400).json({ error: "Use a URL-safe slug and a valid cover image URL." }); return; }
  const [article] = await db.insert(articlesTable).values({
    authorId: viewer.id, slug, title: body.data.title.trim(), excerpt: body.data.excerpt.trim(), body: body.data.body.trim(), coverImageUrl, status: body.data.status ?? "draft",
  }).returning();
  await audit(viewer.id, "article_created", "article", article.id, `Created article ${article.title}`);
  res.status(201).json(CreateAdminArticleResponse.parse(articleShape(article, viewer)));
});

router.patch("/admin/articles/:id", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  const params = UpdateAdminArticleParams.safeParse(req.params);
  const body = UpdateAdminArticleBody.safeParse(req.body);
  if (!viewer) return;
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid article update." }); return; }
  const [article] = await db.select().from(articlesTable).where(eq(articlesTable.id, params.data.id));
  if (!article) { res.status(404).json({ error: "Article not found." }); return; }
  const updates: Record<string, unknown> = {};
  if (body.data.slug !== undefined) { const slug = validSlug(body.data.slug); if (!slug) { res.status(400).json({ error: "Use a URL-safe slug." }); return; } updates.slug = slug; }
  if (body.data.title !== undefined) updates.title = body.data.title.trim();
  if (body.data.excerpt !== undefined) updates.excerpt = body.data.excerpt.trim();
  if (body.data.body !== undefined) updates.body = body.data.body.trim();
  if (body.data.coverImageUrl !== undefined) { const url = validUrl(body.data.coverImageUrl); if (!url) { res.status(400).json({ error: "Use a valid cover image URL." }); return; } updates.coverImageUrl = url; }
  if (body.data.status !== undefined) updates.status = body.data.status;
  const [updated] = await db.update(articlesTable).set(updates).where(eq(articlesTable.id, article.id)).returning();
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, updated.authorId));
  if (!author) { res.status(404).json({ error: "Article author not found." }); return; }
  await audit(viewer.id, "article_updated", "article", updated.id, `Updated article ${updated.title}`);
  res.json(UpdateAdminArticleResponse.parse(articleShape(updated, author)));
});

router.get("/admin/reports", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  if (!viewer) return;
  const rows = await db.select({ report: reportsTable, reporter: usersTable.username }).from(reportsTable).leftJoin(usersTable, eq(reportsTable.reporterId, usersTable.id)).orderBy(desc(reportsTable.createdAt));
  res.json(GetAdminReportsResponse.parse(rows.map(({ report, reporter }) => ({
    id: report.id, targetType: report.targetType, targetId: report.targetId, reason: report.reason,
    status: report.status === "resolved" ? "resolved" : "open", resolution: report.resolution,
    reporter: reporter ?? null, createdAt: report.createdAt.toISOString(), resolvedAt: toIso(report.resolvedAt),
  }))));
});

router.patch("/admin/reports/:id", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  const params = ResolveAdminReportParams.safeParse(req.params);
  const body = ResolveAdminReportBody.safeParse(req.body);
  if (!viewer) return;
  if (!params.success || !body.success) { res.status(400).json({ error: "A resolution is required." }); return; }
  const [report] = await db.update(reportsTable).set({ status: "resolved", resolution: body.data.resolution.trim(), resolvedById: viewer.id, resolvedAt: new Date() }).where(eq(reportsTable.id, params.data.id)).returning();
  if (!report) { res.status(404).json({ error: "Report not found." }); return; }
  const [reporter] = report.reporterId ? await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, report.reporterId)) : [];
  await audit(viewer.id, "report_resolved", "report", report.id, `Resolved report ${report.id}`);
  res.json(ResolveAdminReportResponse.parse({
    id: report.id, targetType: report.targetType, targetId: report.targetId, reason: report.reason, status: "resolved",
    resolution: report.resolution, reporter: reporter?.username ?? null, createdAt: report.createdAt.toISOString(), resolvedAt: toIso(report.resolvedAt),
  }));
});

router.get("/admin/audit", async (req, res): Promise<void> => {
  const viewer = await requireAdmin(req, res);
  if (!viewer) return;
  const rows = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(100);
  res.json(GetAdminAuditResponse.parse(await Promise.all(rows.map(auditShape))));
});

router.get("/banners", async (req, res): Promise<void> => {
  const params = GetActiveBannersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  issueBannerVisitorId(req, res);
  const now = new Date();
  const rows = await db.select().from(bannersTable).where(eq(bannersTable.isActive, true)).orderBy(desc(bannersTable.displayOrder), desc(bannersTable.createdAt));
  const active = rows.filter((banner) => {
    const placements = parsePlacements(banner.placements);
    return placements.includes(params.data.placement) && (!banner.startsAt || banner.startsAt <= now) && (!banner.endsAt || banner.endsAt >= now);
  }).map((banner) => ({
    id: banner.id, title: banner.title, body: banner.body, imageUrl: banner.imageUrl, destinationUrl: banner.destinationUrl,
    placements: parsePlacements(banner.placements), displayOrder: banner.displayOrder,
  }));
  res.json(GetActiveBannersResponse.parse(active));
});

router.post("/banners/:id/events", async (req, res): Promise<void> => {
  const params = TrackBannerEventParams.safeParse(req.params);
  const body = TrackBannerEventBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid banner event." }); return; }
  const [banner] = await db.select().from(bannersTable).where(eq(bannersTable.id, params.data.id));
  const now = new Date();
  if (!banner || !banner.isActive || !parsePlacements(banner.placements).includes(body.data.placement) || (banner.startsAt && banner.startsAt > now) || (banner.endsAt && banner.endsAt < now)) {
    res.status(404).json({ error: "Active banner not found." });
    return;
  }
  const visitorId = readBannerVisitorId(req);
  if (!visitorId) { res.status(403).json({ error: "Load active banners before tracking an event." }); return; }
  if (!canRecordBannerEvent(req)) { res.status(429).json({ error: "Too many banner events. Try again later." }); return; }
  const [event] = await db.insert(bannerEventsTable).values({ bannerId: banner.id, eventType: body.data.eventType, visitorId }).onConflictDoNothing().returning();
  if (!event) {
    const [existing] = await db.select().from(bannerEventsTable).where(and(eq(bannerEventsTable.bannerId, banner.id), eq(bannerEventsTable.eventType, body.data.eventType), eq(bannerEventsTable.visitorId, visitorId)));
    if (!existing) { res.status(409).json({ error: "Banner event could not be recorded." }); return; }
    res.status(201).json(TrackBannerEventResponse.parse({ id: existing.id, bannerId: existing.bannerId, eventType: existing.eventType, createdAt: existing.createdAt.toISOString() }));
    return;
  }
  res.status(201).json(TrackBannerEventResponse.parse({ id: event.id, bannerId: event.bannerId, eventType: event.eventType, createdAt: event.createdAt.toISOString() }));
});

export default router;