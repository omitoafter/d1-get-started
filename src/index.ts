export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>After</title>
          <style>
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              background: #0b0b0f;
              color: white;
            }

            header {
              padding: 25px;
              text-align: center;
              border-bottom: 1px solid #292929;
            }

            h1 {
              font-size: 42px;
              margin: 10px 0;
            }

            .subtitle {
              color: #aaa;
              font-size: 18px;
            }

            .container {
              max-width: 900px;
              margin: auto;
              padding: 25px;
            }

            .card {
              background: #17171d;
              border-radius: 18px;
              padding: 22px;
              margin-bottom: 20px;
              border: 1px solid #292933;
            }

            .tag {
              color: #a78bfa;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 13px;
            }

            .card h2 {
              font-size: 26px;
              margin: 10px 0;
            }

            .card p {
              color: #bbb;
              line-height: 1.6;
            }

            button {
              background: #7c3aed;
              color: white;
              border: none;
              padding: 12px 20px;
              border-radius: 10px;
              font-size: 16px;
              cursor: pointer;
            }
          </style>
        </head>

        <body>
          <header>
            <h1>AFTER</h1>
            <div class="subtitle">
              Influencers • Bartenders • Stories • Chisme
            </div>
          </header>

          <main class="container">

            <div class="card">
              <div class="tag">🔥 Trending</div>
              <h2>Lo que pasó anoche...</h2>
              <p>
                Las historias que están dando de qué hablar
                entre influencers y bartenders.
              </p>
              <button>Leer historia</button>
            </div>

            <div class="card">
              <div class="tag">🍸 Bartenders</div>
              <h2>Detrás de la barra</h2>
              <p>
                Historias, secretos y momentos que pasan
                después de que las luces se apagan.
              </p>
              <button>Ver más</button>
            </div>

            <div class="card">
              <div class="tag">📱 Influencers</div>
              <h2>Lo que nadie está contando</h2>
              <p>
                Noticias, rumores y conversaciones
                de las redes sociales.
              </p>
              <button>Ver historias</button>
            </div>

          </main>
        </body>
        </html>
      `, {
        headers: {
          "content-type": "text/html; charset=UTF-8"
        }
      });
    }

    return new Response("Página no encontrada", {
      status: 404
    });
  }
};
