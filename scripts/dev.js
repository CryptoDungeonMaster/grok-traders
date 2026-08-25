"use strict";
// Local stand-in for Vercel's routing: static files out of public/, and the
// handlers in api/ mounted on the same extension-less paths they get in
// production, so the page can be checked without a deploy.
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.join(__dirname, "..");
const pub = path.join(root, "public");
const port = Number(process.env.PORT || 3456);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

const SEATS = ["blitz", "sage", "hype", "hex", "ghost"];
const routes = {
  "/api/leaderboard": require("../api/leaderboard"),
  "/api/tape": require("../api/tape"),
  "/api/health": require("../api/health")
};
const seatRoute = require("../api/traders/[name]");

function serveStatic(res, file) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    res.end("not found");
    return;
  }
  res.setHeader("content-type", TYPES[path.extname(file)] || "application/octet-stream");
  res.setHeader("cache-control", "no-store");
  res.end(fs.readFileSync(file));
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let p = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (routes[p]) return await routes[p](req, res);
      if (p.startsWith("/api/traders/") && !p.endsWith(".json")) {
        req.query = { name: p.split("/").pop() };
        return await seatRoute(req, res);
      }
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
      return;
    }

    if (p === "/") p = "/index.html";
    if (p.startsWith("/trader/")) p = "/" + p.split("/").pop() + ".html";
    if (SEATS.indexOf(p.slice(1)) !== -1) p += ".html";
    serveStatic(res, path.join(pub, p.replace(/^\/+/, "")));
  })
  .listen(port, () => console.log("GROK TRADERS desk on http://127.0.0.1:" + port));
