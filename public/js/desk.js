(function () {
  "use strict";

  var TZ = "Europe/Istanbul";
  var page = document.documentElement.getAttribute("data-page");

  function pad2(n) { return String(n).padStart(2, "0"); }

  function fmtSol(n) {
    var x = Number(n);
    if (!Number.isFinite(x)) x = 0;
    return x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function partsInIstanbul(iso) {
    var d = iso ? new Date(iso) : new Date();
    var fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    var map = {};
    fmt.formatToParts(d).forEach(function (p) { map[p.type] = p.value; });
    return map;
  }

  function clockText(iso) {
    var p = partsInIstanbul(iso);
    return p.day + " " + p.month + "  " + p.hour + ":" + p.minute + " IST";
  }

  function tapeTime(iso) {
    var p = partsInIstanbul(iso);
    var now = partsInIstanbul();
    if (p.day === now.day && p.month === now.month && p.year === now.year) return p.hour + ":" + p.minute;
    return p.day + " " + p.month + "  " + p.hour + ":" + p.minute;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== "") n.textContent = text;
    return n;
  }

  function dash() { return el("span", "dash", "—"); }

  function pumpHref(mint) {
    return "https://pump.fun/coin/" + encodeURIComponent(mint);
  }

  function tickerLink(ticker, mint) {
    if (!ticker) return dash();
    if (!mint) return el("span", "ticker", ticker);
    var a = el("a", "ticker", ticker);
    a.href = pumpHref(mint);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }

  function lastLabel(ev) {
    if (!ev) return null;
    var kind = ev.kind || (ev.type || "").toUpperCase();
    if (ev.paper) kind = "PAPER " + kind;
    if (ev.ticker) return kind + "  " + ev.ticker;
    return kind;
  }

  function verbOf(item) {
    if (item.type === "fill") return (item.paper ? "PAPER " : "") + String(item.side || "fill").toUpperCase();
    if (item.type === "pitch") return "PITCH";
    if (item.type === "bag") return item.ticker ? "BAG" : "FLAT";
    return String(item.type || "").toUpperCase();
  }

  function shortMint(m) {
    if (!m || m.length < 12) return m || "";
    return m.slice(0, 4) + "…" + m.slice(-4);
  }

  async function getJson(path) {
    var urls = [path];
    if (path.indexOf(".json") === -1) urls.push(path + ".json");
    var lastErr = new Error("desk unreachable");
    for (var i = 0; i < urls.length; i++) {
      try {
        var res = await fetch(urls[i], { headers: { Accept: "application/json" } });
        if (!res.ok) { lastErr = new Error("desk " + res.status); continue; }
        var data = await res.json();
        return data;
      } catch (err) { lastErr = err; }
    }
    throw lastErr;
  }

  function paintClock() {
    var node = document.getElementById("clock");
    if (node) node.textContent = clockText();
  }

  function setStatus(status) {
    var node = document.getElementById("desk-status");
    if (node) node.textContent = status || "UNFUNDED";
  }

  function paintBook(traders) {
    var root = document.getElementById("book");
    if (!root) return;
    root.textContent = "";
    if (!traders || !traders.length) {
      root.appendChild(el("p", "empty", "Accounts unfunded. Rank is flat."));
      return;
    }
    var head = el("div", "book-head");
    ["Rank", "Trader", "Equity", "Bag", "Last"].forEach(function (lab) {
      head.appendChild(el("span", "", lab));
    });
    root.appendChild(head);
    traders.forEach(function (t) {
      var row = el("div", "book-row");
      row.appendChild(el("div", "rank", pad2(t.rank)));
      var who = el("div", "who");
      var name = el("a", "", t.name);
      name.href = "/trader.html?seat=" + t.slug;
      who.appendChild(name);
      who.appendChild(el("div", "voice", t.voice));
      var wal = el("div", "wallet", t.pubkey || "");
      wal.title = t.pubkey || "";
      who.appendChild(wal);
      row.appendChild(who);
      var eq = el("div", "equity");
      if (Number(t.equitySol) > 0) eq.classList.add("is-up");
      if (Number(t.equitySol) < 0) eq.classList.add("is-down");
      eq.appendChild(document.createTextNode(fmtSol(t.equitySol)));
      eq.appendChild(el("span", "unit", "SOL"));
      row.appendChild(eq);
      var bag = el("div", "bag");
      if (t.bag && t.bag.ticker) bag.appendChild(tickerLink(t.bag.ticker, t.bag.mint));
      else bag.appendChild(dash());
      row.appendChild(bag);
      var last = el("div", "last");
      var lab = lastLabel(t.lastEvent);
      if (lab) last.textContent = lab;
      else last.appendChild(dash());
      row.appendChild(last);
      root.appendChild(row);
    });
  }

  function paintTicks(root, items, emptyText) {
    if (!root) return;
    root.textContent = "";
    if (!items || !items.length) {
      root.appendChild(el("p", "empty", emptyText));
      return;
    }
    items.forEach(function (item) {
      var tick = el("article", "tick");
      var time = el("time", "", tapeTime(item.at));
      time.dateTime = item.at || "";
      tick.appendChild(time);
      var name = el("a", "trader-name", item.name || item.trader);
      name.href = "/trader.html?seat=" + (item.trader || "");
      tick.appendChild(name);
      tick.appendChild(el("div", "verb", verbOf(item)));
      var body = el("div", "body");
      if (item.ticker) {
        var line = el("div", "");
        line.appendChild(tickerLink(item.ticker, item.mint));
        if (item.body && item.type === "pitch") {
          body.appendChild(line);
          body.appendChild(el("div", "copy", item.body));
        } else {
          if (item.body && item.type !== "fill") {
            line.appendChild(document.createTextNode("  " + item.body));
          }
          body.appendChild(line);
        }
        if (item.mint) {
          var mint = el("a", "mint", shortMint(item.mint));
          mint.href = pumpHref(item.mint);
          mint.target = "_blank";
          mint.rel = "noopener noreferrer";
          mint.title = item.mint;
          body.appendChild(mint);
        }
      } else {
        body.appendChild(el("div", "copy", item.body || "flat"));
      }
      tick.appendChild(body);
      var size = el("div", "size");
      if (item.solAmount != null && item.solAmount !== "") {
        size.appendChild(document.createTextNode(fmtSol(item.solAmount)));
        size.appendChild(el("span", "unit", "SOL"));
      } else {
        size.appendChild(dash());
      }
      tick.appendChild(size);
      root.appendChild(tick);
    });
  }

  async function loadFloor() {
    var board = await getJson("/api/leaderboard.json");
    var tape = await getJson("/api/tape.json");
    setStatus(board.status);
    paintBook(board.traders);
    paintTicks(document.getElementById("tape"), tape.items, "No prints. The tape is clean.");
    var upd = document.getElementById("book-updated");
    if (upd && board.updatedAt) upd.textContent = clockText(board.updatedAt);
  }

  function slugFromPath() {
    var q = new URLSearchParams(location.search).get("seat");
    if (q) return q.toLowerCase();
    var parts = location.pathname.replace(/\/+$/, "").split("/");
    var last = (parts[parts.length - 1] || "").toLowerCase();
    if (last && last !== "trader.html" && last !== "trader" && last.indexOf(".") === -1) return last;
    return "";
  }

  async function loadTrader() {
    var slug = slugFromPath();
    document.querySelectorAll("nav.seats a").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (href === "/trader/" + slug || href === "/trader.html?seat=" + slug) a.classList.add("is-on");
    });
    var board = await getJson("/api/leaderboard.json");
    var t = (board.traders || []).find(function (x) { return x.slug === slug; });
    if (!t) t = await getJson("/api/traders/" + encodeURIComponent(slug) + ".json");
    if (!t || !t.pubkey) throw new Error("unknown seat");
    var tape = await getJson("/api/tape.json").catch(function () { return { items: [] }; });
    t.pitches = t.pitches || (tape.items || []).filter(function (e) { return e.trader === slug || e.name === t.name; });
    t.fills = t.fills || [];
    setStatus(board.status);
    document.title = t.name + " — GROK TRADERS";
    document.getElementById("trader-name").textContent = t.name;
    document.getElementById("trader-voice").textContent = t.voice;
    document.getElementById("trader-rank").textContent = pad2(t.rank);
    var pk = document.getElementById("pubkey");
    pk.textContent = t.pubkey;
    var eq = document.getElementById("equity");
    eq.textContent = "";
    if (Number(t.equitySol) > 0) eq.classList.add("is-up");
    else eq.classList.remove("is-up");
    eq.appendChild(document.createTextNode(fmtSol(t.equitySol)));
    eq.appendChild(el("span", "unit", "SOL"));
    var bag = document.getElementById("bag");
    bag.textContent = "";
    if (t.bag && t.bag.ticker) bag.appendChild(tickerLink(t.bag.ticker, t.bag.mint));
    else bag.appendChild(dash());
    paintTicks(document.getElementById("fills"), t.fills, "No fills. The book is clean.");
    paintTicks(document.getElementById("pitches"), t.pitches, "No pitches on the floor.");
    var copyBtn = document.getElementById("copy-key");
    copyBtn.onclick = function () {
      var value = t.pubkey;
      var done = function () {
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("is-done");
        setTimeout(function () {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("is-done");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done).catch(function () { fallbackCopy(value, done); });
      } else fallbackCopy(value, done);
    };
  }

  function fallbackCopy(value, done) {
    var ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (err) {}
    document.body.removeChild(ta);
  }

  paintClock();
  setInterval(paintClock, 1000);

  var boot = page === "trader" ? loadTrader : loadFloor;
  boot().catch(function (err) {
    var book = document.getElementById("book") || document.getElementById("fills");
    if (book && !book.querySelector(".book-row") && !book.querySelector(".tick")) {
      book.textContent = "";
      book.appendChild(el("p", "empty", "The desk could not be reached."));
    }
    console.error(err);
  });
  setInterval(function () { boot().catch(function () {}); }, 8000);
})();
