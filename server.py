#!/usr/bin/env python3
import json, os, secrets, time, urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "desk.json"
os.chdir(ROOT)

def load_key():
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("DESK_API_KEY="):
                return line.split("=", 1)[1].strip()
    key = secrets.token_hex(16)
    env.write_text(f"DESK_API_KEY={key}\n")
    (ROOT / ".env.example").write_text("DESK_API_KEY=\n")
    return key

KEY = load_key()

def read_desk():
    return json.loads(DATA.read_text())

def write_desk(desk):
    desk["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    DATA.write_text(json.dumps(desk, indent=2) + "\n")

def find_trader(desk, name):
    n = (name or "").strip().lower()
    for t in desk["traders"]:
        if t["id"] == n or t["name"].lower() == n:
            return t
    return None

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".json": "application/json",
        ".css": "text/css",
        ".png": "image/png",
    }

    def _json(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n == 0:
            return {}
        return json.loads(self.rfile.read(n).decode() or "{}")

    def _auth(self):
        return (self.headers.get("x-desk-key") or "") == KEY

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        if path == "/api/health":
            return self._json(200, {"ok": True, "status": read_desk().get("status")})
        if path == "/api/leaderboard" or path == "/api/traders":
            return self._json(200, read_desk())
        if path == "/api/tape":
            d = read_desk()
            return self._json(200, {"tape": d.get("tape", []), "fills": d.get("fills", [])})
        if path.startswith("/api/traders/"):
            name = path.split("/")[-1]
            d = read_desk()
            t = find_trader(d, name)
            if not t:
                return self._json(404, {"error": "unknown trader"})
            tape = [e for e in d.get("tape", []) if e.get("trader") == t["name"]]
            return self._json(200, {"trader": t, "tape": tape})
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        if not self._auth():
            return self._json(401, {"error": "bad desk key"})
        body = self._read_body()
        desk = read_desk()
        t = find_trader(desk, body.get("trader", ""))
        if not t:
            return self._json(400, {"error": "unknown trader"})
        if path == "/api/bags":
            t["bag"] = {"ticker": body["ticker"], "mint": body["mint"], "sizeSol": body.get("sizeSol", 0)}
            write_desk(desk)
            return self._json(200, t)
        if path == "/api/pitches":
            ev = {
                "id": "p" + secrets.token_hex(4),
                "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "kind": "PITCH",
                "trader": t["name"],
                "ticker": body.get("ticker"),
                "mint": body.get("mint"),
                "body": body.get("body", ""),
            }
            desk.setdefault("tape", []).insert(0, ev)
            if body.get("ticker") and body.get("mint"):
                t["bag"] = {"ticker": body["ticker"], "mint": body["mint"], "sizeSol": body.get("sizeSol", 0)}
            write_desk(desk)
            return self._json(200, ev)
        if path == "/api/fills":
            sol = float(body.get("solAmount") or 0)
            side = body.get("side", "buy")
            if side == "buy":
                t["equitySol"] = max(0, float(t.get("equitySol") or 0) - sol)
            else:
                t["equitySol"] = float(t.get("equitySol") or 0) + sol
            fill = {
                "id": "f" + secrets.token_hex(4),
                "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "kind": "FILL",
                "trader": t["name"],
                "side": side,
                "ticker": body.get("ticker"),
                "mint": body.get("mint"),
                "solAmount": sol,
                "txSig": body.get("txSig"),
                "paper": body.get("paper", True),
            }
            desk.setdefault("fills", []).insert(0, fill)
            desk.setdefault("tape", []).insert(0, {
                "id": fill["id"],
                "ts": fill["ts"],
                "kind": "FILL",
                "trader": t["name"],
                "ticker": fill.get("ticker"),
                "mint": fill.get("mint"),
                "body": f"{side.upper()} {fill.get('ticker') or ''} {sol:.2f} SOL",
            })
            write_desk(desk)
            return self._json(200, fill)
        return self._json(404, {"error": "unknown route"})

    def log_message(self, fmt, *args):
        return

if __name__ == "__main__":
    import sys
    port = int(os.environ.get("PORT", "3456"))
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Grok Traders desk on http://127.0.0.1:{port}", flush=True)
    httpd.serve_forever()
