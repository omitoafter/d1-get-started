export interface Env {
  DB: D1Database;
}

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
    },
  });

async function setupDB(db: D1Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'influencer',
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '✨',
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

    CREATE INDEX IF NOT EXISTS idx_likes_post
    ON likes(post_id);

    CREATE INDEX IF NOT EXISTS idx_comments_post
    ON comments(post_id);
  `);

  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM posts")
    .first<{ count: number }>();

  if (!count || Number(count.count) === 0) {
    await db.batch([
      db.prepare(
        "INSERT INTO posts (category,title,body,emoji) VALUES (?,?,?,?)"
      ).bind(
        "influencer",
        "Influencers",
        "Los influencers que están marcando la noche, las tendencias y todo lo que pasa AFTER.",
        "✨"
      ),

      db.prepare(
        "INSERT INTO posts (category,title,body,emoji) VALUES (?,?,?,?)"
      ).bind(
        "bartender",
        "Bartenders",
        "Los bartenders que están convirtiendo la noche en una experiencia.",
        "🍸"
      ),
    ]);
  }
}

async function getPosts(db: D1Database, visitorId: string) {
  const posts = await db
    .prepare(`
      SELECT
        p.id,
        p.category,
        p.title,
        p.body,
        p.emoji,
        p.created_at,

        (
          SELECT COUNT(*)
          FROM likes l
          WHERE l.post_id = p.id
        ) AS likes,

        (
          SELECT COUNT(*)
          FROM comments c
          WHERE c.post_id = p.id
        ) AS comments,

        EXISTS(
          SELECT 1
          FROM likes ml
          WHERE ml.post_id = p.id
          AND ml.visitor_id = ?
        ) AS liked

      FROM posts p
      ORDER BY p.id DESC
    `)
    .bind(visitorId)
    .all();

  const result = [];

  for (const post of posts.results as any[]) {
    const comments = await db
      .prepare(`
        SELECT
          id,
          name,
          comment,
          created_at
        FROM comments
        WHERE post_id = ?
        ORDER BY id ASC
        LIMIT 30
      `)
      .bind(post.id)
      .all();

    result.push({
      ...post,
      commentsList: comments.results,
    });
  }

  return result;
}
async function handleAPI(
  request: Request,
  env: Env,
  url: URL
) {
  await setupDB(env.DB);

  // =========================
  // OBTENER PUBLICACIONES
  // =========================

  if (
    url.pathname === "/api/posts" &&
    request.method === "GET"
  ) {
    const visitorId =
      url.searchParams.get("visitor_id") || "guest";

    const posts = await getPosts(
      env.DB,
      visitorId
    );

    return json({
      success: true,
      posts,
    });
  }

  // =========================
  // LIKE
  // =========================

  if (
    url.pathname === "/api/like" &&
    request.method === "POST"
  ) {
    const body = await request
      .json()
      .catch(() => null) as any;

    const postId = Number(body?.post_id);
    const visitorId =
      String(body?.visitor_id || "");

    if (
      !Number.isInteger(postId) ||
      !visitorId
    ) {
      return json(
        {
          success: false,
          error: "Datos de Like inválidos.",
        },
        400
      );
    }

    const existing =
      await env.DB
        .prepare(`
          SELECT id
          FROM likes
          WHERE post_id = ?
          AND visitor_id = ?
        `)
        .bind(
          postId,
          visitorId
        )
        .first();

    if (existing) {
      await env.DB
        .prepare(`
          DELETE FROM likes
          WHERE post_id = ?
          AND visitor_id = ?
        `)
        .bind(
          postId,
          visitorId
        )
        .run();
    } else {
      await env.DB
        .prepare(`
          INSERT OR IGNORE INTO likes
          (post_id, visitor_id)
          VALUES (?, ?)
        `)
        .bind(
          postId,
          visitorId
        )
        .run();
    }

    const total =
      await env.DB
        .prepare(`
          SELECT COUNT(*) AS likes
          FROM likes
          WHERE post_id = ?
        `)
        .bind(postId)
        .first<{ likes: number }>();

    return json({
      success: true,
      liked: !existing,
      likes: Number(
        total?.likes || 0
      ),
    });
  }

  // =========================
  // COMENTARIOS
  // =========================

  if (
    url.pathname === "/api/comment" &&
    request.method === "POST"
  ) {
    const body = await request
      .json()
      .catch(() => null) as any;

    const postId =
      Number(body?.post_id);

    const comment =
      String(
        body?.comment || ""
      ).trim();

    const visitorId =
      String(
        body?.visitor_id || ""
      ).trim();

    const name =
      String(
        body?.name || "Invitado"
      )
      .trim()
      .slice(0, 40) ||
      "Invitado";

    if (
      !Number.isInteger(postId) ||
      !visitorId
    ) {
      return json(
        {
          success: false,
          error:
            "Datos del comentario inválidos.",
        },
        400
      );
    }

    if (!comment) {
      return json(
        {
          success: false,
          error:
            "Escribe un comentario.",
        },
        400
      );
    }

    if (comment.length > 1000) {
      return json(
        {
          success: false,
          error:
            "El comentario es demasiado largo.",
        },
        400
      );
    }

    await env.DB
      .prepare(`
        INSERT INTO comments
        (
          post_id,
          visitor_id,
          name,
          comment
        )
        VALUES (?, ?, ?, ?)
      `)
      .bind(
        postId,
        visitorId,
        name,
        comment
      )
      .run();

    const comments =
      await env.DB
        .prepare(`
          SELECT
            id,
            name,
            comment,
            created_at
          FROM comments
          WHERE post_id = ?
          ORDER BY id ASC
          LIMIT 30
        `)
        .bind(postId)
        .all();

    return json({
      success: true,
      comments:
        comments.results,
    });
  }

  // =========================
  // CREAR PUBLICACIÓN
  // =========================

  if (
    url.pathname === "/api/post" &&
    request.method === "POST"
  ) {
    const body = await request
      .json()
      .catch(() => null) as any;

    const category =
      body?.category === "bartender"
        ? "bartender"
        : "influencer";

    const title =
      String(
        body?.title || ""
      ).trim();

    const text =
      String(
        body?.body || ""
      ).trim();

    const emoji =
      String(
        body?.emoji ||
        (
          category === "bartender"
            ? "🍸"
            : "✨"
        )
      ).slice(0, 8);

    if (!title || !text) {
      return json(
        {
          success: false,
          error:
            "Completa el título y el texto.",
        },
        400
      );
    }

    if (
      title.length > 120 ||
      text.length > 3000
    ) {
      return json(
        {
          success: false,
          error:
            "El texto es demasiado largo.",
        },
        400
      );
    }

    const inserted =
      await env.DB
        .prepare(`
          INSERT INTO posts
          (
            category,
            title,
            body,
            emoji
          )
          VALUES (?, ?, ?, ?)
        `)
        .bind(
          category,
          title,
          text,
          emoji
        )
        .run();

    return json({
      success: true,
      id:
        inserted.meta
          .last_row_id,
    });
  }

  return json(
    {
      success: false,
      error:
        "Ruta API no encontrada.",
    },
    404
  );
}
function pageHTML() {
  return `<!doctype html>
<html lang="es">

<head>
<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover"
>

<meta
  name="theme-color"
  content="#050505"
>

<title>AFTER — BY OMITO</title>

<style>

:root {
  --black: #050505;
  --panel: #0b0b0d;
  --green: #39ff14;
  --gold: #f5c542;
  --purple: #b64cff;
  --text: #f4f4f4;
  --muted: #999;
  --border: #29292d;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background:
    radial-gradient(
      circle at 85% 5%,
      rgba(182,76,255,.12),
      transparent 30%
    ),
    radial-gradient(
      circle at 5% 40%,
      rgba(57,255,20,.06),
      transparent 25%
    ),
    var(--black);

  color: var(--text);

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Arial,
    sans-serif;
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

/* =========================
   APP
========================= */

.app {
  width: min(100%, 1100px);
  margin: auto;
  padding: 14px 14px 100px;
}

/* =========================
   HEADER
========================= */

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;

  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 12px;

  padding: 13px 15px;
  margin-bottom: 15px;

  background: rgba(5,5,5,.95);

  backdrop-filter: blur(15px);

  border: 1px solid var(--border);

  border-radius: 18px;

  box-shadow:
    0 0 25px rgba(57,255,20,.04);
}

.brand {
  color: var(--gold);

  font-weight: 900;

  font-size: 27px;

  letter-spacing: 3px;
}

.brand small {
  display: block;

  color: var(--green);

  font-size: 10px;

  letter-spacing: 4px;

  margin-top: -2px;
}

.nav {
  display: flex;

  gap: 7px;

  overflow-x: auto;
}

.nav button {
  background: #0b0b0d;

  color: var(--muted);

  border: 1px solid #303035;

  border-radius: 12px;

  padding: 9px 12px;

  white-space: nowrap;
}

.nav button.active {
  color: white;

  border-color: var(--green);

  box-shadow:
    0 0 15px rgba(57,255,20,.18);
}

/* =========================
   HERO
========================= */

.hero {
  padding: 24px;

  margin-bottom: 16px;

  border-radius: 22px;

  border: 1px solid #333;

  background:
    radial-gradient(
      circle at 90% 50%,
      rgba(182,76,255,.25),
      transparent 30%
    ),
    #080808;
}

.hero h1 {
  margin: 0 0 8px;

  font-size: 28px;

  letter-spacing: 2px;
}

.hero h1 .green {
  color: var(--green);
}

.hero h1 .gold {
  color: var(--gold);
}

.hero p {
  margin: 0;

  color: #ccc;

  line-height: 1.6;
}

.hero-line {
  width: 190px;

  height: 2px;

  margin-top: 18px;

  background:
    linear-gradient(
      90deg,
      var(--green),
      var(--gold),
      var(--purple)
    );
}

/* =========================
   TOOLBAR
========================= */

.toolbar {
  display: flex;

  gap: 8px;

  margin: 12px 0 18px;

  flex-wrap: wrap;
}

.search {
  flex: 1;

  min-width: 180px;

  padding: 12px 13px;

  color: white;

  background: #0d0d0f;

  border: 1px solid #2d2d31;

  border-radius: 13px;

  outline: none;
}

.search:focus {
  border-color: var(--purple);
}

.new-post {
  background: #0b1309;

  color: var(--green);

  border: 1px solid var(--green);

  border-radius: 13px;

  padding: 10px 15px;

  font-weight: 800;
}

/* =========================
   CARDS
========================= */

.card {
  position: relative;

  overflow: hidden;

  margin-bottom: 15px;

  padding: 18px;

  background:
    linear-gradient(
      145deg,
      #0c0c0e,
      #070708
    );

  border: 1px solid #303035;

  border-radius: 20px;

  box-shadow:
    0 0 22px rgba(0,0,0,.35);
}

.card.bartender {
  border-color:
    rgba(182,76,255,.55);
}

.post-head {
  display: flex;

  align-items: center;

  gap: 12px;
}

.avatar {
  width: 48px;
  height: 48px;

  display: grid;

  place-items: center;

  border-radius: 50%;

  background: #111;

  border: 2px solid var(--green);

  font-size: 23px;
}

.card.bartender .avatar {
  border-color: var(--purple);
}

.name {
  font-weight: 800;
}

.verified {
  color: var(--green);
}

.role {
  margin-top: 3px;

  color: var(--muted);

  font-size: 13px;
}

.card h2 {
  margin: 16px 0 8px;

  font-size: 22px;
}

.card p {
  color: #ddd;

  font-size: 16px;

  line-height: 1.6;

  white-space: pre-wrap;
}

/* =========================
   ACTIONS
========================= */

.stats {
  display: flex;

  gap: 22px;

  padding: 11px 0;

  margin-top: 14px;

  border-top: 1px solid #242428;

  border-bottom: 1px solid #242428;
}

.like-button,
.comment-button {
  border: 0;

  background: transparent;

  padding: 5px 0;

  font-weight: 700;

  color: var(--muted);
}

.like-button.liked {
  color: var(--green);
}

.comment-button {
  color: var(--purple);
}

/* =========================
   COMMENTS
========================= */

.comment-box {
  display: none;

  margin-top: 14px;
}

.comment-box.open {
  display: block;
}

.comments {
  display: grid;

  gap: 8px;

  margin-bottom: 10px;
}

.comment {
  padding: 10px 12px;

  background: #101013;

  border-left: 2px solid var(--purple);

  border-radius: 9px;

  word-break: break-word;
}

.comment strong {
  color: var(--green);
}

.comment-date {
  color: #777;

  font-size: 11px;

  margin-left: 6px;
}

.comment-text {
  margin-top: 4px;

  color: #ddd;

  line-height: 1.45;
}

.comment-row {
  display: flex;

  gap: 8px;
}

.comment-input {
  flex: 1;

  min-height: 48px;

  resize: vertical;

  padding: 12px;

  color: white;

  background: #0d0d0f;

  border: 1px solid #38383d;

  border-radius: 12px;

  outline: none;
}

.comment-input:focus {
  border-color: var(--purple);
}

.publish {
  padding: 0 16px;

  color: var(--green);

  background: #0b1309;

  border: 1px solid var(--green);

  border-radius: 12px;

  font-weight: 800;
}

/* =========================
   MODAL
========================= */

.modal {
  position: fixed;

  inset: 0;

  z-index: 50;

  display: none;

  align-items: flex-end;

  justify-content: center;

  background: rgba(0,0,0,.78);
}

.modal.open {
  display: flex;
}

.sheet {
  width: min(100%, 620px);

  padding: 21px;

  background: #0d0d0f;

  border: 1px solid #36363a;

  border-radius: 22px 22px 0 0;
}

.sheet h3 {
  margin-top: 0;

  color: var(--gold);
}

.sheet input,
.sheet textarea,
.sheet select {
  width: 100%;

  margin: 6px 0 12px;

  padding: 12px;

  color: white;

  background: #08080a;

  border: 1px solid #333;

  border-radius: 12px;

  outline: none;
}

.sheet textarea {
  min-height: 120px;

  resize: vertical;
}

.sheet-actions {
  display: flex;

  justify-content: flex-end;

  gap: 8px;
}

.cancel {
  padding: 11px 16px;

  color: #aaa;

  background: #151517;

  border: 1px solid #333;

  border-radius: 12px;
}

.save {
  padding: 11px 16px;

  color: var(--green);

  background: #0b160a;

  border: 1px solid var(--green);

  border-radius: 12px;

  font-weight: 800;
}

/* =========================
   BOTTOM MENU
========================= */

.bottom {
  position: fixed;

  left: 50%;
  bottom: 10px;

  transform: translateX(-50%);

  z-index: 30;

  width: min(
    calc(100% - 24px),
    720px
  );

  display: flex;

  justify-content: space-around;

  padding: 8px;

  background: rgba(10,10,12,.95);

  backdrop-filter: blur(15px);

  border: 1px solid #34343a;

  border-radius: 22px;
}

.bottom button {
  padding: 6px 10px;

  color: var(--muted);

  background: transparent;

  border: 0;

  font-size: 11px;
}

.bottom .plus {
  color: var(--green);

  font-size: 24px;
}

.empty {
  padding: 40px 20px;

  color: var(--muted);

  text-align: center;
}

.toast {
  position: fixed;

  top: 18px;
  left: 50%;

  transform: translateX(-50%);

  z-index: 100;

  display: none;

  padding: 12px 16px;

  color: white;

  background: #111;

  border: 1px solid var(--green);

  border-radius: 12px;
}

.toast.show {
  display: block;
}

@media(max-width:650px) {

  .topbar {
    align-items: flex-start;

    flex-direction: column;
  }

  .nav {
    width: 100%;
  }

  .hero {
    padding: 20px;
  }

  .hero h1 {
    font-size: 24px;
  }

  .card {
    padding: 15px;
  }

  .comment-row {
    flex-direction: column;
  }

  .publish {
    min-height: 45px;
  }
}

</style>
</head>

<body>

<div id="toast" class="toast"></div>

<div class="app">

<header class="topbar">

  <div class="brand">
    AFTER
    <small>— BY OMITO —</small>
  </div>

  <nav class="nav">

    <button
      class="active"
      data-filter="all"
    >
      TODOS
    </button>

    <button data-filter="influencer">
      INFLUENCERS
    </button>

    <button data-filter="bartender">
      BARTENDERS
    </button>

  </nav>

</header>

<section class="hero">

  <h1>
    <span class="green">AFTER</span>
    —
    <span class="gold">BY OMITO</span>
  </h1>

  <p>
    Influencers, bartenders, nightlife,
    tendencias y todo lo que pasa después.
  </p>

  <div class="hero-line"></div>

</section>

<div class="toolbar">

  <input
    id="search"
    class="search"
    placeholder="🔎 Buscar..."
  >

  <button
    id="newPost"
    class="new-post"
  >
    ＋ Publicar
  </button>

</div>

<main id="feed">

  <div class="empty">
    Cargando AFTER...
  </div>

</main>

</div>

<nav class="bottom">

  <button id="homeButton">
    ⌂
    <br>
    INICIO
  </button>

  <button id="searchButton">
    ⌕
    <br>
    BUSCAR
  </button>

  <button
    id="plusButton"
    class="plus"
  >
    ＋
  </button>

  <button id="notificationsButton">
    ♧
    <br>
    NOTIFICACIONES
  </button>

  <button id="profileButton">
    ◎
    <br>
    PERFIL
  </button>

</nav>

<div
  id="postModal"
  class="modal"
>

<form
  id="postForm"
  class="sheet"
>

<h3>
  NUEVA PUBLICACIÓN
</h3>

<label>
  Categoría
</label>

<select id="postCategory">

  <option value="influencer">
    Influencer
  </option>

  <option value="bartender">
    Bartender
  </option>

</select>

<label>
  Título
</label>

<input
  id="postTitle"
  maxlength="120"
  placeholder="Ej. Lo que pasó anoche..."
>

<label>
  Publicación
</label>

<textarea
  id="postBody"
  maxlength="3000"
  placeholder="Escribe tu publicación..."
></textarea>

<div class="sheet-actions">

<button
  type="button"
  id="closeModal"
  class="cancel"
>
  Cancelar
</button>

<button
  type="submit"
  class="save"
>
  PUBLICAR
</button>

</div>

</form>

</div>
<script>
(() => {

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  /* =========================
     IDENTIDAD DEL VISITANTE
  ========================= */

  let visitorId =
    localStorage.getItem("after_visitor_id");

  if (!visitorId) {

    visitorId =
      (crypto.randomUUID
        ? crypto.randomUUID()
        : "visitor-" +
          Date.now() +
          "-" +
          Math.random()
      );

    localStorage.setItem(
      "after_visitor_id",
      visitorId
    );
  }


  /* =========================
     ESTADO
  ========================= */

  let posts = [];

  let currentFilter = "all";

  let currentSearch = "";


  /* =========================
     MENSAJES
  ========================= */

  function toast(message) {

    const element =
      $("#toast");

    element.textContent =
      message;

    element.classList.add(
      "show"
    );

    setTimeout(() => {

      element.classList.remove(
        "show"
      );

    }, 2500);
  }


  /* =========================
     ESCAPAR HTML
  ========================= */

  function escapeHTML(value) {

    return String(value ?? "")
      .replace(
        /[&<>"']/g,
        character => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[character])
      );
  }


  /* =========================
     API
  ========================= */

  async function api(
    path,
    options = {}
  ) {

    const response =
      await fetch(
        path,
        {
          ...options,

          headers: {
            "Content-Type":
              "application/json",

            ...(options.headers || {})
          }
        }
      );

    const raw =
      await response.text();

    let data = {};

    try {

      data =
        raw
          ? JSON.parse(raw)
          : {};

    } catch {

      throw new Error(
        "El servidor devolvió una respuesta inválida."
      );

    }

    if (
      !response.ok ||
      data.success === false
    ) {

      throw new Error(
        data.error ||
        "Error del servidor."
      );

    }

    return data;
  }


  /* =========================
     CARGAR POSTS
  ========================= */

  async function loadPosts() {

    try {

      const data =
        await api(
          "/api/posts?visitor_id=" +
          encodeURIComponent(
            visitorId
          )
        );

      posts =
        data.posts || [];

      render();

    } catch (error) {

      console.error(error);

      $("#feed").innerHTML = `

        <div class="empty">

          No se pudo cargar AFTER.

          <br><br>

          <small>
            ${escapeHTML(
              error.message
            )}
          </small>

        </div>

      `;

    }

  }


  /* =========================
     FECHA
  ========================= */

  function formatDate(date) {

    const value =
      new Date(date);

    if (
      Number.isNaN(
        value.getTime()
      )
    ) {

      return "";

    }

    return value.toLocaleString(
      "es-US",
      {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }
    );

  }


  /* =========================
     COMENTARIOS
  ========================= */

  function renderComments(
    comments
  ) {

    if (
      !comments ||
      !comments.length
    ) {

      return `
        <div
          style="
            color:#777;
            padding:8px 0;
          "
        >
          Todavía no hay comentarios.
        </div>
      `;

    }

    return comments
      .map(comment => `

        <div class="comment">

          <strong>
            ${escapeHTML(
              comment.name
            )}
          </strong>

          <span class="comment-date">

            ${formatDate(
              comment.created_at
            )}

          </span>

          <div class="comment-text">

            ${escapeHTML(
              comment.comment
            )}

          </div>

        </div>

      `)
      .join("");

  }


  /* =========================
     MOSTRAR POSTS
  ========================= */

  function render() {

    const visiblePosts =
      posts.filter(post => {

        const matchesFilter =
          currentFilter === "all" ||
          post.category ===
            currentFilter;

        const text =
          (
            post.title +
            " " +
            post.body
          ).toLowerCase();

        const matchesSearch =
          text.includes(
            currentSearch.toLowerCase()
          );

        return (
          matchesFilter &&
          matchesSearch
        );

      });


    if (
      !visiblePosts.length
    ) {

      $("#feed").innerHTML = `

        <div class="empty">

          No hay publicaciones
          que coincidan.

        </div>

      `;

      return;

    }


    $("#feed").innerHTML =
      visiblePosts
        .map(post => {

          const isBartender =
            post.category ===
            "bartender";

          return `

          <article
            class="card ${
              isBartender
                ? "bartender"
                : ""
            }"
            data-id="${post.id}"
          >

            <div class="post-head">

              <div class="avatar">

                ${
                  isBartender
                    ? "🍸"
                    : "✨"
                }

              </div>

              <div>

                <div class="name">

                  ${escapeHTML(
                    post.title
                  )}

                  <span class="verified">
                    ●
                  </span>

                </div>

                <div class="role">

                  ${
                    isBartender
                      ? "Bartender"
                      : "Influencer"
                  }

                  · AFTER

                </div>

              </div>

            </div>


            <h2>

              ${escapeHTML(
                post.title
              )}

            </h2>


            <p>

              ${escapeHTML(
                post.body
              )}

            </p>


            <div class="stats">

              <button
                class="
                  like-button
                  ${
                    post.liked
                      ? "liked"
                      : ""
                  }
                "
                data-like
              >

                💚 Like

                <span>

                  ${Number(
                    post.likes || 0
                  )}

                </span>

              </button>


              <button
                class="comment-button"
                data-comments-toggle
              >

                💬 Comentario

                <span>

                  ${Number(
                    post.comments || 0
                  )}

                </span>

              </button>

            </div>


            <div
              class="comment-box"
              data-comment-box
            >

              <div
                class="comments"
                data-comments
              >

                ${renderComments(
                  post.commentsList || []
                )}

              </div>


              <div class="comment-row">

                <textarea
                  class="comment-input"
                  data-comment-input
                  maxlength="1000"
                  rows="2"
                  placeholder="Escribe un comentario..."
                ></textarea>


                <button
                  class="publish"
                  data-publish
                >

                  PUBLICAR

                </button>

              </div>

            </div>

          </article>

          `;

        })
        .join("");


    attachCardEvents();

  }


  /* =========================
     EVENTOS DE LAS TARJETAS
  ========================= */

  function attachCardEvents() {

    $$(".card")
      .forEach(card => {

        const postId =
          Number(
            card.dataset.id
          );

        const post =
          posts.find(
            item =>
              Number(item.id) ===
              postId
          );

        if (!post) return;


        /* LIKE */

        const likeButton =
          $(
            "[data-like]",
            card
          );

        likeButton.onclick =
          async () => {

            likeButton.disabled =
              true;

            try {

              const result =
                await api(
                  "/api/like",
                  {
                    method: "POST",

                    body:
                      JSON.stringify({
                        post_id:
                          postId,

                        visitor_id:
                          visitorId
                      })
                  }
                );


              post.liked =
                result.liked;

              post.likes =
                result.likes;


              render();


              toast(
                result.liked
                  ? "Like agregado 💚"
                  : "Like eliminado"
              );


            } catch (error) {

              toast(
                error.message
              );

            } finally {

              likeButton.disabled =
                false;

            }

          };


        /* COMENTARIOS */

        const toggle =
          $(
            "[data-comments-toggle]",
            card
          );

        toggle.onclick =
          () => {

            const box =
              $(
                "[data-comment-box]",
                card
              );

            box.classList.toggle(
              "open"
            );

          };


        /* PUBLICAR COMENTARIO */

        const publish =
          $(
            "[data-publish]",
            card
          );


        publish.onclick =
          async () => {

            const input =
              $(
                "[data-comment-input]",
                card
              );


            const comment =
              input.value.trim();


            if (!comment) {

              toast(
                "Escribe un comentario."
              );

              input.focus();

              return;

            }


            publish.disabled =
              true;


            try {

              const name =
                localStorage.getItem(
                  "after_name"
                ) ||
                "Invitado";


              const result =
                await api(
                  "/api/comment",
                  {
                    method: "POST",

                    body:
                      JSON.stringify({

                        post_id:
                          postId,

                        visitor_id:
                          visitorId,

                        name,

                        comment

                      })
                  }
                );


              post.commentsList =
                result.comments ||
                [];


              post.comments =
                post.commentsList.length;


              input.value = "";


              render();


              const newCard =
                document.querySelector(
                  '.card[data-id="' +
                  postId +
                  '"]'
                );


              if (newCard) {

                $(
                  "[data-comment-box]",
                  newCard
                )
                .classList.add(
                  "open"
                );

              }


              toast(
                "Comentario publicado ✓"
              );


            } catch (error) {

              toast(
                error.message
              );


            } finally {

              publish.disabled =
                false;

            }

          };


      });

  }


  /* =========================
     FILTROS
  ========================= */

  $$(".nav button")
    .forEach(button => {

      button.onclick =
        () => {

          $$(".nav button")
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          currentFilter =
            button.dataset.filter;


          render();

        };

    });


  /* =========================
     BUSCAR
  ========================= */

  $("#search")
    .addEventListener(
      "input",
      event => {

        currentSearch =
          event.target.value;

        render();

      }
    );


  /* =========================
     MODAL
  ========================= */

  const modal =
    $("#postModal");


  function openModal() {

    modal.classList.add(
      "open"
    );

    $("#postTitle")
      .focus();

  }


  function closeModal() {

    modal.classList.remove(
      "open"
    );

  }


  $("#newPost")
    .onclick =
      openModal;


  $("#plusButton")
    .onclick =
      openModal;


  $("#closeModal")
    .onclick =
      closeModal;


  modal.onclick =
    event => {

      if (
        event.target ===
        modal
      ) {

        closeModal();

      }

    };


  /* =========================
     NUEVA PUBLICACIÓN
  ========================= */

  $("#postForm")
    .onsubmit =
      async event => {

        event.preventDefault();


        const category =
          $("#postCategory")
            .value;


        const title =
          $("#postTitle")
            .value
            .trim();


        const body =
          $("#postBody")
            .value
            .trim();


        if (
          !title ||
          !body
        ) {

          toast(
            "Completa todos los campos."
          );

          return;

        }


        const button =
          $(
            '#postForm button[type="submit"]'
          );


        button.disabled =
          true;


        try {

          await api(
            "/api/post",
            {
              method: "POST",

              body:
                JSON.stringify({

                  category,

                  title,

                  body

                })

            }
          );


          closeModal();


          $("#postForm")
            .reset();


          await loadPosts();


          toast(
            "Publicación creada ✓"
          );


        } catch (error) {

          toast(
            error.message
          );

        } finally {

          button.disabled =
            false;

        }

      };


  /* =========================
     PERFIL
  ========================= */

  $("#profileButton")
    .onclick =
      () => {

        const current =
          localStorage.getItem(
            "after_name"
          ) ||
          "Invitado";


        const name =
          prompt(
            "¿Qué nombre quieres usar en tus comentarios?",
            current
          );


        if (
          name &&
          name.trim()
        ) {

          localStorage.setItem(
            "after_name",
            name.trim()
              .slice(0,40)
          );


          toast(
            "Nombre guardado ✓"
          );

        }

      };


  /* =========================
     INICIO
  ========================= */

  $("#homeButton")
    .onclick =
      () => {

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      };


  /* =========================
     BUSCAR
  ========================= */

  $("#searchButton")
    .onclick =
      () => {

        $("#search")
          .focus();

        window.scrollTo({
          top: 100,
          behavior: "smooth"
        });

      };


  /* =========================
     NOTIFICACIONES
  ========================= */

  $("#notificationsButton")
    .onclick =
      () => {

        toast(
          "No tienes notificaciones nuevas."
        );

      };


  /* =========================
     INICIAR
  ========================= */

  loadPosts();


})();
</script>

</body>
</html>`;
}


/* =========================
   WORKER
========================= */

export default {

  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {

    const url =
      new URL(
        request.url
      );


    try {

      /* API */

      if (
        url.pathname.startsWith(
          "/api/"
        )
      ) {

        return await handleAPI(
          request,
          env,
          url
        );

      }


      /* PÁGINA */

      if (
        url.pathname !== "/"
      ) {

        return new Response(
          "Página no encontrada.",
          {
            status: 404,

            headers: {
              "content-type":
                "text/plain; charset=UTF-8"
            }

          }
        );

      }


      return new Response(
        pageHTML(),
        {
          status: 200,

          headers: {
            "content-type":
              "text/html; charset=UTF-8",

            "cache-control":
              "no-store"
          }

        }
      );


    } catch (error) {

      console.error(
        error
      );


      if (
        url.pathname.startsWith(
          "/api/"
        )
      ) {

        return json(
          {
            success: false,

            error:
              "Error del servidor. Revisa la conexión con D1."
          },
          500
        );

      }


      return new Response(
        "Error del servidor.",
        {
          status: 500
        }
      );

    }

  }

};