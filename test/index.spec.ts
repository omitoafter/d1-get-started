import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const api = (path: string, init?: RequestInit) =>
  SELF.fetch(`https://example.com${path}`, init);

const readJson = <T>(response: Response) => response.json() as Promise<T>;

const jsonRequest = (body: unknown) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

beforeEach(async () => {
  await api("/api/posts?visitor_id=test-suite");
  await env.DB.exec(`
    DELETE FROM likes;
    DELETE FROM comments;
    DELETE FROM posts;
  `);
});

describe("BY OMITO", () => {
  it("serves the branded page", async () => {
    const response = await SELF.fetch("https://example.com/");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    await expect(response.text()).resolves.toContain("BY OMITO");
  });

  it("seeds and returns the community feed", async () => {
    const response = await api("/api/posts?visitor_id=test-suite");
    const body = await readJson<{ success: boolean; posts: Array<{ id: number }> }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.posts).toHaveLength(2);
  });

  it("creates a post and includes it in the feed", async () => {
    const create = await api(
      "/api/post",
      jsonRequest({ category: "bartender", title: "Prueba AFTER", body: "Una publicación real." }),
    );
    const created = await readJson<{ id: number }>(create);
    const feed = await api("/api/posts?visitor_id=test-suite");
    const body = await readJson<{ posts: Array<{ id: number; title: string }> }>(feed);

    expect(create.status).toBe(201);
    expect(created.id).toBeTypeOf("number");
    expect(body.posts.some((post) => post.title === "Prueba AFTER")).toBe(true);
  });

  it("toggles likes and saves comments for an existing post", async () => {
    const feed = await api("/api/posts?visitor_id=test-suite");
    const { posts } = await readJson<{ posts: Array<{ id: number }> }>(feed);
    const postId = posts[0].id;

    const liked = await api("/api/like", jsonRequest({ post_id: postId, visitor_id: "reader-1" }));
    const likedBody = await readJson<{ liked: boolean; likes: number }>(liked);
    const unliked = await api("/api/like", jsonRequest({ post_id: postId, visitor_id: "reader-1" }));
    const unlikedBody = await readJson<{ liked: boolean; likes: number }>(unliked);
    const comment = await api(
      "/api/comment",
      jsonRequest({ post_id: postId, visitor_id: "reader-1", name: "Omito", comment: "Excelente." }),
    );
    const commentBody = await readJson<{ comments: Array<{ comment: string }> }>(comment);

    expect(likedBody).toMatchObject({ liked: true, likes: 1 });
    expect(unlikedBody).toMatchObject({ liked: false, likes: 0 });
    expect(comment.status).toBe(201);
    expect(commentBody.comments[0].comment).toBe("Excelente.");
  });

  it("rejects invalid writes and missing posts", async () => {
    const invalidPost = await api("/api/post", jsonRequest({ title: "", body: "" }));
    const missingComment = await api(
      "/api/comment",
      jsonRequest({ post_id: 99999, visitor_id: "reader-1", comment: "Hola" }),
    );

    expect(invalidPost.status).toBe(400);
    expect(missingComment.status).toBe(404);
  });
});