const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..", "y");
const PORT = 4173;

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".ico": "image/x-icon",
  };
  return map[ext] || "application/octet-stream";
}

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const safePath = urlPath === "/" ? "/index.html" : urlPath;
    const filePath = path.join(ROOT, safePath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": getMimeType(filePath) });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(PORT, () => resolve(server));
  });
}

async function run() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const pagesToTest = [
    { path: "/index.html", name: "Home" },
    { path: "/finance.html", name: "Financeiro" },
    { path: "/bar.html", name: "Bar e Belisco" },
    { path: "/dashboard.html", name: "Painel" },
    { path: "/members.html", name: "Cadastros" },
  ];

  const summary = [];

  try {
    for (const pageDef of pagesToTest) {
      const errors = [];
      const requestFailures = [];
      const page = await browser.newPage();

      page.on("pageerror", (err) => errors.push(`Page error: ${err.message}`));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`Console error: ${msg.text()}`);
      });
      page.on("requestfailed", (request) => {
        const url = request.url();
        if (url.includes("favicon")) return;
        requestFailures.push(`${request.failure()?.errorText || "failed"} -> ${url}`);
      });

      try {
        await page.goto(`http://localhost:${PORT}${pageDef.path}`, { waitUntil: "load", timeout: 45000 });

        if (pageDef.path === "/index.html") {
          await page.getByRole("button", { name: "Área Restrita" }).click();
          await page.waitForSelector("#login-dialog[open]", { timeout: 2000 });
          const forgotLink = await page.$("#login-forgot-link");
          if (!forgotLink) errors.push("Elemento 'Esqueci minha senha' não encontrado");
          if (forgotLink) {
            await forgotLink.click();
            await page.waitForSelector("#reset-dialog[open]", { timeout: 2000 });
            await page.click("#reset-dialog button[data-action='close']");
            await page.waitForSelector("#reset-dialog[open]", { state: "hidden", timeout: 2000 });
          }
        } else {
          // pequena espera para capturar erros de carregamento pós-load
          await page.waitForTimeout(1000);
        }
      } catch (err) {
        errors.push(`Falha ao testar ${pageDef.path}: ${err.message}`);
      } finally {
        await page.close();
      }

      summary.push({ page: pageDef.name, errors, requestFailures });
    }
  } finally {
    await browser.close();
    server.close();
  }

  const hasIssues = summary.some(({ errors, requestFailures }) => errors.length || requestFailures.length);
  summary.forEach(({ page, errors, requestFailures }) => {
    if (!errors.length && !requestFailures.length) {
      console.log(`✔ ${page}: sem erros de console ou falhas de rede (exceto favicon).`);
      return;
    }
    console.log(`✖ ${page}:`);
    errors.forEach((err) => console.log("  ", err));
    requestFailures.forEach((fail) => console.log("  Request:", fail));
  });

  if (hasIssues) {
    process.exitCode = 1;
  } else {
    console.log("Smoke test geral passou em todas as páginas monitoradas.");
  }
}

run().catch((err) => {
  console.error("Erro na execução do smoke test:", err);
  process.exitCode = 1;
});
