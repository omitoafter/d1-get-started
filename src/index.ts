export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

type PostCategory = "influencer" | "bartender";

type PostRow = {
  id: number;
  category: PostCategory;
  title: string;
  body: string;
  emoji: string;
  created_at: string;
  likes: number;
  comments: number;
  liked: number;
};

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=UTF-8",
    },
  });

const error = (message: string, status: number) =>
  json({ success: false, error: message }, status);

const databaseSchema = `
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK (category IN ('influencer', 'bartender')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '✦',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    visitor_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, visitor_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    visitor_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Invitado',
    comment TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
  CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
`;

async function ensureDatabase(db: D1Database) {
  await db.exec(databaseSchema);

  const postCount = await db
    .prepare("SELECT COUNT(*) AS count FROM posts")
    .first<{ count: number }>();

  if (Number(postCount?.count ?? 0) > 0) return;

  await db.batch([
    db
      .prepare(
        "INSERT INTO posts (category, title, body, emoji) VALUES (?, ?, ?, ?)",
      )
      .bind(
        "influencer",
        "Las voces que mueven la noche",
        "Perfiles, lugares y momentos que están definiendo el AFTER.",
        "✦",
      ),
    db
      .prepare(
        "INSERT INTO posts (category, title, body, emoji) VALUES (?, ?, ?, ?)",
      )
      .bind(
        "bartender",
        "Detrás de la barra",
        "Coctelería, energía y las personas que hacen inolvidable cada noche.",
        "◈",
      ),
  ]);
}

function validVisitorId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 128;
}

function validPostId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

async function findPost(db: D1Database, id: number) {
  return db.prepare("SELECT id FROM posts WHERE id = ?").bind(id).first<{ id: number }>();
}

async function getPosts(db: D1Database, visitorId: string) {
  const response = await db
    .prepare(
      `
        SELECT
          p.id,
          p.category,
          p.title,
          p.body,
          p.emoji,
          p.created_at,
          (SELECT COUNT(*) FROM likes AS l WHERE l.post_id = p.id) AS likes,
          (SELECT COUNT(*) FROM comments AS c WHERE c.post_id = p.id) AS comments,
          EXISTS(
            SELECT 1
            FROM likes AS mine
            WHERE mine.post_id = p.id AND mine.visitor_id = ?
          ) AS liked
        FROM posts AS p
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT 50
      `,
    )
    .bind(visitorId)
    .all<PostRow>();

  const posts = await Promise.all(
    response.results.map(async (post) => {
      const comments = await db
        .prepare(
          `
            SELECT id, name, comment, created_at
            FROM comments
            WHERE post_id = ?
            ORDER BY created_at ASC, id ASC
            LIMIT 30
          `,
        )
        .bind(post.id)
        .all();

      return { ...post, commentsList: comments.results };
    }),
  );

  return posts;
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  await ensureDatabase(env.DB);

  if (url.pathname === "/api/posts" && request.method === "GET") {
    const visitorId = url.searchParams.get("visitor_id") ?? "guest";
    if (!validVisitorId(visitorId)) return error("Visitante inválido.", 400);

    return json({ success: true, posts: await getPosts(env.DB, visitorId) });
  }

  if (url.pathname === "/api/post" && request.method === "POST") {
    const body = await parseBody(request);
    if (!body) return error("El cuerpo de la solicitud no es válido.", 400);

    const category: PostCategory = body.category === "bartender" ? "bartender" : "influencer";
    const title = String(body.title ?? "").trim();
    const content = String(body.body ?? "").trim();
    const emoji = String(body.emoji ?? (category === "bartender" ? "◈" : "✦"))
      .trim()
      .slice(0, 8);

    if (!title || !content) return error("Completa el título y el texto.", 400);
    if (title.length > 120 || content.length > 3000) {
      return error("El texto es demasiado largo.", 400);
    }

    const inserted = await env.DB
      .prepare("INSERT INTO posts (category, title, body, emoji) VALUES (?, ?, ?, ?)")
      .bind(category, title, content, emoji || "✦")
      .run();

    return json({ success: true, id: inserted.meta.last_row_id }, 201);
  }

  if (url.pathname === "/api/like" && request.method === "POST") {
    const body = await parseBody(request);
    const postId = Number(body?.post_id);
    const visitorId = typeof body?.visitor_id === "string" ? body.visitor_id.trim() : "";

    if (!validPostId(postId) || !validVisitorId(visitorId)) {
      return error("Datos de Like inválidos.", 400);
    }
    if (!(await findPost(env.DB, postId))) return error("La publicación no existe.", 404);

    const existing = await env.DB
      .prepare("SELECT id FROM likes WHERE post_id = ? AND visitor_id = ?")
      .bind(postId, visitorId)
      .first();

    if (existing) {
      await env.DB
        .prepare("DELETE FROM likes WHERE post_id = ? AND visitor_id = ?")
        .bind(postId, visitorId)
        .run();
    } else {
      await env.DB
        .prepare("INSERT OR IGNORE INTO likes (post_id, visitor_id) VALUES (?, ?)")
        .bind(postId, visitorId)
        .run();
    }

    const total = await env.DB
      .prepare("SELECT COUNT(*) AS likes FROM likes WHERE post_id = ?")
      .bind(postId)
      .first<{ likes: number }>();

    return json({
      success: true,
      liked: !existing,
      likes: Number(total?.likes ?? 0),
    });
  }

  if (url.pathname === "/api/comment" && request.method === "POST") {
    const body = await parseBody(request);
    const postId = Number(body?.post_id);
    const visitorId = typeof body?.visitor_id === "string" ? body.visitor_id.trim() : "";
    const name = String(body?.name ?? "Invitado").trim().slice(0, 40) || "Invitado";
    const comment = String(body?.comment ?? "").trim();

    if (!validPostId(postId) || !validVisitorId(visitorId)) {
      return error("Datos del comentario inválidos.", 400);
    }
    if (!comment) return error("Escribe un comentario.", 400);
    if (comment.length > 1000) return error("El comentario es demasiado largo.", 400);
    if (!(await findPost(env.DB, postId))) return error("La publicación no existe.", 404);

    await env.DB
      .prepare(
        "INSERT INTO comments (post_id, visitor_id, name, comment) VALUES (?, ?, ?, ?)",
      )
      .bind(postId, visitorId, name, comment)
      .run();

    const comments = await env.DB
      .prepare(
        `
          SELECT id, name, comment, created_at
          FROM comments
          WHERE post_id = ?
          ORDER BY created_at ASC, id ASC
          LIMIT 30
        `,
      )
      .bind(postId)
      .all();

    return json({ success: true, comments: comments.results }, 201);
  }

  return error("Ruta API no encontrada.", 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Método no permitido.", {
          status: 405,
          headers: { Allow: "GET, HEAD" },
        });
      }

      return env.ASSETS.fetch(request);
    } catch (cause) {
      console.error("BY OMITO Worker error", cause);
      return url.pathname.startsWith("/api/")
        ? error("Error del servidor. Inténtalo de nuevo.", 500)
        : new Response("Error del servidor.", { status: 500 });
    }
  },
};