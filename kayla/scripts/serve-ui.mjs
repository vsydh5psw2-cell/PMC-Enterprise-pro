#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../web");
const port = Number(process.env.UI_PORT || 4173);
const host = process.env.UI_HOST || "0.0.0.0";
const agentOrigin = process.env.BDK_ORIGIN || "http://127.0.0.1:3000";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function send(res, status, body, headers = {}) {
  if (res.headersSent || res.writableEnded) return;
  res.writeHead(status, headers);
  res.end(body);
}

function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.normalize(path.join(webRoot, pathname));
  if (!filePath.startsWith(webRoot)) {
    send(res, 403, "Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, "Not found");
      return;
    }
    const ext = path.extname(filePath);
    send(res, 200, data, {
      "content-type": types[ext] || "application/octet-stream",
      "cache-control": "no-store",
    });
  });
}

async function proxy(req, res) {
  const target = new URL(req.url || "/", agentOrigin);
  const headers = { ...req.headers, host: target.host };
  // BDK localDevStrict rejects browser cross-origin mutations. The UI is
  // same-origin to this proxy; strip browser CORS/fetch metadata so the
  // agent sees a plain loopback call.
  for (const key of [
    "origin",
    "referer",
    "accept-encoding",
    "sec-fetch-site",
    "sec-fetch-mode",
    "sec-fetch-dest",
    "sec-fetch-user",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
  ]) {
    delete headers[key];
  }

  const onClose = () => {
    req.destroy();
  };
  res.on("close", onClose);

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method || "GET") ? undefined : req,
      duplex: "half",
      redirect: "manual",
    });

    if (res.headersSent || res.writableEnded) return;

    const outHeaders = {};
    upstream.headers.forEach((value, key) => {
      if (key === "transfer-encoding") return;
      outHeaders[key] = value;
    });
    res.writeHead(upstream.status, outHeaders);
    if (!upstream.body) {
      res.end();
      return;
    }
    const reader = upstream.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (res.writableEnded) {
          await reader.cancel().catch(() => {});
          break;
        }
        const ok = res.write(Buffer.from(value));
        if (!ok) {
          await new Promise((resolve) => res.once("drain", resolve));
        }
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "proxy error";
    send(
      res,
      502,
      JSON.stringify({
        ok: false,
        error: "agent_unreachable",
        message: `Cannot reach BDK at ${agentOrigin}: ${message}`,
      }),
      { "content-type": "application/json; charset=utf-8" },
    );
  } finally {
    res.off("close", onClose);
  }
}

const server = http.createServer((req, res) => {
  if ((req.url || "").startsWith("/v1")) {
    proxy(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(port, host, () => {
  console.log(`Kayla UI  http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`);
  console.log(`Listening on ${host}:${port} (forward this port in Cursor Desktop)`);
  console.log(`Proxying  /v1 → ${agentOrigin}/v1`);
});
