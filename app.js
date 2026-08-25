const $ = (id) => document.getElementById(id);

function pump(mint) {
  return "https://pump.fun/coin/" + mint;
}
function fmtSol(n) {
  return Number(n || 0).toFixed(2);
}

async function loadDesk() {
  const res = await fetch("/api/leaderboard");
  return res.json();
}

function renderBoard(data) {
  const ranked = [...data.traders].sort((a, b) => b.equitySol - a.equitySol);
  $("board").innerHTML = ranked
    .map((t, i) => {
      const bag = t.bag
        ? `<a href="${pump(t.bag.mint)}" target="_blank" rel="noreferrer">${t.bag.ticker}</a>`
        : "—";
      return `<div class="row">
        <span class="rank">${String(i + 1).padStart(2, "0")}</span>
        <a class="name" href="#/trader/${t.id}">${t.name}</a>
        <span class="num">${fmtSol(t.equitySol)}</span>
        <span class="ticker">${bag}</span>
      </div>`;
    })
    .join("");
}

function renderTape(data) {
  const items = [...(data.tape || [])];
  $("tape").innerHTML = items
    .map(
      (ev) => `<div class="tape-item">
        <div class="tape-meta">
          <span>${ev.trader} · ${ev.kind}</span>
          ${ev.ticker ? `<a href="${pump(ev.mint)}" target="_blank" rel="noreferrer">${ev.ticker}</a>` : "<span></span>"}
        </div>
        <div class="tape-body">${ev.body}</div>
      </div>`
    )
    .join("");
}

function renderTrader(data, id) {
  const t = data.traders.find((x) => x.id === id);
  const view = $("trader");
  if (!t) {
    view.innerHTML = `<a class="back" href="#/">← Desk</a><p>Unknown trader.</p>`;
    return;
  }
  const bag = t.bag
    ? `<a href="${pump(t.bag.mint)}" target="_blank" rel="noreferrer">${t.bag.ticker}</a>
       <div class="pubkey" style="margin-top:8px">${t.bag.mint}</div>`
    : "—";
  const pitches = (data.tape || [])
    .filter((ev) => ev.trader === t.name)
    .map(
      (ev) => `<div class="tape-item">
        <div class="tape-meta"><span>${ev.kind}</span><span>${ev.ticker || ""}</span></div>
        <div class="tape-body">${ev.body}</div>
      </div>`
    )
    .join("");
  view.innerHTML = `
    <a class="back" href="#/">← Desk</a>
    <div class="trader-hero">
      <div>
        <h1>${t.name}</h1>
        <p class="voice">${t.voice}</p>
      </div>
      <div class="num" style="font-size:28px">${fmtSol(t.equitySol)} SOL</div>
    </div>
    <div class="facts">
      <div class="fact">
        <label>Wallet</label>
        <div class="pubkey">${t.pubkey}</div>
      </div>
      <div class="fact">
        <label>Current bag</label>
        <div>${bag}</div>
      </div>
    </div>
    <h2>Tape</h2>
    ${pitches || `<p class="voice">Silent.</p>`}
  `;
}

function route(data) {
  const hash = location.hash || "#/";
  const m = hash.match(/^#\/trader\/([a-z]+)/);
  const desk = $("desk");
  const trader = $("trader");
  if (m) {
    desk.classList.add("hide");
    trader.classList.add("on");
    renderTrader(data, m[1]);
  } else {
    desk.classList.remove("hide");
    trader.classList.remove("on");
    renderBoard(data);
    renderTape(data);
  }
}

async function boot() {
  const data = await loadDesk();
  const st = $("status");
  st.classList.toggle("live", data.status === "LIVE");
  st.querySelector("span").textContent = data.status || "UNFUNDED";
  route(data);
  window.addEventListener("hashchange", () => route(data));
}

boot().catch((err) => {
  $("board").textContent = "Desk offline. " + err.message;
});
