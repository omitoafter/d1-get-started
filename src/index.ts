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

  <title>AFTER — Lo que pasa después</title>

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

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;
      background: #080808;
      color: #ffffff;
      line-height: 1.5;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    /* HEADER */

    header {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(8, 8, 8, 0.94);
      backdrop-filter: blur(18px);
      border-bottom: 1px solid #242424;
    }

    .nav {
      max-width: 1200px;
      margin: auto;
      padding: 18px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .logo {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -2px;
    }

    .logo span {
      color: #ff2d55;
    }

    nav {
      display: flex;
      gap: 24px;
      font-size: 14px;
      font-weight: 700;
    }

    nav a {
      color: #aaa;
      transition: 0.2s;
    }

    nav a:hover {
      color: white;
    }

    .menu-button {
      display: none;
      background: #191919;
      color: white;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 20px;
    }

    /* HERO */

    .hero {
      max-width: 1200px;
      margin: auto;
      padding: 70px 22px 45px;
    }

    .hero-label {
      color: #ff2d55;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 15px;
    }

    .hero h1 {
      max-width: 900px;
      font-size: clamp(52px, 9vw, 110px);
      line-height: 0.88;
      letter-spacing: -6px;
      font-weight: 950;
    }

    .hero h1 span {
      color: #ff2d55;
    }

    .hero p {
      max-width: 650px;
      margin-top: 25px;
      color: #aaa;
      font-size: 18px;
    }

    .hero-buttons {
      display: flex;
      gap: 12px;
      margin-top: 30px;
      flex-wrap: wrap;
    }

    .button {
      padding: 13px 20px;
      border-radius: 999px;
      font-weight: 800;
      background: white;
      color: black;
      border: none;
      cursor: pointer;
    }

    .button.secondary {
      background: #181818;
      color: white;
      border: 1px solid #333;
    }

    /* TRENDING */

    .section {
      max-width: 1200px;
      margin: auto;
      padding: 35px 22px;
    }

    .section-header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 22px;
    }

    .section-title {
      font-size: 30px;
      font-weight: 900;
      letter-spacing: -1px;
    }

    .section-subtitle {
      color: #777;
      font-size: 14px;
    }

    .trending {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 8px;
    }

    .trend {
      min-width: 190px;
      height: 120px;
      border-radius: 18px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: end;
      background:
        linear-gradient(
          135deg,
          #34152a,
          #171717 70%
        );
      border: 1px solid #292929;
    }

    .trend:nth-child(2) {
      background:
        linear-gradient(
          135deg,
          #152d34,
          #171717 70%
        );
    }

    .trend:nth-child(3) {
      background:
        linear-gradient(
          135deg,
          #342915,
          #171717 70%
        );
    }

    .trend:nth-child(4) {
      background:
        linear-gradient(
          135deg,
          #281534,
          #171717 70%
        );
    }

    .trend small {
      color: #aaa;
      margin-bottom: 5px;
    }

    .trend strong {
      font-size: 18px;
    }

    /* FEATURED */

    .featured {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 18px;
    }

    .feature-card {
      min-height: 430px;
      border-radius: 25px;
      overflow: hidden;
      position: relative;
      background:
        linear-gradient(
          135deg,
          #ff2d55,
          #32101a 45%,
          #101010
        );
      border: 1px solid #292929;
    }

    .feature-card::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(
          transparent 25%,
          rgba(0,0,0,0.9)
        );
    }

    .feature-content {
      position: absolute;
      z-index: 2;
      left: 28px;
      right: 28px;
      bottom: 28px;
    }

    .tag {
      display: inline-block;
      background: #ff2d55;
      color: white;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .feature-content h2 {
      font-size: clamp(30px, 5vw, 52px);
      line-height: 0.98;
      letter-spacing: -2px;
    }

    .feature-content p {
      color: #ccc;
      margin-top: 12px;
      max-width: 650px;
    }

    .side-stories {
      display: grid;
      gap: 18px;
    }

    .story {
      min-height: 206px;
      border-radius: 22px;
      padding: 24px;
      background: #111;
      border: 1px solid #292929;
      display: flex;
      flex-direction: column;
      justify-content: end;
    }

    .story:nth-child(1) {
      background:
        linear-gradient(
          135deg,
          #182a31,
          #101010
        );
    }

    .story:nth-child(2) {
      background:
        linear-gradient(
          135deg,
          #302219,
          #101010
        );
    }

    .story h3 {
      font-size: 25px;
      line-height: 1;
      margin-top: 8px;
    }

    /* CATEGORIES */

    .categories {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .category {
      padding: 22px;
      min-height: 120px;
      border-radius: 18px;
      background: #111;
      border: 1px solid #292929;
      transition: 0.2s;
    }

    .category:hover {
      transform: translateY(-3px);
      border-color: #555;
    }

    .category .emoji {
      font-size: 28px;
    }

    .category h3 {
      margin-top: 8px;
      font-size: 18px;
    }

    .category p {
      color: #777;
      font-size: 12px;
      margin-top: 3px;
    }

    /* ARTICLES */

    .articles {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }

    .article {
      background: #111;
      border: 1px solid #292929;
      border-radius: 20px;
      overflow: hidden;
    }

    .article-image {
      height: 190px;
      background:
        linear-gradient(
          135deg,
          #35151f,
          #171717
        );
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 60px;
    }

    .article:nth-child(2) .article-image {
      background:
        linear-gradient(
          135deg,
          #142e31,
          #171717
        );
    }

    .article:nth-child(3) .article-image {
      background:
        linear-gradient(
          135deg,
          #332713,
          #171717
        );
    }

    .article-body {
      padding: 20px;
    }

    .article-body small {
      color: #ff2d55;
      font-weight: 800;
    }

    .article-body h3 {
      font-size: 22px;
      line-height: 1.1;
      margin-top: 8px;
    }

    .article-body p {
      color: #888;
      margin-top: 10px;
      font-size: 14px;
    }

    .read {
      display: inline-block;
      margin-top: 15px;
      font-weight: 800;
      font-size: 13px;
    }

    /* NEWSLETTER */

    .newsletter {
      margin-top: 35px;
      border-radius: 25px;
      padding: 45px 30px;
      text-align: center;
      background:
        linear-gradient(
          135deg,
          #261019,
          #111
        );
      border: 1px solid #39232a;
    }

    .newsletter h2 {
      font-size: 35px;
      letter-spacing: -1px;
    }

    .newsletter p {
      color: #999;
      max-width: 550px;
      margin: 10px auto 25px;
    }

    .email {
      display: flex;
      max-width: 500px;
      margin: auto;
      gap: 8px;
    }

    .email input {
      flex: 1;
      min-width: 0;
      padding: 14px 18px;
      border-radius: 999px;
      border: 1px solid #333;
      background: #080808;
      color: white;
      outline: none;
    }

    /* FOOTER */

    footer {
      margin-top: 70px;
      border-top: 1px solid #222;
      padding: 35px 22px;
    }

    .footer-inner {
      max-width: 1200px;
      margin: auto;
      display: flex;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }

    .footer-logo {
      font-size: 28px;
      font-weight: 900;
    }

    footer p {
      color: #666;
      font-size: 13px;
      margin-top: 5px;
    }

    .socials {
      display: flex;
      gap: 15px;
      color: #aaa;
      font-size: 13px;
      font-weight: 700;
    }

    /* MOBILE */

    @media (max-width: 800px) {

      nav {
        display: none;
      }

      .menu-button {
        display: block;
      }

      .hero {
        padding-top: 50px;
      }

      .hero h1 {
        letter-spacing: -4px;
      }

      .featured {
        grid-template-columns: 1fr;
      }

      .feature-card {
        min-height: 390px;
      }

      .categories {
        grid-template-columns: repeat(2, 1fr);
      }

      .articles {
        grid-template-columns: 1fr;
      }

      .article-image {
        height: 220px;
      }

      .email {
        flex-direction: column;
      }

      .email .button {
        width: 100%;
      }
    }

    @media (max-width: 450px) {

      .logo {
        font-size: 27px;
      }

      .hero h1 {
        font-size: 58px;
      }

      .hero p {
        font-size: 16px;
      }

      .categories {
        grid-template-columns: 1fr 1fr;
      }

      .category {
        padding: 16px;
      }

      .section {
        padding-left: 16px;
        padding-right: 16px;
      }

      .hero {
        padding-left: 16px;
        padding-right: 16px;
      }
    }
  </style>
</head>

<body>

  <header>
    <div class="nav">

      <a href="/" class="logo">
        AFTER<span>.</span>
      </a>

      <nav>
        <a href="#trending">Trending</a>
        <a href="#influencers">Influencers</a>
        <a href="#bartenders">Bartenders</a>
        <a href="#nightlife">Nightlife</a>
      </nav>

      <button
        class="menu-button"
        onclick="alert('Menú próximamente')"
      >
        ☰
      </button>

    </div>
  </header>


  <main>

    <!-- HERO -->

    <section class="hero">

      <div class="hero-label">
        THE NEW SOCIAL MAGAZINE
      </div>

      <h1>
        TODO PASA<br>
        <span>AFTER.</span>
      </h1>

      <p>
        Influencers, bartenders, nightlife, tendencias,
        historias y todo lo que realmente pasa cuando
        termina la noche.
      </p>

      <div class="hero-buttons">
        <a href="#trending" class="button">
          Ver lo que está pasando
        </a>

        <a href="#categories" class="button secondary">
          Explorar AFTER
        </a>
      </div>

    </section>


    <!-- TRENDING -->

    <section class="section" id="trending">

      <div class="section-header">
        <div>
          <div class="section-title">
            🔥 Trending Now
          </div>

          <div class="section-subtitle">
            Lo que todo el mundo está hablando
          </div>
        </div>
      </div>

      <div class="trending">

        <div class="trend">
          <small>#01</small>
          <strong>La noche empieza aquí</strong>
        </div>

        <div class="trend">
          <small>#02</small>
          <strong>Influencers en Miami</strong>
        </div>

        <div class="trend">
          <small>#03</small>
          <strong>El bartender de la semana</strong>
        </div>

        <div class="trend">
          <small>#04</small>
          <strong>After Hours</strong>
        </div>

      </div>

    </section>


    <!-- FEATURED -->

    <section class="section">

      <div class="section-header">
        <div class="section-title">
          La historia principal
        </div>
      </div>

      <div class="featured">

        <article class="feature-card">

          <div class="feature-content">

            <span class="tag">
              Exclusive
            </span>

            <h2>
              Lo que pasa después
              de cerrar el bar.
            </h2>

            <p>
              Las historias que no aparecen en
              Instagram. Las conversaciones,
              los encuentros y los secretos de
              la noche.
            </p>

          </div>

        </article>


        <div class="side-stories">

          <article class="story">

            <span class="tag">
              Influencers
            </span>

            <h3>
              ¿Quién está dominando
              las redes esta semana?
            </h3>

          </article>


          <article class="story">

            <span class="tag">
              Nightlife
            </span>

            <h3>
              Los lugares donde
              todos terminan AFTER.
            </h3>

          </article>

        </div>

      </div>

    </section>


    <!-- CATEGORIES -->

    <section
      class="section"
      id="categories"
    >

      <div class="section-header">

        <div>
          <div class="section-title">
            Explora AFTER
          </div>

          <div class="section-subtitle">
            Elige tu mundo
          </div>
        </div>

      </div>


      <div class="categories">

        <a
          href="#influencers"
          class="category"
        >
          <div class="emoji">📸</div>
          <h3>Influencers</h3>
          <p>Personas, historias y drama.</p>
        </a>


        <a
          href="#bartenders"
          class="category"
        >
          <div class="emoji">🍸</div>
          <h3>Bartenders</h3>
          <p>Los protagonistas de la noche.</p>
        </a>


        <a
          href="#nightlife"
          class="category"
        >
          <div class="emoji">🌃</div>
          <h3>Nightlife</h3>
          <p>Dónde empieza la diversión.</p>
        </a>


        <a
          href="#trending"
          class="category"
        >
          <div class="emoji">🔥</div>
          <h3>Trending</h3>
          <p>Lo que todos comentan.</p>
        </a>

      </div>

    </section>


    <!-- INFLUENCERS -->

    <section
      class="section"
      id="influencers"
    >

      <div class="section-header">

        <div>
          <div class="section-title">
            📸 Influencers
          </div>

          <div class="section-subtitle">
            Lo último de las redes
          </div>
        </div>

      </div>


      <div class="articles">

        <article class="article">

          <div class="article-image">
            📱
          </div>

          <div class="article-body">

            <small>
              SOCIAL
            </small>

            <h3>
              Las nuevas caras que
              están llamando la atención.
            </h3>

            <p>
              Descubre quién está creciendo
              rápidamente en redes.
            </p>

            <a href="#" class="read">
              Leer historia →
            </a>

          </div>

        </article>


        <article class="article">

          <div class="article-image">
            ✨
          </div>

          <div class="article-body">

            <small>
              TRENDING
            </small>

            <h3>
              Cuando una noche se
              convierte en contenido.
            </h3>

            <p>
              Una historia, un video y
              millones de views.
            </p>

            <a href="#" class="read">
              Leer historia →
            </a>

          </div>

        </article>


        <article class="article">

          <div class="article-image">
            🔥
          </div>

          <div class="article-body">

            <small>
              AFTER
            </small>

            <h3>
              Lo que realmente pasa
              después del evento.
            </h3>

            <p>
              Porque la fiesta no termina
              cuando termina la cámara.
            </p>

            <a href="#" class="read">
              Leer historia →
            </a>

          </div>

        </article>

      </div>

    </section>


    <!-- BARTENDERS -->

    <section
      class="section"
      id="bartenders"
    >

      <div class="section-header">

        <div>
          <div class="section-title">
            🍸 Bartenders
          </div>

          <div class="section-subtitle">
            Los que conocen todas las historias
          </div>
        </div>

      </div>


      <div class="articles">

        <article class="article">

          <div class="article-image">
            🍸
          </div>

          <div class="article-body">

            <small>
              BARTENDER SPOTLIGHT
            </small>

            <h3>
              El bartender que todos
              quieren conocer.
            </h3>

            <p>
              Personalidad, estilo y los
              mejores cocktails.
            </p>

            <a href="#" class="read">
              Conocer →
            </a>

          </div>

        </article>


        <article class="article">

          <div class="article-image">
            🥂
          </div>

          <div class="article-body">

            <small>
              COCKTAILS
            </small>

            <h3>
              Los cocktails que están
              dominando la noche.
            </h3>

            <p>
              Las bebidas que están
              apareciendo en todas partes.
            </p>

            <a href="#" class="read">
              Descubrir →
            </a>

          </div>

        </article>


        <article class="article">

          <div class="article-image">
            🌙
          </div>

          <div class="article-body">

            <small>
              NIGHT SHIFT
            </small>

            <h3>
              Una noche detrás de
              la barra.
            </h3>

            <p>
              Historias de quienes trabajan
              mientras todos celebran.
            </p>

            <a href="#" class="read">
              Leer →
            </a>

          </div>

        </article>

      </div>

    </section>


    <!-- NIGHTLIFE -->

    <section
      class="section"
      id="nightlife"
    >

      <div class="newsletter">

        <h2>
          AFTER HOURS 🌙
        </h2>

        <p>
          Recibe las historias más interesantes,
          los lugares que están de moda y las
          noticias que todos estarán comentando.
        </p>

        <div class="email">

          <input
            type="email"
            placeholder="Tu email"
          >

          <button
            class="button"
            onclick="subscribe()"
          >
            Suscribirme
          </button>

        </div>

      </div>

    </section>

  </main>


  <!-- FOOTER -->

  <footer>

    <div class="footer-inner">

      <div>
        <div class="footer-logo">
          AFTER.
        </div>

        <p>
          Lo que pasa después.
        </p>
      </div>


      <div class="socials">
        <span>Instagram</span>
        <span>TikTok</span>
        <span>Contact</span>
      </div>

    </div>

  </footer>


  <script>
    function subscribe() {
      const input = document.querySelector(
        'input[type="email"]'
      );

      if (!input.value) {
        alert("Escribe tu email primero.");
        return;
      }

      alert(
        "¡Bienvenido a AFTER! 🔥"
      );

      input.value = "";
    }
  </script>

</body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
      },
    });
  },
};