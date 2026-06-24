// Local development server for DesignChat PWA.
// Uses only built-in Node APIs: serves static files and proxies /api/chat to OpenAI.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 8080);

loadDotEnv(join(ROOT, ".env.local"));
loadDotEnv(join(ROOT, ".env"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        aiConfigured: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      });
    }

    if (url.pathname === "/api/chat") {
      if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
      return handleChat(req, res);
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendText(res, 405, "Method not allowed");
    }

    const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
    let filePath = join(ROOT, safePath || "index.html");

    if (!filePath.startsWith(ROOT)) return sendText(res, 403, "Forbidden");

    let fileStat = await stat(filePath).catch(() => null);
    if (fileStat?.isDirectory()) {
      filePath = join(filePath, "index.html");
      fileStat = await stat(filePath).catch(() => null);
    }

    if (!fileStat || !fileStat.isFile()) {
      filePath = join(ROOT, "index.html");
    }

    const body = req.method === "HEAD" ? null : await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] || "application/octet-stream",
      "Cache-Control": filePath.endsWith("sw.js") ? "no-cache" : "public, max-age=60",
    });
    return res.end(body);
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Server error" });
  }
}).listen(PORT, () => {
  console.log(`DesignChat running: http://localhost:${PORT}`);
  console.log(process.env.OPENAI_API_KEY ? "AI: OPENAI_API_KEY loaded" : "AI: no OPENAI_API_KEY yet (Demo fallback will work)");
});

async function handleChat(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, {
      error: "OPENAI_API_KEY is not configured.",
      hint: "Create .env.local and add OPENAI_API_KEY=your_key_here",
    });
  }

  const body = await readJson(req).catch((error) => ({ __error: error.message }));
  if (body.__error) return sendJson(res, 400, { error: body.__error });
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return sendJson(res, 400, { error: "messages[] is required" });
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || body.model || "gpt-4o-mini",
      messages: body.messages,
      temperature: typeof body.temperature === "number" ? body.temperature : 0.75,
    }),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return sendJson(res, upstream.status, {
      error: data.error?.message || "OpenAI API request failed",
      details: data,
    });
  }

  return sendJson(res, 200, data);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}
