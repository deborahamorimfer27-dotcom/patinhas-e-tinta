const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const HOST = "127.0.0.1";
const PORT = 3000;
const PASTA_IMAGENS = path.join(__dirname, "imagens");
const LIMITE_JSON = 5 * 1024 * 1024;
const NOME_IMAGEM_VALIDO = /^[0-9a-f-]{36}\.jpg$/i;
const ORIGENS_PERMITIDAS = new Set(["null", "http://127.0.0.1:3000", "http://localhost:3000"]);

function responderJson(resposta, status, dados) {
  resposta.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  resposta.end(JSON.stringify(dados));
}

function configurarCors(req, resposta) {
  const origem = req.headers.origin;
  if (!origem) return true;
  if (!ORIGENS_PERMITIDAS.has(origem)) return false;
  resposta.setHeader("Access-Control-Allow-Origin", origem);
  resposta.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  resposta.setHeader("Access-Control-Allow-Headers", "Content-Type");
  resposta.setHeader("Vary", "Origin");
  return true;
}

function lerJson(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let tamanho = 0;
    let excedeuLimite = false;

    req.on("data", (parte) => {
      tamanho += parte.length;
      if (tamanho > LIMITE_JSON) {
        excedeuLimite = true;
        return;
      }
      partes.push(parte);
    });
    req.on("end", () => {
      if (excedeuLimite) {
        reject(Object.assign(new Error("Arquivo muito grande."), { status: 413 }));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(partes).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("JSON inválido."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

const servidor = http.createServer(async (req, resposta) => {
  if (!configurarCors(req, resposta)) {
    responderJson(resposta, 403, { erro: "Origem não permitida." });
    return;
  }
  if (req.method === "OPTIONS") {
    resposta.writeHead(204);
    resposta.end();
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (req.method === "POST" && url.pathname === "/api/imagens") {
    try {
      const corpo = await lerJson(req);
      const correspondencia = typeof corpo.dataUrl === "string"
        ? corpo.dataUrl.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/)
        : null;
      if (!correspondencia) {
        responderJson(resposta, 400, { erro: "Envie uma imagem JPEG válida." });
        return;
      }

      const imagem = Buffer.from(correspondencia[1], "base64");
      if (imagem.length > 3 * 1024 * 1024 || imagem[0] !== 0xff || imagem[1] !== 0xd8) {
        responderJson(resposta, 400, { erro: "Imagem inválida ou muito grande." });
        return;
      }

      await fs.mkdir(PASTA_IMAGENS, { recursive: true });
      const nome = `${crypto.randomUUID()}.jpg`;
      await fs.writeFile(path.join(PASTA_IMAGENS, nome), imagem, { flag: "wx" });
      responderJson(resposta, 201, { foto: `imagens/${nome}` });
    } catch (erro) {
      responderJson(resposta, erro.status || 500, { erro: erro.message || "Falha ao salvar a foto." });
    }
    return;
  }

  if (req.method === "DELETE" && url.pathname === "/api/imagens") {
    try {
      const corpo = await lerJson(req);
      const nome = typeof corpo.foto === "string" ? corpo.foto.replace(/^imagens\//, "") : "";
      if (!NOME_IMAGEM_VALIDO.test(nome)) {
        responderJson(resposta, 400, { erro: "Nome de imagem inválido." });
        return;
      }
      await fs.unlink(path.join(PASTA_IMAGENS, nome)).catch((erro) => {
        if (erro.code !== "ENOENT") throw erro;
      });
      resposta.writeHead(204);
      resposta.end();
    } catch (erro) {
      responderJson(resposta, erro.status || 500, { erro: erro.message || "Falha ao apagar a foto." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/imagens/")) {
    const nome = url.pathname.slice("/imagens/".length);
    if (!NOME_IMAGEM_VALIDO.test(nome)) {
      resposta.writeHead(404);
      resposta.end();
      return;
    }
    try {
      const imagem = await fs.readFile(path.join(PASTA_IMAGENS, nome));
      resposta.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "no-store" });
      resposta.end(imagem);
    } catch {
      resposta.writeHead(404);
      resposta.end();
    }
    return;
  }

  responderJson(resposta, 404, { erro: "Rota não encontrada." });
});

servidor.listen(PORT, HOST, async () => {
  await fs.mkdir(PASTA_IMAGENS, { recursive: true });
  console.log(`Servidor de fotos ativo em http://${HOST}:${PORT}`);
  console.log(`As fotos serão guardadas em: ${PASTA_IMAGENS}`);
});
