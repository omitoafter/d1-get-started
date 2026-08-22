import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, articlesTable, usersTable } from "@workspace/db";
import { GetBlogArticleParams, GetBlogArticleResponse, GetBlogResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function articleShape(article: typeof articlesTable.$inferSelect, author: typeof usersTable.$inferSelect) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    body: article.body,
    coverImageUrl: article.coverImageUrl,
    publishedAt: article.publishedAt.toISOString(),
    author: {
      id: author.id,
      username: author.username,
      displayName: author.displayName,
      category: author.category as "influencer" | "bartender" | "everyone",
      avatarUrl: author.avatarUrl,
      bio: author.bio,
      basicInfo: author.basicInfo,
      followers: author.followers,
      isFollowing: false,
    },
  };
}

router.get("/blog", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ article: articlesTable, author: usersTable })
    .from(articlesTable)
    .innerJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(and(eq(articlesTable.status, "published"), eq(usersTable.accountStatus, "active")))
    .orderBy(desc(articlesTable.publishedAt));
  res.json(GetBlogResponse.parse(rows.map(({ article, author }) => articleShape(article, author))));
});

router.get("/blog/:slug", async (req, res): Promise<void> => {
  const parsed = GetBlogArticleParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .select({ article: articlesTable, author: usersTable })
    .from(articlesTable)
    .innerJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(and(eq(articlesTable.slug, parsed.data.slug), eq(articlesTable.status, "published"), eq(usersTable.accountStatus, "active")));
  if (!row) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(GetBlogArticleResponse.parse(articleShape(row.article, row.author)));
});

export default router;