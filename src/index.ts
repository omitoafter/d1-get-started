export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/") {
      return new Response("Página no encontrada", {
        status: 404,
        headers: { "content-type": "text/plain; charset=UTF-8" },
      });
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>AFTER — by omito</title>

  <meta
    name="description"
    content="AFTER — Influencers, bartenders, nightlife, tendencias y todo lo que pasa después."
  >

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: #080808;
      color: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.5;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .container {
      width: 100%;
      max-width: 1100px;
      margin: auto;
      padding: 0 20px;
    }

    header {
      padding: 24px 0;
      border-bottom: 1px solid #252525;
      position: sticky;
      top: 0;
      background: rgba(8, 8, 8, 0.94);
      backdrop-filter: blur(12px);
      z-index: 10;
    }

    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .logo {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -1px;
    }

    .logo span {
      color: #a855f7;
    }

    .by {
      font-size: 12px;
      color: #888;
      margin-top: -5px;
      letter-spacing: 2px;
    }

    .menu {
      display: flex;
      gap: 18px;
      font-size: 14px;
      color: #aaa;
    }

    .menu a:hover {
      color: white;
    }

    .hero {
      padding: 70px 0 45px;
    }

    .tag {
      display: inline-block;
      border: 1px solid #333;
      background: #111;
      color: #bbb;
      border-radius: 30px;
      padding: 7px 14px;
      font-size: 12px;
      margin-bottom: 20px;
    }

    h1 {
      font-size: clamp(52px, 13vw, 110px);
      line-height: .85;
      letter-spacing: -5px;
      margin-bottom: 24px;
    }

    .purple {
      color: #a855f7;
    }

    .hero p {
      max-width: 650px;
      color: #aaa;
      font-size: 18px;
    }

    .section {
      padding: 35px 0;
    }

    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }

    .section-title h2 {
      font-size: 25px;
    }

    .section-title span {
      color: #777;
      font-size: 13px;
    }

    .featured {
      border-radius: 24px;
      min-height: 330px;
      padding: 28px;
      display: flex;
      align-items: flex-end;
      background:
        radial-gradient(circle at 80% 20%, #7c3aed55, transparent 35%),
        linear-gradient(135deg, #181818, #0b0b0b);
      border: 1px solid #292929;
      overflow: hidden;
    }

    .featured-content {
      max-width: 650px;
    }

    .category {
      display: inline-block;
      color: #d8b4fe;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 12px;
    }

    .featured h3 {
      font-size: clamp(30px, 7vw, 55px);
      line-height: 1;
      margin-bottom: 12px;
    }

    .featured p {
      color: #999;
      max-width: 600px;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .card {
      background: #111;
      border: 1px solid #252525;
      border-radius: 18px;
      padding: 20px;
      min-height: 190px;
      transition: .2s ease;
    }

    .card:hover {
      transform: translateY(-3px);
      border-color: #555;
    }

    .emoji {
      font-size: 30px;
      margin-bottom: 18px;
    }

    .card h3 {
      font-size: 20px;
      margin-bottom: 8px;
    }

    .card p {
      color: #888;
      font-size: 14px;
    }

    .stories {
      display: grid;
      gap: 12px;
    }

    .story {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      padding: 18px;
      border-radius: 16px;
      background: #111;
      border: 1px solid #242424;
    }

    .story-left {
      display: flex;
      gap: 14px;
      align-items: center;
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #ec4899);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }

    .story h3 {
      font-size: 16px;
    }

    .story p {
      color: #777;
      font-size: 13px;
    }

    .arrow {
      color: #777;
      font-size: 20px;
    }

    .newsletter {
      margin: 40px 0;
      padding: 35px 25px;
      text-align: center;
      border-radius: 24px;
      background: linear-gradient(135deg, #181818, #101010);
      border: 1px solid #292929;
    }

    .newsletter h2 {
      font-size: 30px;
      margin-bottom: 10px;
    }

    .newsletter p {
      color: #888;
      margin-bottom: 20px;
    }

    .button {
      display: inline-block;
      background: #ffffff;
      color: #080808;
      padding: 13px 22px;
      border-radius: 30px;
      font-weight: bold;
      cursor: pointer;
    }

    footer {
      padding: 35px 0 50px;
      border-top: 1px solid #222;
      color: #666;
      font-size: 13px;
    }

    footer strong {
      color: #aaa;
    }

    @media (max-width: 700px) {
      .menu {
        display: none;
      }

      .hero {
        padding-top: 50px;
      }

      .cards {
        grid-template-columns: 1fr;
      }

      .featured {
        min-height: 300px;
      }

      h1 {
        letter-spacing: -3px;
      }
    }
  </style>
</head>

<body>

<header>
  <div class="container">
    <div class="nav">

      <div>
        <div class="logo">
          AFTER <span>•</span>
        </div>
        <div class="by">BY OMITO</div>
      </div>

      <nav class="menu">
        <a href="#trending">Trending</a>
        <a href="#gossip">Chisme</a>
        <a href="#nightlife">Nightlife</a>
        <a href="#about">About</a>
      </nav>

    </div>
  </div>
</header>


<main>

<section class="hero">
  <div class="container">

    <div class="tag">
      LO QUE PASA DESPUÉS
    </div>

    <h1>
      AFTER<span class="purple">.</span>
    </h1>

    <p>
      El lugar donde se habla de influencers, bartenders,
      nightlife, tendencias y todo lo que pasa cuando
      las luces se apagan.
    </p>

  </div>
</section>


<section class="section" id="trending">
  <div class="container">

    <div class="section-title">
      <h2>🔥 Trending</h2>
      <span>Lo que está sonando</span>
    </div>

    <div class="featured">

      <div class="featured-content">

        <div class="category">
          AFTER EXCLUSIVE
        </div>

        <h3>
          Lo que pasó anoche
          nadie te lo contó así.
        </h3>

        <p>
          Historias, rumores, momentos inesperados
          y las conversaciones que empiezan cuando
          termina la noche.
        </p>

      </div>

    </div>

  </div>
</section>


<section class="section" id="gossip">
  <div class="container">

    <div class="section-title">
      <h2>👀 Chisme</h2>
      <span>Sin filtros</span>
    </div>

    <div class="cards">

      <article class="card">
        <div class="emoji">🔥</div>
        <h3>Influencers</h3>
        <p>
          Quién apareció, quién desapareció
          y qué está pasando detrás de las cámaras.
        </p>
      </article>

      <article class="card">
        <div class="emoji">🍸</div>
        <h3>Bartenders</h3>
        <p>
          Los bartenders que están convirtiendo
          la noche en una experiencia.
        </p>
      </article>

      <article class="card">
        <div class="emoji">👁️</div>
        <h3>Rumores</h3>
        <p>
          Las historias que todo el mundo comenta
          pero nadie quiere contar primero.
        </p>
      </article>

    </div>

  </div>
</section>


<section class="section" id="nightlife">
  <div class="container">

    <div class="section-title">
      <h2>🌙 Nightlife</h2>
      <span>Después de medianoche</span>
    </div>

    <div class="stories">

      <article class="story">
        <div class="story-left">
          <div class="avatar">NY</div>
          <div>
            <h3>La noche empieza después de las 12</h3>
            <p>Nightlife · New York</p>
          </div>
        </div>
        <div class="arrow">→</div>
      </article>

      <article class="story">
        <div class="story-left">
          <div class="avatar">MI</div>
          <div>
            <h3>Los spots que están llenando la ciudad</h3>
            <p>Nightlife · Miami</p>
          </div>
        </div>
        <div class="arrow">→</div>
      </article>

      <article class="story">
        <div class="story-left">
          <div class="avatar">LA</div>
          <div>
            <h3>Quién está detrás de la barra</h3>
            <p>Bartenders · Los Angeles</p>
          </div>
        </div>
        <div class="arrow">→</div>
      </article>

    </div>

  </div>
</section>


<section class="section" id="about">
  <div class="container">

    <div class="newsletter">

      <h2>Esto es AFTER.</h2>

      <p>
        Historias reales. Noche real.
        Personas reales. Todo lo que pasa después.
      </p>

      <a class="button" href="mailto:hello@afterbyomito.com">
        CONTACTAR
      </a>

    </div>

  </div>
</section>

</main>


<footer>
  <div class="container">

    <strong>AFTER — by omito</strong>

    <br><br>

    © 2026 AFTER. Todos los derechos reservados.

  </div>
</footer>

</body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
      },
    });
  },
};