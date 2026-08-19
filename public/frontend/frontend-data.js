/*
 * StockEX frontend-data bridge - makes the static StockStory design pages
 * dynamic by loading real data from the app's own backend (/api/*) and
 * patching the rendered page in place.
 *
 * Design principle: the exact layout/components from the design stay
 * untouched; only the VALUES are replaced with real, live PSE data. When the
 * backend is unreachable (e.g. opening the .dc.html straight from disk), every
 * patch is a no-op and the design's built-in sample data is shown instead.
 */
(function () {
  if (window.StockEXData) return;
  var DATA = { summary: null, pulse: null, status: null, universe: null, stockBDO: null, disclosuresBDO: null, pseStocks: null, searchCache: {}, alerts: null, researchProfile: null };

  function getJSON(url) {
    return fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  var fmt = function (n, dp) {
    if (n == null || isNaN(n)) return null;
    var d = dp == null ? 2 : dp;
    return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  var pct = function (n) {
    if (n == null || isNaN(n)) return null;
    return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
  };

  function statusOpen(st) {
    if (!st) return null;
    var s = st.status || st.session || "";
    return s === "open" ? true : (s === "holiday" || s === "weekend" || s === "post-market" || s === "closing" || s === "lunch" || s === "auction") ? false : null;
  }

  function load() {
    return Promise.all([getJSON("/api/pse/summary"), getJSON("/api/market-pulse"), getJSON("/api/market-status")])
      .then(function (r) {
        DATA.summary = (r[0] && r[0].data) || r[0] || null;
        DATA.pulse = r[1] && r[1].ok ? r[1] : null;
        DATA.status = r[2] || null;
        patch();
        schedule();
        return DATA;
      });
  }

  function loadUniverse() {
    if (DATA.universe) return Promise.resolve(DATA.universe);
    return getJSON("/api/market-universe").then(function (u) {
      DATA.universe = (u && u.ok) ? u : null;
      patch();
      return DATA.universe;
    });
  }

  function loadBdoDetail() {
    if (DATA.stockBDO && DATA.disclosuresBDO) return Promise.resolve({ stock: DATA.stockBDO, disclosures: DATA.disclosuresBDO });
    return Promise.all([getJSON("/api/stock/BDO"), getJSON("/api/pse/disclosures/BDO")]).then(function (r) {
      DATA.stockBDO = r[0] || null;
      DATA.disclosuresBDO = (r[1] && r[1].disclosures) ? r[1].disclosures : null;
      patch();
      return { stock: DATA.stockBDO, disclosures: DATA.disclosuresBDO };
    });
  }

  function loadPseStocks() {
    if (DATA.pseStocks) return Promise.resolve(DATA.pseStocks);
    return getJSON("/api/pse/stocks").then(function (r) {
      DATA.pseStocks = (r && r.data) ? r.data : (r && r.success ? r.data : null);
      patch();
      return DATA.pseStocks;
    });
  }

  function searchApi(query) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve(null);
    if (DATA.searchCache[q]) return Promise.resolve(DATA.searchCache[q]);
    return getJSON('/api/search?q=' + encodeURIComponent(q) + '&limit=12').then(function (r) {
      DATA.searchCache[q] = r || null;
      return DATA.searchCache[q];
    });
  }

  function loadAlerts() {
    if (DATA.alerts) return Promise.resolve(DATA.alerts);
    return getJSON('/api/alerts?limit=20').then(function (r) {
      DATA.alerts = r && r.alerts ? r.alerts : null;
      patch();
      return DATA.alerts;
    });
  }

  function loadResearchProfile() {
    if (DATA.researchProfile) return Promise.resolve(DATA.researchProfile);
    return getJSON('/api/research-profile').then(function (r) {
      DATA.researchProfile = r || null;
      patch();
      return DATA.researchProfile;
    });
  }

  var timers = [];
  function schedule() {
    if (timers.length) return;
    var t = setInterval(function () { load(); }, 45000);
    timers.push(t);
  }

  function patch() {
    if (!DATA.pulse && !DATA.summary) return;
    patchTape();
    patchStatus();
    patchBreadth();
    window.dispatchEvent(new CustomEvent("stockex:data", { detail: DATA }));
  }

  function findTape() {
    var cds = document.querySelectorAll(".cd");
    for (var i = 0; i < cds.length; i++) {
      var t = cds[i].innerText || "";
      if (/market is/i.test(t) && /index|shares|financials|property|gainers/i.test(t)) return cds[i];
    }
    return null;
  }

  function sectorLeadPrice(sector) {
    var m = DATA.pulse; if (!m) return null;
    var sec = (m.sectors || []).filter(function (s) { return s.sector === sector; })[0];
    if (!sec) return null;
    var by = {}; (m.quotes || []).forEach(function (q) { by[q.symbol] = q; });
    var best = null;
    (sec.members || []).forEach(function (sym) {
      var q = by[sym]; if (!q) return;
      if (!best || Math.abs(q.changePercent) >= Math.abs(best.changePercent)) best = q;
    });
    return best ? best.price : null;
  }

  function buildTapeCells() {
    var m = DATA.pulse; var sum = DATA.summary; var cells = [];
    // Real sector lookup
    var secByName = {};
    (m ? m.sectors || [] : []).forEach(function (s) { secByName[s.sector] = s; });
    var secChange = function (name) { return secByName[name] ? secByName[name].avgChangePercent : null; };
    var secLead = function (name) { return secByName[name] ? sectorLeadPrice(name) : null; };
    // Real "All Shares" = average price across the live quote feed
    var allShares = null, avgPrice = null;
    if (m && m.quotes && m.quotes.length) {
      var ps = m.quotes.filter(function (q) { return typeof q.price === "number"; });
      if (ps.length) avgPrice = ps.reduce(function (a, b) { return a + b.price; }, 0) / ps.length;
    }
    var indexLevel = (sum && sum.index) ? sum.index.psei : null;
    var indexChg = (sum && sum.index) ? sum.index.pseiChangePercent : (m ? m.indexChangePercent : null);

    // Keep the design's exact tape labels; fill each with real data where available.
    if (indexLevel != null) cells.push({ name: "PSE Index", value: fmt(indexLevel, 2), change: pct(indexChg) });
    else if (m) cells.push({ name: "PSE Index", value: null, change: pct(m.indexChangePercent) });

    cells.push({ name: "All Shares", value: fmt(avgPrice, 2), change: pct(m ? m.indexChangePercent : indexChg) });

    ["Financials", "Property"].forEach(function (label) {
      var c = secChange(label), v = secLead(label);
      if (c == null && m && m.sectors && m.sectors.length) {
        // design label absent in real feed -> use the next strongest real sector
        var alt = m.sectors.slice().sort(function (a, b) { return Math.abs(b.avgChangePercent) - Math.abs(a.avgChangePercent); })[0];
        label = alt.sector; c = alt.avgChangePercent; v = sectorLeadPrice(label);
      }
      cells.push({ name: label, value: fmt(v, 2), change: pct(c) });
    });
    return cells;
  }

  function patchTape() {
    var tape = findTape(); if (!tape) return;
    var cells = buildTapeCells();
    var idx = 0;
    for (var i = 0; i < tape.children.length; i++) {
      var cell = tape.children[i];
      if (!/border-right/.test(cell.getAttribute("style") || "")) continue;
      if (idx >= cells.length) break;
      var c = cells[idx++];
      var labelEl = cell.querySelector('[style*="text-transform: uppercase"]') || cell.querySelector('div[style*="letter-spacing: 0.09em"]');
      if (labelEl && c.name) labelEl.textContent = c.name;
      var spans = cell.querySelectorAll("span.n");
      if (spans.length >= 2) {
        if (c.value) spans[0].textContent = c.value;
        if (c.change) { spans[1].textContent = c.change; spans[1].style.color = c.change.indexOf("-") !== 0 ? "#1A7F37" : "#D93025"; }
      }
    }
  }

  function patchStatus() {
    var tape = findTape(); if (!tape) return;
    var st = DATA.status; if (!st) return;
    var open = statusOpen(st); if (open === null) return;
    for (var i = 0; i < tape.children.length; i++) {
      var cell = tape.children[i];
      if (!/market is|closes|opens/i.test(cell.innerText || "")) continue;
      var dot = cell.querySelector("span[style*='border-radius: 50%']");
      var firstLine = cell.querySelector('[style*="font-size: 13px"]') || cell.querySelector("div");
      var secondLine = cell.querySelector(".lb") || cell.children[1];
      if (firstLine) { firstLine.textContent = open ? "Market is Open" : "Market is Closed"; firstLine.style.color = open ? "#1A7F37" : "#6B6B66"; }
      if (secondLine) secondLine.textContent = open ? "Closes 3:30 PM PHT" : "Opens 9:30 AM PHT";
      if (dot) dot.style.background = open ? "#1A7F37" : "#9A9A94";
    }
  }

  function patchBreadth() {
    var m = DATA.pulse; var sum = DATA.summary;
    var adv = sum ? sum.advancers : (m ? m.breadth.advancers : null);
    var dec = sum ? sum.decliners : (m ? m.breadth.decliners : null);
    var unc = sum ? sum.unchanged : (m ? m.breadth.unchanged : null);
    if (adv == null || dec == null || unc == null) return;
    if (!/advancing/i.test(document.body.innerText || "")) return;
    var total = adv + dec + unc || 1;
    var advPct = (adv / total) * 100, decPct = (dec / total) * 100;
    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var t;
    while ((t = walk.nextNode())) {
      if (/^\d+ advancing$/.test(t.data || "")) t.data = adv + " advancing";
      else if (/^\d+ declining$/.test(t.data || "")) t.data = dec + " declining";
      else if (/^\d+ unchanged$/.test(t.data || "")) t.data = unc + " unchanged";
    }
    document.querySelectorAll('div[style*="height: 5px"] span[style*="width"], div[style*="height:5px"] span[style*="width"]').forEach(function (el) {
      var st = el.getAttribute("style") || "";
      if (st.indexOf("#1A7F37") > -1 || st.indexOf("rgb(26, 127, 55)") > -1) el.style.width = advPct.toFixed(1) + "%";
      else if (st.indexOf("#D93025") > -1 || st.indexOf("rgb(217, 48, 37)") > -1) el.style.width = decPct.toFixed(1) + "%";
    });
  }

  var lastPatch = 0;
  var mo = new MutationObserver(function () {
    var now = Date.now();
    if (now - lastPatch < 300) return;
    lastPatch = now;
    patch();
  });
  if (document.body) mo.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(load, 300); });
  else setTimeout(load, 300);

  window.StockEXData = { data: DATA, load: load, loadUniverse: loadUniverse, loadBdoDetail: loadBdoDetail, loadPseStocks: loadPseStocks, searchApi: searchApi, loadAlerts: loadAlerts, loadResearchProfile: loadResearchProfile, patch: patch, fmt: fmt, pct: pct };
})();
