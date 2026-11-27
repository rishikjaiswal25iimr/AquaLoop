import "./style.css";
import "@google/model-viewer";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);
Chart.defaults.font.family = "Inter, 'Segoe UI', system-ui, sans-serif";
Chart.defaults.color = "#4b5b6c";
Chart.defaults.plugins.legend.labels.boxWidth = 12;

// Brand + product palette (product colours match the CAD model and drawings)
const COL = { navy: "#0f294d", teal: "#0d9e9e", aqua: "#5bc8eb", amber: "#e8a33d", slate: "#8a9aab", red: "#c2453d", green: "#2e8b57", light: "#cfe3ee" };
const PROD = { housing: "#132a4f", mount: "#8c949e", tank: "#8cd9ed", water: "#3f8fdc", lid: "#85dbcc", tap: "#a7afb8", inlet: "#33a854", overflow: "#f28721", level: "#00c8e6", module: "#2b3038", safeguard: "#0d9e9e" };
const SEQ = ["#0f294d", "#0d9e9e", "#5bc8eb", "#e8a33d", "#8a9aab", "#2e8b57", "#c2453d", "#9b7fd1"];
const LIK = ["#c9d5df", "#a7bfd0", "#7fc1d0", "#2fa9a9", "#0b7f7f"];

let A = null, R = null, CAD = null;
let charts = [];
const state = { dataset: "practice", segment: "All respondents", theme: null };

// ------------------------------------------------------------------ helpers
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const inr = (v) => (v == null || isNaN(v) ? "—" : "₹" + Math.round(v).toLocaleString("en-IN"));
const lakh = (v) => (v == null ? "—" : "₹" + (v / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 1 }) + " L");
const num = (v, d = 0) => (v == null || isNaN(v) ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d }));
const pct = (v, d = 1) => (v == null ? "—" : Number(v).toFixed(d) + "%");

// Source chips link straight to the external source
function src(ids) {
  return String(ids).split(/[,\s/]+/).filter((x) => /^R\d+$/.test(x)).map((id) => {
    const s = R.sources.find((x) => x.id === id);
    return s && s.url ? `<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.name)}">${id}</a>` : "";
  }).join("");
}
const withSrc = (text) => esc(text).replace(/\(((?:R|C)\d+(?:[,\s/]+(?:R|C)\d+)*)\)/g, (m, ids) => src(ids)).replace(/\s?\((?:C\d+)\)/g, "");
const kpi = (v, l, s = "", cls = "") => `<div class="kpi ${cls}"><div class="v">${v}</div><div class="l">${l}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
const card = (title, body, extra = "", cls = "") => `<div class="card ${cls}">${title ? `<h3>${title}${extra ? `<span>${extra}</span>` : ""}</h3>` : ""}${body}</div>`;
const chartBox = (id, cls = "") => `<div class="chart ${cls}"><canvas id="${id}"></canvas></div>`;
const sect = (t) => `<h3 class="section-title">${t}</h3>`;
const details = (title, body) => `<details class="more"><summary>${title}</summary><div class="more-body">${body}</div></details>`;
const insights = (arr) => `<div class="grid g3 mt">${arr.map((i) => `<div class="insight"><h4>${esc(i.title)}</h4>${i.evidence ? `<div class="ev">${withSrc(i.evidence)}</div>` : ""}${i.decision ? `<div class="dec">${esc(i.decision)}</div>` : ""}</div>`).join("")}</div>`;
function table(cols, rows, opts = {}) {
  const th = cols.map((c) => `<th class="${c.num ? "num" : ""}">${c.h}</th>`).join("");
  const tr = rows.map((r, i) => `<tr class="${opts.rowClass ? opts.rowClass(r, i) : ""}">${cols.map((c) => `<td class="${c.num ? "num" : ""} ${c.cls || ""}">${c.f ? c.f(r, i) : esc(r[c.k])}</td>`).join("")}</tr>`).join("");
  return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tr}${opts.foot || ""}</tbody></table></div>`;
}
const list = (arr) => `<ul class="clean">${arr.map((x) => `<li>${withSrc(x)}</li>`).join("")}</ul>`;
const swatch = (c) => `<span class="sw" style="background:${c}"></span>`;
const img = (p, alt) => `<div class="img-card"><img src="${p}" alt="${esc(alt)}" data-zoom /></div>`;

function mk(id, cfg) {
  const el = document.getElementById(id);
  if (!el) return null;
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: 350 } }, cfg.options || {});
  if (cfg.options.indexAxis === "y") { const sc = (cfg.options.scales = cfg.options.scales || {}); sc.y = sc.y || {}; sc.y.ticks = Object.assign({ autoSkip: false }, sc.y.ticks || {}); }
  const c = new Chart(el, cfg);
  charts.push(c);
  return c;
}
const wrap = (t, n = 20) => { if (String(t).length <= n) return t; const w = String(t).split(" "); const out = [""]; w.forEach((x) => { if ((out[out.length - 1] + " " + x).trim().length > n) out.push(x); else out[out.length - 1] = (out[out.length - 1] + " " + x).trim(); }); return out; };
const barH = (items, color = COL.teal, valKey = "count", label = "Respondents", extra = {}) => ({
  type: "bar",
  data: { labels: items.map((x) => wrap(x.label)), datasets: [{ label, data: items.map((x) => x[valKey]), backgroundColor: color, borderRadius: 5 }] },
  options: Object.assign({ indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} (${items[c.dataIndex].pct ?? ""}%)` } } }, scales: { x: { beginAtZero: true, grid: { color: "#eef2f5" } }, y: { grid: { display: false }, ticks: { autoSkip: false } } } }, extra),
});
const barV = (items, color = COL.teal, label = "Respondents") => ({
  type: "bar",
  data: { labels: items.map((x) => x.label), datasets: [{ label, data: items.map((x) => x.count), backgroundColor: color, borderRadius: 5 }] },
  options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} (${items[c.dataIndex].pct}%)` } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#eef2f5" } }, x: { grid: { display: false } } } },
});
const doughnut = (items) => ({
  type: "doughnut",
  data: { labels: items.map((x) => x.label), datasets: [{ data: items.map((x) => x.count), backgroundColor: SEQ, borderWidth: 2, borderColor: "#fff" }] },
  options: { cutout: "58%", plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} (${items[c.dataIndex].pct}%)` } } } },
});
const likertBar = (st, label) => ({
  type: "bar",
  data: { labels: ["1", "2", "3", "4", "5"], datasets: [{ label, data: [1, 2, 3, 4, 5].map((i) => st.dist[i]), backgroundColor: LIK, borderRadius: 5 }] },
  options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { title: { display: true, text: "Rating (1 = low, 5 = high)" }, grid: { display: false } } } },
});

function S() {
  const ds = A.survey[state.dataset] || A.survey.practice;
  return ds[state.segment] || ds["All respondents"];
}
const sourceTag = () => state.dataset === "practice"
  ? `<span class="pill amber" title="Generated practice responses — replaced automatically when genuine responses are added to the survey workbook">Practice responses · n=${S().n}</span>`
  : `<span class="pill green">Customer survey · n=${S().n}</span>`;
function surveyControls() {
  const dsOpts = Object.keys(A.survey).filter((k) => A.survey[k]).map((k) => `<option value="${k}" ${k === state.dataset ? "selected" : ""}>${k === "practice" ? "Practice responses" : "Customer survey"}</option>`).join("");
  const segs = Object.keys(A.survey[state.dataset]).map((k) => `<option ${k === state.segment ? "selected" : ""}>${esc(k)}</option>`).join("");
  return `<div class="controls filterbar"><select id="dsSel" aria-label="Dataset">${dsOpts}</select><select id="segSel" aria-label="Segment">${segs}</select>${sourceTag()}</div>`;
}
function bindSurveyControls(rerender) {
  $("#dsSel")?.addEventListener("change", (e) => { state.dataset = e.target.value; state.segment = "All respondents"; rerender(); });
  $("#segSel")?.addEventListener("change", (e) => { state.segment = e.target.value; rerender(); });
}
function slider(id, label, min, max, step, val, fmt = "") {
  return `<div class="slider"><label for="${id}">${label}</label><output id="${id}o">${val}</output><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" data-fmt="${fmt}"/></div>`;
}
function bindSliders(ids, fn) {
  const show = (el, o) => { o.textContent = el.dataset.fmt === "inr" ? inr(+el.value) : el.dataset.fmt === "lakh" ? lakh(+el.value) : (+el.value).toLocaleString("en-IN"); };
  ids.forEach((id) => { const el = $("#" + id), o = $("#" + id + "o"); el.addEventListener("input", () => { show(el, o); fn(); }); show(el, o); });
}

// ------------------------------------------------------------------ navigation
const TABS = [
  { id: "overview", t: "Overview", d: "Executive summary of the proposed AquaLoop innovation.", render: tOverview },
  { id: "opportunity", t: "Opportunity & Market", d: "Market opportunity, competitor gaps and strategic fit.", render: tOpportunity },
  { id: "customers", t: "Customer Insights", d: "What RO households do today, what hurts, and what they value.", render: tCustomers },
  { id: "specs", t: "Product Specifications", d: "Customer needs translated into target specifications and priorities.", render: tSpecs },
  { id: "concepts", t: "Concept Selection", d: "Four concepts screened and scored — one selected.", render: tConcepts },
  { id: "testing", t: "Concept Testing", d: "Usefulness, intent, willingness to pay and design refinements.", render: tTesting },
  { id: "architecture", t: "Product Architecture", d: "Eight modules on a shared housing — repairable and upgradeable.", render: tArchitecture },
  { id: "prototype", t: "Product Prototype", d: "Interactive 3D model, sketches, exploded assembly and working diagrams.", render: tPrototype },
  { id: "sustainability", t: "Sustainability & Manufacturing", d: "Water recovered, materials, make-or-buy and supply chain.", render: tSustainability },
  { id: "risk", t: "Product Risk & Service", d: "Key risks, mitigations and the customer service journey.", render: tRisk },
  { id: "economics", t: "Product Economics", d: "Price, unit economics, break-even and financial scenarios.", render: tEconomics },
  { id: "commercial", t: "Commercialization", d: "Target, positioning, launch plan and final recommendation.", render: tCommercial },
];

function shell() {
  $("#nav").innerHTML = TABS.map((t, i) => `<a href="#${t.id}" data-id="${t.id}"><span class="num">${String(i + 1).padStart(2, "0")}</span>${t.t}</a>`).join("");
  $("#sidefoot").innerHTML = `Proposed Aquaguard concept by Eureka Forbes Ltd (brand context only).<br/><span class="tiny">Not an existing, announced or endorsed Eureka Forbes product.</span>`;
  window.addEventListener("hashchange", route);
  document.addEventListener("click", (e) => {
    const z = e.target.closest("[data-zoom]");
    if (z) { const lb = $("#lightbox"); lb.querySelector("img").src = z.src; lb.classList.add("on"); }
    else if (e.target.closest("#lightbox")) $("#lightbox").classList.remove("on");
  });
  route();
}
function route() {
  const id = (location.hash || "#overview").slice(1);
  const tab = TABS.find((t) => t.id === id) || TABS[0];
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.id === tab.id));
  render(tab);
  window.scrollTo(0, 0);
}
function render(tab) {
  charts.forEach((c) => c.destroy()); charts = [];
  const i = TABS.indexOf(tab);
  $("#main").innerHTML = `<div class="topbar"><div><div class="kicker">${String(i + 1).padStart(2, "0")} · AquaLoop</div><h2>${tab.t}</h2><p class="lead">${tab.d}</p></div></div><div id="body"></div>`;
  tab.render($("#body"), () => render(tab));
}

// ================================================================== 01 OVERVIEW
const FEATURES = [
  ["Universal retrofit", "Fits the existing RO — no new purifier", PROD.inlet],
  ["Automatic overflow bypass", "Excess water goes to the drain, never the floor", PROD.overflow],
  ["Detachable 5 / 10 L tank", "Lift out to empty and clean", PROD.tank],
  ["Level indicator", "Low · Half · Full at a glance", PROD.level],
  ["Front dispensing tap", "Fill a mop bucket — no lifting", PROD.tap],
  ["Optional appliance module", "Conditional on water testing & OEM approval", PROD.module],
];
function tOverview(el) {
  const k = A.kpis, o = A.content.overview, e = A.economics, opp = A.content.opportunity;
  el.innerHTML = `
  <div class="hero">
    <div class="hero-img"><img src="/images/render_hero.png" alt="AquaLoop concept render" data-zoom /></div>
    <div class="hero-text">
      <div class="pill" style="background:rgba(91,200,235,.18);color:#bfe9f6">Proposed Aquaguard line extension</div>
      <h2 style="margin-top:10px">AquaLoop</h2>
      <div style="color:#9cc9e6">Modular RO reject-water recovery & redistribution system</div>
      <div class="vp">“${esc(o.value_proposition)}”</div>
      <div class="feat-grid">${FEATURES.map(([t, d, c]) => `<div class="feat">${swatch(c)}<div><b>${t}</b><span>${d}</span></div></div>`).join("")}</div>
    </div>
  </div>
  <div class="grid g4" style="margin-top:16px">
    ${kpi(k.median_reject_band + " L", "Typical daily reject water", "Median survey band")}
    ${kpi(esc(k.top_pain), "Top customer pain point", pct(k.top_pain_pct, 0) + " of respondents", "aqua")}
    ${kpi(pct(k.intent_top2_pct, 0), "Stated purchase intent", "Rated 4–5 of 5", "amber")}
    ${kpi(inr(k.recommended_price), "Recommended launch price", "10 L core · range " + esc(k.price_range))}
    ${kpi((k.annual_recovery_l / 1000).toFixed(1) + " kL", "Water reused / home / year", "Estimate", "aqua")}
    ${kpi(inr(e.unit_economics.contribution), "Contribution per unit", num(e.unit_economics.contribution_margin_pct, 0) + "% margin", "navy")}
    ${kpi(num(e.break_even_units_year1), "Year-1 break-even units", "On ₹80 L first-year fixed costs")}
    ${kpi(k.survey_n + " · " + k.discussions_n, "Survey responses · online discussions", "Customer research base", "navy")}
  </div>
  <div class="grid g3" style="margin-top:16px">
    ${card("The problem", `<p class="small" style="margin:0">${esc(o.problem)}</p>`)}
    ${card("Target customers", list(o.targets))}
    ${card("Strategic fit with Eureka Forbes", `<div class="chips">${opp.strategic_fit.slice(0, 5).map((f) => `<span class="chip" title="${esc(f.fit)}">${esc(f.asset)}</span>`).join("")}</div>
      <p class="small" style="margin:10px 0 0">Eureka Forbes already sells a basic RO Reject Water Tank ${src("R9")} — AquaLoop is its modular, next-generation upgrade.</p>`)}
  </div>
  ${sect("Product development roadmap")}
  <div class="flow">${o.phases.map((p) => {
    const st = /Future|Planned/.test(p.status) ? "future" : /pending|Conceptual/i.test(p.status) ? "partial" : "done";
    return `<div class="flow-step ${st}"><div class="fs-h">${esc(p.phase.replace(/^\d+\.\s*|^\+\s*/, ""))}</div><div class="fs-b">${esc(p.aqualoop)}</div><span class="pill ${st === "done" ? "green" : st === "partial" ? "amber" : "grey"}">${st === "done" ? "Complete" : st === "partial" ? "In progress" : "Planned"}</span></div>`;
  }).join("")}</div>
  ${details("Role in the Eureka Forbes portfolio", `<p class="small" style="margin:0">${withSrc(o.portfolio_role)}</p>`)}`;
}

// ================================================================== 02 OPPORTUNITY
function tOpportunity(el) {
  const o = A.content.opportunity, m = A.market;
  el.innerHTML = `
  <div class="grid g4">
    ${kpi("USD 1.24 bn", "India water purifier market (2025)", `~10% CAGR ${src("R2")}`)}
    ${kpi("~40%", "RO share of market value", `Largest segment ${src("R3")}`, "aqua")}
    ${kpi("39.8%", "RO users already reuse reject water", `Gurugram study ${src("R1")}`, "amber")}
    ${kpi("35%", "Open to an extra storage tank", `Same study ${src("R1")}`, "navy")}
  </div>
  <div class="grid g2" style="margin-top:16px">
    ${card("Competitor gap profile", chartBox("radar", "tall"))}
    ${card("Competitor benchmark (1 = poor, 5 = excellent)", table([{ h: "Option", f: (r) => `<b>${esc(r.name)}</b><div class="tiny muted">${withSrc(r.price)}</div>` }, ...o.competitors.dims.map((d, i) => ({ h: d.replace(" capability", "").replace("Water ", ""), num: true, f: (r) => `<b style="color:${r.scores[i] >= 4 ? COL.teal : r.scores[i] <= 2 ? COL.red : COL.navy}">${r.scores[i]}</b>` }))], o.competitors.rows) + `<p class="tiny muted">Comparative judgement from product listings and public discussions.</p>`)}
  </div>
  ${sect("Market sizing — adjustable estimate")}
  <div class="grid g3">
    ${card("Assumptions", `
      ${slider("mBase", "Installed purifier base 2025 (mn)", 10, 50, 0.5, m.installed_base_2025_mn)}
      ${slider("mRO", "RO share of installed base (%)", 20, 90, 1, m.ro_share_pct)}
      ${slider("mSAM", "Serviceable share (%)", 10, 80, 1, m.serviceable_share_pct)}
      ${slider("mSOM", "Obtainable share over 3 yrs (%)", 0.5, 10, 0.5, m.obtainable_share_3yr_pct)}
      ${slider("mPrice", "Price (₹)", 799, 2999, 100, A.economics.recommended_price)}
      <p class="tiny muted">Anchored on a 19.5 mn installed base (2020) ${src("R5")} grown ~10% p.a. ${src("R2")}.</p>`)}
    ${card("TAM · SAM · SOM", chartBox("mChart"))}
    ${card("Result", `<div id="mOut"></div>`)}
  </div>
  ${sect("Market gap")}
  <div class="grid g4">${o.alternatives.map((a) => `<div class="insight gap"><h4>${esc(a.alt)}</h4><div class="ev">${withSrc(a.problem)}</div></div>`).join("")}</div>
  <div class="grid g2" style="margin-top:16px">
    ${card("Target market", `<div class="tm"><span class="pill">Primary</span><p>${esc(o.markets.primary)}</p></div><div class="tm"><span class="pill navy">Secondary</span><p>${esc(o.markets.secondary)}</p></div>`)}
    ${card("Product mission", `<div class="quote" style="font-size:15px;margin-top:0">${esc(o.mission.description)}</div>
      <div class="grid g2"><div><h4>Objectives</h4>${list(o.mission.objectives)}</div><div><h4>Constraints</h4>${list(o.mission.constraints)}</div></div>`)}
  </div>
  ${details("Strategic fit, market trends and PESTLE", `<div class="grid g3">
    <div><h4>Strategic fit</h4>${table([{ h: "Asset", k: "asset" }, { h: "Fit", f: (r) => withSrc(r.fit) }], o.strategic_fit)}</div>
    <div><h4>Market trends</h4>${list(o.trends)}<h4>Job to be done</h4><p class="small">${esc(o.jtbd.statement)}</p></div>
    <div><h4>PESTLE</h4>${table([{ h: "", k: "factor" }, { h: "", f: (r) => withSrc(r.point) }, { h: "", f: (r) => `<span class="pill ${r.impact === "+" ? "green" : r.impact === "−" ? "red" : "grey"}">${esc(r.impact)}</span>` }], o.pestle)}</div></div>`)}`;

  mk("radar", { type: "radar", data: { labels: o.competitors.dims, datasets: o.competitors.rows.map((r, i) => ({ label: r.name, data: r.scores, borderColor: [COL.slate, COL.amber, COL.navy, COL.teal][i], backgroundColor: i === 3 ? "rgba(13,158,158,.18)" : "transparent", borderWidth: i === 3 ? 3 : 1.6, pointRadius: 2 })) },
    options: { scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, display: false }, pointLabels: { font: { size: 11 } } } }, plugins: { legend: { position: "bottom" } } } });
  const mc = mk("mChart", { type: "bar", data: { labels: ["TAM", "SAM", "SOM (3 yr)"], datasets: [{ data: [0, 0, 0], backgroundColor: [COL.navy, COL.teal, COL.aqua], borderRadius: 6 }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${num(c.raw, 2)} mn households` } } }, scales: { y: { type: "logarithmic", title: { display: true, text: "mn households (log)" } } } } });
  const upd = () => {
    const b = +$("#mBase").value, ro = +$("#mRO").value, sv = +$("#mSAM").value, ob = +$("#mSOM").value, pr = +$("#mPrice").value;
    const tam = b * ro / 100, sam = tam * sv / 100, som = sam * ob / 100;
    $("#mOut").innerHTML = `<div class="stack">
      <div class="result"><div class="small muted">TAM — RO households</div><div class="big">${num(tam, 1)} mn</div><div class="small">≈ ₹${num(tam * 1e6 * pr / 1e7)} cr</div></div>
      <div class="result"><div class="small muted">SAM — reachable & suitable</div><div class="big">${num(sam, 1)} mn</div><div class="small">≈ ₹${num(sam * 1e6 * pr / 1e7)} cr</div></div>
      <div class="result"><div class="small muted">SOM — 3-year obtainable</div><div class="big">${num(som * 1000, 0)}k units</div><div class="small">≈ ₹${num(som * 1e6 * pr / 1e7)} cr</div></div></div>`;
    mc.data.datasets[0].data = [tam, sam, som]; mc.update();
  };
  bindSliders(["mBase", "mRO", "mSAM", "mSOM", "mPrice"], upd); upd();
}

// ================================================================== 03 CUSTOMERS
function tCustomers(el, rerender) {
  const s = S(), d = A.discussions, c = A.content.needs;
  const topFeat = s.features[0];
  const topPain = s.pain.main_pain_point.items.find((x) => x.label !== "No major problem");
  const themeRows = d.rows.filter((r) => !state.theme || r.themes.includes(state.theme));
  const lvl = (L) => c.hierarchy.filter((h) => h.level === L).map((h) => h.need);
  el.innerHTML = `${surveyControls()}
  <div class="grid g5" style="margin-top:12px">
    ${kpi(s.n, "Respondents", esc(state.segment), "navy")}
    ${kpi(esc(s.behaviour.reject_median_band) + " L", "Median daily reject water", `≈ ${s.behaviour.reject_median_midpoint_l} L/day`)}
    ${kpi(esc(topPain?.label), "Main pain point", pct(topPain?.pct, 0) + " of respondents", "aqua")}
    ${kpi(esc(topFeat.feature), "Highest-rated feature", `Mean ${topFeat.mean} / 5`, "amber")}
    ${kpi(pct(s.behaviour.reuse_any_pct, 0), "Already reuse reject water", `vs 39.8% in a Gurugram study ${src("R1")}`)}
  </div>
  <div class="grid g2" style="margin-top:16px">
    ${card("Pain points (ranked)", chartBox("cPain", "tall"))}
    ${card("Feature importance (mean, 1–5)", chartBox("cFeat", "tall"))}
  </div>
  <div class="grid g3" style="margin-top:16px">
    ${card("Current collection method", chartBox("cColl"))}
    ${card("Reuse frequency", chartBox("cReuse"))}
    ${card("Daily reject water (L)", chartBox("cReject"))}
  </div>
  <div class="grid g4" style="margin-top:16px">
    ${card("Housing type", chartBox("cHouse", "short"))}
    ${card("Purifier brand", chartBox("cBrand", "short"))}
    ${card("Preferred capacity", chartBox("cCap", "short"))}
    ${card("Appliance reuse preference", chartBox("cConn", "short"))}
  </div>
  ${sect("Customer insights")}
  ${insights(c.insights)}
  ${sect("Customer needs")}
  <div class="grid g3">
    ${card(`<span class="pill">Primary needs</span>`, list(lvl("Primary")))}
    ${card(`<span class="pill navy">Secondary needs</span>`, list(lvl("Secondary")))}
    ${card(`<span class="pill amber">Latent needs</span>`, list(lvl("Latent")))}
  </div>
  ${card("Voice of Customer", table([{ h: "Customer observation", f: (r) => esc(r.observation) }, { h: "Need", k: "need" }, { h: "AquaLoop feature", f: (r) => `<b>${esc(r.feature)}</b>` }], c.voc), "", "mt")}
  ${sect("Online customer discussions")}
  <div class="grid g2">
    ${card(`Discussion themes · ${d.n} public posts`, chartBox("cThemes", "tall") + `<p class="tiny muted">Existing posts about RO reject water — problem validation, not reactions to AquaLoop.</p>`)}
    ${card("Posts by theme", `<div class="chips" id="themeChips"><span class="chip ${!state.theme ? "on" : ""}" data-t="">All</span>${d.themes.map((t) => `<span class="chip ${state.theme === t.theme ? "on" : ""}" data-t="${esc(t.theme)}">${esc(t.theme)}</span>`).join("")}</div>
      <div class="posts">${themeRows.map((r) => `<a class="post" href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.id)} · ${esc(r.platform)} ↗</b><span>${esc(r.observation)}</span></a>`).join("")}</div>`)}
  </div>
  ${details("Supporting survey detail", `<div class="grid g3">
    <div>${card("Problem severity", chartBox("cSev", "short") + `<p class="tiny muted">Mean ${s.pain.severity.mean} · ${pct(s.pain.severity.top2_pct, 0)} rate 4–5</p>`)}</div>
    <div>${card("Space constraint", chartBox("cSpace", "short") + `<p class="tiny muted">Mean ${s.pain.space.mean} · ${pct(s.pain.space.top2_pct, 0)} rate 4–5</p>`)}</div>
    <div>${card("Dishwasher ownership", chartBox("cDish", "short"))}</div></div>
    <h4>Feature ratings</h4>${table([{ h: "Feature", k: "feature" }, { h: "Mean", num: true, f: (r) => num(r.mean, 2) }, { h: "% rating 4–5", num: true, f: (r) => pct(r.top2_pct) }, { h: "n", num: true, k: "n_valid" }], s.features)}
    <h4>By housing type</h4>${table([{ h: "Segment", k: "segment" }, { h: "n", k: "n", num: true }, { h: "Intent 4–5", num: true, f: (r) => pct(r.intent_top2_pct, 0) }, { h: "Space mean", num: true, f: (r) => num(r.space_mean, 2) }, { h: "Median WTP", num: true, f: (r) => inr(r.wtp_median) }], A.survey[state.dataset]["All respondents"].segments)}
    <p class="tiny muted">Percentages use valid responses for each question. ${state.dataset === "practice" ? "These are generated practice responses; the analysis switches to the genuine survey automatically once responses are added to the workbook." : ""}</p>`)}`;

  bindSurveyControls(rerender);
  document.querySelectorAll("#themeChips .chip").forEach((ch) => ch.addEventListener("click", () => { state.theme = ch.dataset.t || null; rerender(); }));
  mk("cPain", barH(s.pain.main_pain_point.items, s.pain.main_pain_point.items.map((x, i) => (x.label === "No major problem" ? COL.slate : i < 3 ? COL.teal : COL.aqua))));
  mk("cFeat", { type: "bar", data: { labels: s.features.map((f) => f.feature), datasets: [{ label: "Mean importance", data: s.features.map((f) => f.mean), backgroundColor: s.features.map((f, i) => (/Appliance/.test(f.feature) ? COL.amber : i < 4 ? COL.navy : COL.slate)), borderRadius: 5 }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { min: 1, max: 5 }, y: { grid: { display: false } } } } });
  mk("cColl", barH(s.behaviour.collection_method.items, COL.navy));
  mk("cReuse", barV(s.behaviour.reuse_frequency.items, [COL.teal, COL.aqua, COL.light, COL.slate]));
  mk("cReject", barV(s.behaviour.reject_band.items, s.behaviour.reject_band.items.map((x) => (x.label === "Unknown" ? COL.slate : x.label === s.behaviour.reject_median_band ? COL.teal : COL.aqua))));
  mk("cHouse", doughnut(s.profile.housing_type.items));
  mk("cBrand", barH(s.profile.purifier_brand.items, s.profile.purifier_brand.items.map((x) => (x.label === "Aquaguard" ? COL.teal : COL.slate))));
  mk("cCap", barV(s.preferences.capacity.items, [COL.teal, COL.navy, COL.aqua, COL.slate]));
  mk("cConn", barH(s.preferences.reuse_connection.items, s.preferences.reuse_connection.items.map((x) => (/Dishwasher|Washing/.test(x.label) ? COL.amber : COL.teal))));
  mk("cThemes", barH(d.themes.map((t) => ({ label: t.theme, count: t.count, pct: t.pct })), COL.navy, "count", "Posts"));
  document.querySelector("details.more")?.addEventListener("toggle", function once() {
    mk("cSev", likertBar(s.pain.severity, "Severity")); mk("cSpace", likertBar(s.pain.space, "Space")); mk("cDish", doughnut(s.profile.dishwasher_ownership.items));
    this.removeEventListener("toggle", once);
  });
}

// ================================================================== 04 SPECS
function tSpecs(el) {
  const sp = A.content.specs, q = A.qfd, e = A.economics;
  const heat = (v) => (v === 9 ? "h9" : v === 3 ? "h3" : v === 1 ? "h1" : "");
  const raw = Object.fromEntries(q.priorities.map((p) => [p.ec, p]));
  const tiles = [["5 / 10 L", "Modular tank capacity"], ["300 × 140 × 420", "mm footprint (10 L core)"], ["0 spills", "Float bypass to drain"], ["< 20 min", "Technician retrofit install"], ["≥ 2 L/min", "Front tap flow"], ["≤ " + inr(600), "Target unit cost (core " + inr(e.base_unit_cost) + ")"]];
  el.innerHTML = `
  <div class="grid g3 spec-tiles">${tiles.map(([v, l]) => kpi(v, l)).join("")}</div>
  <div class="grid g2" style="margin-top:16px">
    ${card("Technical priorities (from QFD)", chartBox("qChart", "tall"))}
    ${card("House of Quality (compact)", `<div class="table-wrap"><table class="heat compact"><thead><tr><th>Customer need</th><th class="num">Imp.</th>${q.ecs.map((x, i) => `<th class="num" title="${esc(x)}">E${i + 1}</th>`).join("")}</tr></thead>
      <tbody>${q.needs.map((n, r) => `<tr><td>${esc(n.need)}</td><td class="num"><b>${num(n.importance, 1)}</b></td>${q.matrix[r].map((v) => `<td class="c ${heat(v)}">${v || ""}</td>`).join("")}</tr>`).join("")}
      <tr class="total"><td>Priority rank</td><td></td>${q.ecs.map((x) => `<td class="c">${raw[x].rank}</td>`).join("")}</tr></tbody></table></div>
      <div class="ec-key">${q.ecs.map((x, i) => `<span><b>E${i + 1}</b> ${esc(x)}</span>`).join("")}</div>`)}
  </div>
  ${sect("Customer needs → specifications")}
  ${card("", table([{ h: "Customer need", k: "req" }, { h: "Feature", f: (r) => `<b>${esc(r.feature)}</b>` }, { h: "Target", k: "target" }, { h: "Importance", num: true, f: (r) => (r.imp == null ? "—" : `<span class="bar-in" style="--w:${(r.imp / 5) * 100}%">${num(r.imp, 2)}</span>`) }], sp.rows))}
  ${sect("Key trade-offs")}
  ${insights(sp.tradeoffs.map((t) => { const [h, ...rest] = t.split(":"); return { title: h, evidence: rest.join(":").trim() }; }))}
  ${details("Method notes", `<p class="small">Relationship scores 9 / 3 / 1; priority = Σ(importance × relationship). Importance comes from survey mean ratings (affordability from the share of respondents with max WTP below ₹1,500).</p><p class="small">${esc(sp.conjoint_note)}</p>`)}`;
  mk("qChart", { type: "bar", data: { labels: q.priorities.map((p) => wrap(p.ec, 26)), datasets: [{ label: "Relative weight %", data: q.priorities.map((p) => p.pct), backgroundColor: q.priorities.map((p, i) => (/Distribution/.test(p.ec) ? COL.amber : i < 4 ? COL.teal : COL.aqua)), borderRadius: 5 }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: "% of total technical priority" } }, y: { grid: { display: false } } } } });
}

// ================================================================== 05 CONCEPTS
const CONCEPT_SVG = {
  A: `<svg viewBox="0 0 200 110"><rect x="70" y="18" width="60" height="78" rx="6" fill="#cdeef7" stroke="#33475b"/><rect x="74" y="55" width="52" height="38" fill="#3f8fdc"/><rect x="96" y="92" width="8" height="12" fill="#a7afb8"/><path d="M30 25 H70" stroke="#33a854" stroke-width="4"/></svg>`,
  B: `<svg viewBox="0 0 200 110"><rect x="62" y="10" width="76" height="14" rx="4" fill="#132a4f"/><rect x="66" y="24" width="68" height="64" rx="6" fill="#cdeef7" stroke="#33475b"/><rect x="70" y="50" width="60" height="35" fill="#3f8fdc"/><rect x="72" y="30" width="6" height="52" fill="#00c8e6"/><rect x="62" y="88" width="76" height="12" rx="4" fill="#132a4f"/><rect x="104" y="96" width="8" height="12" fill="#a7afb8"/><path d="M62 16 H40 V100" stroke="#f28721" stroke-width="4" fill="none"/></svg>`,
  C: `<svg viewBox="0 0 200 110"><rect x="20" y="20" width="56" height="70" rx="6" fill="#cdeef7" stroke="#33475b"/><rect x="24" y="50" width="48" height="36" fill="#3f8fdc"/><circle cx="100" cy="55" r="12" fill="#a7afb8" stroke="#33475b"/><text x="96" y="59" font-size="10">P</text><path d="M76 55 H88 M112 55 H130 M130 55 V25 H170 M130 55 V85 H170" stroke="#c2453d" stroke-width="3" fill="none"/><rect x="170" y="15" width="22" height="20" fill="#2b3038"/><rect x="170" y="75" width="22" height="20" fill="#2b3038"/></svg>`,
  D: `<svg viewBox="0 0 200 110"><rect x="72" y="10" width="76" height="14" rx="4" fill="#132a4f"/><rect x="76" y="24" width="68" height="64" rx="6" fill="#cdeef7" stroke="#33475b"/><rect x="80" y="50" width="60" height="35" fill="#3f8fdc"/><rect x="82" y="30" width="6" height="52" fill="#00c8e6"/><rect x="72" y="88" width="76" height="12" rx="4" fill="#132a4f"/><rect x="114" y="96" width="8" height="12" fill="#a7afb8"/><path d="M72 16 H62 V100" stroke="#f28721" stroke-width="4" fill="none"/><rect x="20" y="40" width="34" height="56" rx="5" fill="#2b3038"/><rect x="28" y="46" width="12" height="28" fill="#0d9e9e"/><rect x="20" y="80" width="34" height="4" fill="#0d9e9e"/></svg>`,
};
function tConcepts(el) {
  const cs = A.concepts, ct = A.content.concepts;
  const weights = cs.criteria.map((c) => c.weight);
  el.innerHTML = `
  <div class="grid g4">${cs.concepts.map((c) => `<div class="concept ${c.id === cs.selected ? "sel" : ""}">
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="tag">${c.id}</span>${c.id === cs.selected ? `<span class="pill">✓ Selected</span>` : ""}</div>
    <h4 style="margin:6px 0 2px">${esc(c.name)}</h4>${CONCEPT_SVG[c.id]}
    <div class="score-row"><span class="score" id="sc${c.id}">${c.weighted.toFixed(2)}</span><span class="pill ${c.safety_gate.startsWith("Pass") ? "green" : "red"}">${c.safety_gate.startsWith("Pass") ? "Safety gate ✓" : "Safety gate ✕"}</span></div>
    <p class="small" style="margin:6px 0 0">${esc(c.why[0])}</p></div>`).join("")}</div>
  <div class="grid g3" style="margin-top:16px">
    <div class="card span2"><h3>Weighted concept scores (1–5)</h3>${chartBox("wChart", "short")}<div id="wTable"></div></div>
    ${card("Adjust criteria weights", cs.criteria.map((c, i) => slider("w" + i, c.name, 0, 50, 1, c.weight)).join("") + `<div class="small">Total: <b id="wTot"></b> <span class="muted">(normalised)</span></div><button class="btn" id="wReset" style="margin-top:8px">Reset weights</button>`)}
  </div>
  ${sect("Pugh screening vs. basic tank (Concept A)")}
  ${card("", `<div class="table-wrap"><table class="pugh"><thead><tr><th style="text-align:left">Criterion</th>${cs.pugh.concepts.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>
    ${cs.pugh.rows.map((r) => `<tr><td>${esc(r.criterion)}</td>${cs.pugh.concepts.map((c) => `<td class="${r.ratings[c] > 0 ? "pugh-p" : r.ratings[c] < 0 ? "pugh-m" : "pugh-0"}">${r.ratings[c] > 0 ? "+" : r.ratings[c] < 0 ? "−" : "0"}</td>`).join("")}</tr>`).join("")}
    <tr class="total"><td>Net score</td>${cs.pugh.concepts.map((c) => `<td class="ctr">${cs.pugh.totals[c].net > 0 ? "+" : ""}${cs.pugh.totals[c].net}</td>`).join("")}</tr>
    <tr><td><b>Decision</b></td>${cs.pugh.concepts.map((c) => `<td class="small ctr">${esc(cs.pugh.decision[c])}</td>`).join("")}</tr></tbody></table></div>`)}
  ${insights([
    { title: "Selected: Concept D — modular hybrid", evidence: "Highest weighted score and passes the safety gate.", decision: "Launch the passive core; add the appliance module later." },
    { title: "Concept C rejected", evidence: "Default appliance supply fails the mandatory water-safety gate; highest cost and complexity.", decision: "Keep its ideas for the optional module." },
    { title: "Mandatory constraint", evidence: "No link to drinking-water plumbing; no untreated reject water to a dishwasher.", decision: "Appliance supply only after testing, treatment and OEM approval." },
  ])}
  ${details("Morphological chart & SCAMPER", `<div class="grid g2"><div>${`<div class="table-wrap"><table><thead><tr><th>Function</th><th>Options (selected in teal)</th></tr></thead><tbody>${ct.morph.map((m) => `<tr><td><b>${esc(m.function)}</b></td><td>${m.options.map((o, i) => `<span class="chip ${i === m.chosen ? "on-teal" : ""}">${esc(o)}</span>`).join(" ")}</td></tr>`).join("")}</tbody></table></div>`}</div>
    <div>${table([{ h: "SCAMPER", f: (r) => `<b>${esc(r.lens)}</b>` }, { h: "Idea", k: "idea" }], ct.scamper)}</div></div>`)}`;
  const ids = cs.criteria.map((_, i) => "w" + i);
  const ch = mk("wChart", { type: "bar", data: { labels: cs.concepts.map((c) => "Concept " + c.id), datasets: [{ data: [], backgroundColor: [], borderRadius: 6 }] }, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 5 } } } });
  const upd = () => {
    const w = ids.map((id) => +$("#" + id).value); const tot = w.reduce((a, b) => a + b, 0) || 1;
    $("#wTot").textContent = tot + "%";
    const scores = cs.concepts.map((c) => c.scores.reduce((a, s, i) => a + s * w[i], 0) / tot);
    const best = Math.max(...scores.filter((_, i) => cs.concepts[i].safety_gate.startsWith("Pass")));
    cs.concepts.forEach((c, i) => { const e = $("#sc" + c.id); if (e) e.textContent = scores[i].toFixed(2); });
    $("#wTable").innerHTML = `<div class="table-wrap"><table class="compact"><thead><tr><th>Criterion</th><th class="num">Weight</th>${cs.concepts.map((c) => `<th class="num">${c.id}</th>`).join("")}</tr></thead><tbody>
      ${cs.criteria.map((cr, i) => `<tr><td>${esc(cr.name)}</td><td class="num">${(100 * w[i] / tot).toFixed(0)}%</td>${cs.concepts.map((c) => `<td class="num">${c.scores[i]}</td>`).join("")}</tr>`).join("")}
      <tr class="total"><td>Weighted score</td><td></td>${scores.map((s) => `<td class="num" style="${s === best ? "color:#0b7f7f" : ""}">${s.toFixed(2)}</td>`).join("")}</tr></tbody></table></div>`;
    ch.data.datasets[0].data = scores; ch.data.datasets[0].backgroundColor = cs.concepts.map((c, i) => (!c.safety_gate.startsWith("Pass") ? COL.red : scores[i] === best ? COL.teal : COL.slate)); ch.update();
  };
  bindSliders(ids, upd); upd();
  $("#wReset").addEventListener("click", () => { ids.forEach((id, i) => { $("#" + id).value = weights[i]; $("#" + id + "o").textContent = weights[i]; }); upd(); });
}

// ================================================================== 06 TESTING
function tTesting(el, rerender) {
  const s = S(), ct = s.concept_test, t = A.content.testing, d = A.discussions;
  el.innerHTML = `${surveyControls()}
  <div class="grid g5" style="margin-top:12px">
    ${kpi(pct(ct.usefulness.top2_pct, 0), "Find the concept useful", `Mean ${ct.usefulness.mean} / 5`)}
    ${kpi(pct(ct.intent.top2_pct, 0), "Stated purchase intent", `Calibrated ≈ ${pct(ct.calibrated_intent_pct, 0)}`, "amber")}
    ${kpi(inr(ct.wtp.median), "Median willingness to pay", `IQR ${inr(ct.wtp.p25)}–${inr(ct.wtp.p75)}`, "navy")}
    ${kpi(pct(ct.appliance_importance.top2_pct, 0), "Value appliance integration", `Mean ${ct.appliance_importance.mean} / 5`, "aqua")}
    ${kpi(inr(ct.extra_wtp.median), "Extra WTP for appliance module", `Module cost ≈ ${inr(A.economics.module_unit_cost)}`, "amber")}
  </div>
  <div class="grid g3" style="margin-top:16px">
    <div class="card span2"><h3>Price acceptance <span class="pill grey">stated, not a demand curve</span></h3>${chartBox("tAcc", "tall")}
      ${slider("tPrice", "Test a price (₹)", 0, 3000, 1, A.economics.recommended_price, "inr")}<div class="result" id="tAccOut"></div></div>
    ${card("Purchase concerns", chartBox("tConcern", "tall"))}
  </div>
  <div class="grid g4" style="margin-top:16px">
    ${card("Purchase intention", chartBox("tIntent", "short"))}
    ${card("Usefulness", chartBox("tUse", "short"))}
    ${card("Willingness to pay", chartBox("tWtp", "short"))}
    ${card("Extra WTP — appliance module", chartBox("tExtra", "short"))}
  </div>
  ${sect("Feedback → design refinements")}
  ${card("", table([{ h: "Customer concern", f: (r) => `<b>${esc(r.concern)}</b>` }, { h: "Mentions", num: true, k: "n" }, { h: "Design refinement", k: "improvement" }, { h: "Expected benefit", k: "benefit" }], t.feedback_to_design))}
  ${sect("Validation status")}
  <div class="grid g3">
    <div class="card"><h3>AquaLoop concept reactions <span class="pill red">Pending</span></h3><p class="small" style="margin-top:0">No direct reactions to AquaLoop collected yet. Next: post the concept image, collect genuine survey responses (target n ≥ 60) and compare with current results.</p>
      ${img("/images/render_angle.png", "AquaLoop concept for posting")}<a class="btn primary" style="display:inline-block;margin-top:8px;text-decoration:none" href="/images/render_angle.png" download>Download concept image</a></div>
    <div class="card span2"><h3>Online discussions <span class="pill navy">problem validation · not AquaLoop reactions</span></h3>
      <div class="posts two">${d.rows.map((r) => `<a class="post" href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.id)} · ${esc(r.platform)} ↗</b><span>${esc(r.observation)}</span><em>→ ${esc(r.implication)}</em></a>`).join("")}</div></div>
  </div>
  ${details("Concept-test template & plan", `<p class="small">Record for each post: ${t.template_fields.map(esc).join(" · ")}.</p>${list(t.plan)}<p class="small muted">${esc(t.stated_vs_actual)}</p>`)}`;

  bindSurveyControls(rerender);
  const acc = ct.wtp.acceptance;
  const vline = { id: "vline", afterDraw(c) { const p = +$("#tPrice")?.value; if (isNaN(p)) return; const x = c.scales.x.getPixelForValue(p); const { top, bottom } = c.chartArea; const g = c.ctx; g.save(); g.strokeStyle = COL.amber; g.setLineDash([5, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(x, top); g.lineTo(x, bottom); g.stroke(); g.restore(); } };
  const accChart = mk("tAcc", { type: "line", data: { datasets: [{ label: "% accepting", data: acc.map((a) => ({ x: a.price, y: a.accept_pct })), borderColor: COL.teal, backgroundColor: "rgba(13,158,158,.12)", fill: true, stepped: true, pointRadius: 0 }] },
    options: { parsing: false, plugins: { legend: { display: false } }, scales: { x: { type: "linear", min: 0, max: 3000, title: { display: true, text: "Price (₹, incl. GST)" } }, y: { min: 0, max: 100, title: { display: true, text: "% of respondents" } } } }, plugins: [vline] });
  const wtpVals = ct.wtp.dist; const n = wtpVals.reduce((a, b) => a + b.count, 0);
  const updAcc = () => { const p = +$("#tPrice").value; const k = wtpVals.filter((x) => x.value >= p).reduce((a, b) => a + b.count, 0);
    $("#tAccOut").innerHTML = `At <b>${inr(p)}</b>: <span class="big">${(100 * k / n).toFixed(1)}%</span> of respondents (${k} of ${n}) would pay this much or more.`; accChart.update(); };
  bindSliders(["tPrice"], updAcc); updAcc();
  mk("tConcern", barH(s.pain.purchase_concern.items, COL.amber));
  mk("tIntent", likertBar(ct.intent, "Intent"));
  mk("tUse", likertBar(ct.usefulness, "Usefulness"));
  mk("tWtp", { type: "bar", data: { labels: ct.wtp.dist.map((x) => x.label), datasets: [{ data: ct.wtp.dist.map((x) => x.count), backgroundColor: COL.navy, borderRadius: 5 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
  mk("tExtra", { type: "bar", data: { labels: ct.extra_wtp.dist.map((x) => x.label), datasets: [{ data: ct.extra_wtp.dist.map((x) => x.count), backgroundColor: COL.amber, borderRadius: 5 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
}

// ================================================================== 07 ARCHITECTURE
function archSVG() {
  const box = (x, y, w, h, t, s, c) => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="${x}" y="${y}" width="8" height="${h}" rx="4" fill="${c}"/><text x="${x + w / 2 + 4}" y="${y + h / 2 - 3}" text-anchor="middle" font-size="13" font-weight="700" fill="#0f294d">${t}</text><text x="${x + w / 2 + 4}" y="${y + h / 2 + 14}" text-anchor="middle" font-size="10.5" fill="#5b6b7c">${s}</text></g>`;
  const ln = (x1, y1, x2, y2, c, d = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2.5" ${d ? `stroke-dasharray="${d}"` : ""} marker-end="url(#ah${c.slice(1)})"/>`;
  const cols = [PROD.inlet, PROD.overflow, PROD.water, COL.navy, PROD.safeguard];
  return `<svg class="arch" viewBox="0 0 980 430" xmlns="http://www.w3.org/2000/svg">
  <defs>${cols.map((c) => `<marker id="ah${c.slice(1)}" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${c}"/></marker>`).join("")}</defs>
  <rect x="10" y="10" width="640" height="410" rx="16" fill="#f2fafa" stroke="#bfe4e4"/><text x="26" y="34" font-size="12" font-weight="800" fill="#0b7f7f">PASSIVE CORE — LAUNCH PRODUCT</text>
  <rect x="670" y="10" width="300" height="410" rx="16" fill="#eef0f3" stroke="#9aa3ad" stroke-dasharray="6 4"/><text x="686" y="34" font-size="12" font-weight="800" fill="#2b3038">OPTIONAL — CONDITIONAL MODULE</text>
  ${box(30, 60, 180, 64, "3 · Inlet & retrofit", "push-fit tee on reject line", PROD.inlet)}
  ${box(240, 170, 190, 90, "2 · Storage tank", "detachable, translucent 5/10 L", PROD.water)}
  ${box(460, 60, 170, 64, "5 · Overflow bypass", "float → household drain", PROD.overflow)}
  ${box(460, 300, 170, 64, "6 · Dispensing tap", "manual utility reuse", PROD.tap)}
  ${box(30, 300, 180, 64, "4 · Level indicator", "L / ½ / F window", PROD.level)}
  ${box(240, 330, 190, 70, "1 · Main housing", "frame · base tray · header", PROD.housing)}
  ${box(700, 150, 240, 70, "7 · Distribution module", "isolation · backflow · pump", PROD.module)}
  ${box(700, 280, 240, 70, "8 · Quality safeguard", "test / treat → OEM-approved", PROD.safeguard)}
  ${ln(210, 100, 260, 168, PROD.inlet)} ${ln(430, 195, 470, 128, PROD.overflow)} ${ln(420, 260, 480, 298, PROD.water)} ${ln(210, 320, 238, 260, COL.navy, "4 3")}
  ${ln(335, 330, 335, 264, COL.navy, "4 3")} ${ln(430, 220, 696, 190, PROD.safeguard, "7 5")} ${ln(820, 222, 820, 276, PROD.safeguard)} ${ln(940, 315, 966, 315, PROD.safeguard)}
  <text x="540" y="250" font-size="10.5" fill="#0b7f7f">side interface</text>
  <g font-size="11" fill="#5b6b7c"><line x1="30" y1="412" x2="60" y2="412" stroke="${PROD.water}" stroke-width="3"/><text x="66" y="416">water flow</text><line x1="150" y1="412" x2="180" y2="412" stroke="${COL.navy}" stroke-width="3" stroke-dasharray="4 3"/><text x="186" y="416">mounting</text><line x1="270" y1="412" x2="300" y2="412" stroke="${PROD.safeguard}" stroke-width="3" stroke-dasharray="7 5"/><text x="306" y="416">conditional flow</text></g></svg>`;
}
function tArchitecture(el) {
  const a = A.content.architecture;
  el.innerHTML = `
  <div class="grid g3">
    <div class="card span2"><h3>Modular architecture</h3>${archSVG()}</div>
    ${card("Exploded assembly", img("/images/exploded_labelled.png", "Labelled exploded assembly"))}
  </div>
  ${sect("Eight functional modules")}
  <div class="grid g4">${CAD.modules.map((m, i) => `<div class="module"><div class="m-sw" style="background:${m.color}"></div><div><div class="tiny muted">${String(i + 1).padStart(2, "0")} · ${i < 6 ? "Core" : "Optional"}</div><b>${esc(m.label)}</b><div class="small muted">${esc(m.function)}</div></div></div>`).join("")}</div>
  <div class="grid g3" style="margin-top:16px">
    ${card("Why modular", `<div class="benefits">${a.advantages.map((x) => `<span class="benefit">✓ ${esc(x)}</span>`).join("")}</div>`)}
    ${card("Repair & maintenance", list(["Replace tap, float or tank individually — no full-unit swap", "Spare kits via the Aquaguard service network", "Lift-out tank and wide-mouth lid for cleaning in minutes", "Appliance module snaps on later — disabled by default"]))}
    ${card("Product variants", `<div class="chips">${a.variants.map((v) => `<span class="chip">${esc(v)}</span>`).join("")}</div>`)}
  </div>
  ${sect("Industrial design")}
  <div class="grid g3">
    <div class="card span2"><div class="id-grid">${a.id.map((r) => `<div><b>${esc(r.principle)}</b><span>${esc(r.application)}</span></div>`).join("")}</div></div>
    ${card("Front view", img("/images/render_front.png", "Front view render"))}
  </div>
  ${details("Modular vs integral comparison", table([{ h: "Aspect", k: "aspect" }, { h: "Modular (chosen)", f: (r) => `<b>${esc(r.modular)}</b>` }, { h: "Integral", k: "integral" }], a.modular_vs_integral))}`;
}

// ================================================================== 08 PROTOTYPE
const GALLERY = [
  ["sketch", "2D sketch", "/drawings/product_sketch.svg"],
  ["exploded", "Exploded assembly", "/images/exploded_labelled.png"],
  ["exploded2d", "Exploded (2D)", "/drawings/exploded_view.svg"],
  ["working", "Internal working", "/drawings/internal_working.svg"],
  ["flow", "Water flow & appliance integration", "/drawings/water_flow.svg"],
  ["render", "Product render", "/images/render_hero.png"],
  ["board", "Prototype board", "/images/prototype_board.png"],
];
function tPrototype(el) {
  el.innerHTML = `
  <div class="viewer-wrap">
    <model-viewer id="mv" src="/models/aqualoop.glb" camera-controls touch-action="pan-y" camera-orbit="-28deg 72deg auto" field-of-view="28deg" shadow-intensity="1.2" exposure="1.0" tone-mapping="neutral" environment-image="neutral" interaction-prompt="auto" alt="AquaLoop 3D model">
      ${CAD.modules.map((m, i) => `<button class="hotspot" slot="hotspot-${m.key}" data-position="${m.hotspot.exploded}" data-normal="0m 1m 0m"><b>${i + 1}</b>${esc(m.label.split(" (")[0])}</button>`).join("")}
    </model-viewer>
    <div class="viewer-bar">
      <div class="seg"><button class="btn active" data-src="/models/aqualoop.glb">Assembled</button><button class="btn" data-src="/models/aqualoop_exploded.glb">Exploded</button></div>
      <div class="seg"><button class="btn" data-orbit="0deg 88deg auto">Front</button><button class="btn" data-orbit="90deg 88deg auto">Side</button><button class="btn" data-orbit="0deg 8deg auto">Top</button><button class="btn" data-orbit="-28deg 72deg auto">3/4</button></div>
      <div class="seg"><button class="btn" id="zIn" title="Zoom in">＋</button><button class="btn" id="zOut" title="Zoom out">－</button><button class="btn" id="mvRot">Rotate</button><button class="btn" id="mvReset">Reset</button></div>
      <a class="btn primary" href="/models/aqualoop_assembly.step" download>⬇ Download STEP CAD</a>
    </div>
    <div class="legend-row">${[["Housing", PROD.housing], ["Mounting", PROD.mount], ["Tank", PROD.tank], ["Water", PROD.water], ["Lid / grip", PROD.lid], ["Tap", PROD.tap], ["Inlet", PROD.inlet], ["Overflow", PROD.overflow], ["Level", PROD.level], ["Optional module", PROD.module], ["Safeguard", PROD.safeguard]].map(([l, c]) => `<span>${swatch(c)}${l}</span>`).join("")}</div>
  </div>
  <div class="grid g4" style="margin-top:16px">
    ${kpi(`${CAD.overall_mm.width_core}×${CAD.overall_mm.depth}×${CAD.overall_mm.height}`, "Core size (mm, W×D×H)")}
    ${kpi("≈ " + CAD.tank_gross_litres + " L", "Tank volume (10 L core)", "", "aqua")}
    ${kpi(CAD.modules.length, "Major modules", "6 core · 2 optional", "navy")}
    ${kpi("STEP", "Standard CAD format", "Coloured 3D assembly", "amber")}
  </div>
  ${sect("Concept visualizations")}
  <div class="tabs" id="gTabs">${GALLERY.map(([k, l], i) => `<button class="tab ${i === 0 ? "on" : ""}" data-k="${k}">${l}</button>`).join("")}</div>
  <div class="card gallery">${img(GALLERY[0][2], GALLERY[0][1])}</div>
  <p class="tiny muted">Conceptual visuals. The appliance outlet is enabled only after water testing, treatment and appliance-maker approval.</p>`;
  const mv = $("#mv");
  const setHot = () => mv.classList.toggle("show-hot", mv.src.includes("exploded"));
  el.querySelectorAll("[data-src]").forEach((b) => b.addEventListener("click", () => { mv.src = b.dataset.src; mv.cameraOrbit = b.dataset.src.includes("exploded") ? "-48deg 72deg auto" : "-28deg 72deg auto"; el.querySelectorAll("[data-src]").forEach((x) => x.classList.toggle("active", x === b)); setHot(); }));
  el.querySelectorAll("[data-orbit]").forEach((b) => b.addEventListener("click", () => { mv.cameraOrbit = b.dataset.orbit; }));
  const zoom = (f) => { const o = mv.getCameraOrbit(); mv.cameraOrbit = `${o.theta}rad ${o.phi}rad ${Math.max(0.2, o.radius * f)}m`; };
  $("#zIn").addEventListener("click", () => zoom(0.8)); $("#zOut").addEventListener("click", () => zoom(1.25));
  $("#mvRot").addEventListener("click", (e) => { mv.autoRotate = !mv.autoRotate; e.target.classList.toggle("active", mv.autoRotate); });
  $("#mvReset").addEventListener("click", () => { mv.cameraOrbit = "-28deg 72deg auto"; mv.cameraTarget = "auto auto auto"; mv.fieldOfView = "28deg"; mv.autoRotate = false; $("#mvRot").classList.remove("active"); });
  el.querySelectorAll("#gTabs .tab").forEach((b) => b.addEventListener("click", () => {
    el.querySelectorAll("#gTabs .tab").forEach((x) => x.classList.toggle("on", x === b));
    const g = GALLERY.find((x) => x[0] === b.dataset.k); $(".gallery").innerHTML = img(g[2], g[1]);
  }));
}

// ================================================================== 09 SUSTAINABILITY
function tSustainability(el) {
  const su = A.content.sustainability, w = A.water.defaults, fe = A.content.feasibility, e = A.economics;
  el.innerHTML = `
  <div class="grid g4" id="wKpis"></div>
  <div class="grid g3" style="margin-top:16px">
    ${card("Water recovery calculator", `
      ${slider("wR", "Daily reject water (L)", 1, 60, 0.5, w.daily_reject_l)}
      ${slider("wP", "Recoverable share (%)", 10, 100, 5, w.recoverable_pct)}
      ${slider("wS", "Storage capacity (L)", 5, 30, 5, w.storage_l)}
      ${slider("wD", "Reuse demand (L/day)", 1, 40, 1, w.reuse_demand_l)}
      ${slider("wN", "Days of use per year", 30, 365, 5, w.days)}
      <p class="tiny muted">Reused per day = min(reject × recoverable %, storage, demand). Estimate.</p>`)}
    ${card("Annual reuse by tank size", chartBox("wChart", "tall") + `<div id="wBind" class="small"></div>`)}
    ${card("Sustainability benefits", `<div class="impact">${su.matrix.map((r) => `<div class="imp"><span class="pill ${/High \+|Medium \+/.test(r.impact) ? "green" : r.impact === "Neutral" ? "grey" : "navy"}">${esc(r.impact)}</span><b>${esc(r.dimension)}</b><span>${esc(r.lever)}</span></div>`).join("")}</div>`)}
  </div>
  ${sect("Materials & make-or-buy")}
  ${card("", table([{ h: "Component", k: "item" }, { h: "Material", k: "material" }, { h: "Process", k: "process" }, { h: "Make / buy", f: (r) => `<span class="pill ${/Make/.test(r.make_buy) ? "navy" : "grey"}">${/Make/.test(r.make_buy) ? "Make" : "Buy"}</span>` }, { h: "Cost", num: true, f: (r) => inr(r.cost) }], e.bom_base, { foot: `<tr class="total"><td colspan="4">Unit cost incl. freight & scrap</td><td class="num">${inr(e.base_unit_cost)}</td></tr>` }))}
  ${sect("Supply chain")}
  <div class="flow">${su.supply_chain.slice(0, 7).map((s) => `<div class="flow-step done"><div class="fs-h">${esc(s.stage)}</div><div class="fs-b">${esc(s.plan.split(";")[0])}</div></div>`).join("")}</div>
  ${sect("Water-quality check for appliance reuse")}
  <div class="grid g4">${fe.points.map((r) => `<div class="wq ${/Never|Not/.test(r.status) ? "no" : /Conditional|Pre-soak/.test(r.status) ? "cond" : "ok"}"><b>${esc(r.use)}</b><span>${esc(r.status)}</span>${src(r.src)}</div>`).join("")}</div>
  <p class="small muted">Reject-water TDS of 279–1,616 mg/L ${src("R13")} can exceed the ~800 ppm dishwasher limit ${src("R15")} — so appliance supply stays conditional. TDS alone does not establish safety.</p>
  ${details("Design for Environment", list(su.dfe))}`;
  const ch = mk("wChart", { type: "bar", data: { labels: [5, 10, 15, 20, 30].map((x) => x + " L"), datasets: [{ label: "kL / year", data: [], backgroundColor: [], borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: "kL per year" } } } } });
  const calc = (R_, P, Sc, D) => { const cap = R_ * P / 100; return { used: Math.min(cap, Sc, D), cap }; };
  const upd = () => {
    const R_ = +$("#wR").value, P = +$("#wP").value, Sc = +$("#wS").value, D = +$("#wD").value, N = +$("#wN").value;
    const { used, cap } = calc(R_, P, Sc, D);
    $("#wKpis").innerHTML = kpi(num(used, 1) + " L", "Reused per day", "Per household") + kpi(num(used * N / 12, 0) + " L", "Per month", "", "aqua") + kpi(num(used * N / 1000, 2) + " kL", "Per year", "", "navy") + kpi(num(used * N * 1e5 / 1e6, 0) + " ML", "Per year at 100,000 homes", "Million litres", "amber");
    $("#wBind").innerHTML = `Limiting factor: <b>${used === cap ? "reject supply" : used === Sc ? "storage capacity" : "reuse demand"}</b>`;
    const sizes = [5, 10, 15, 20, 30];
    ch.data.datasets[0].data = sizes.map((s) => (calc(R_, P, s, D).used * N) / 1000);
    ch.data.datasets[0].backgroundColor = sizes.map((s) => (s === Sc ? COL.teal : COL.light)); ch.update();
  };
  bindSliders(["wR", "wP", "wS", "wD", "wN"], upd); upd();
}

// ================================================================== 10 RISK & SERVICE
function tRisk(el) {
  const r = A.content.robust, f = A.fmea;
  const high = f.filter((x) => x.rpn >= 150).length, med = f.filter((x) => x.rpn >= 100 && x.rpn < 150).length;
  el.innerHTML = `
  <div class="grid g4">
    ${kpi(f.length, "Failure modes assessed", "Simplified FMEA", "navy")}
    ${kpi(high, "High risks (RPN ≥ 150)", esc(f[0].failure), "amber")}
    ${kpi(med, "Medium risks (RPN 100–149)", "")}
    ${kpi(f[0].rpn, "Highest RPN", "Severity × occurrence × detection", "aqua")}
  </div>
  <div class="grid g2" style="margin-top:16px">
    ${card("Risk matrix — severity vs occurrence (bubble = RPN)", chartBox("rMatrix", "tall"))}
    ${card("Top risks & mitigations", `<div class="risks">${f.slice(0, 5).map((x) => `<div class="risk"><span class="pill ${x.rpn >= 150 ? "red" : x.rpn >= 100 ? "amber" : "green"}">${x.rpn}</span><div><b>${esc(x.failure)}</b><span>${esc(x.mitigation)}</span></div></div>`).join("")}</div>`)}
  </div>
  ${sect("Customer service journey")}
  <div class="journey">${r.journey.map((j, i) => `<div class="step"><div class="tiny muted">${String(i + 1).padStart(2, "0")}</div><h4>${esc(j.stage)}</h4><div class="small">${esc(j.touchpoint)}</div><div class="small" style="margin-top:6px;color:#0b7f7f"><b>Aquaguard:</b> ${esc(j.ef_support)}</div></div>`).join("")}</div>
  ${sect("Designing for real-world variation")}
  <div class="grid g3">${r.variations.map((v) => `<div class="insight"><h4>${esc(v.noise)}</h4><div class="ev">${withSrc(v.range)}</div><div class="dec">${esc(v.response)}</div></div>`).join("")}</div>
  ${card("Intellectual property", `<div class="benefits">${["Basic reject-water tanks already exist (R9, R10) — core idea not novel", "Differentiate via integrated passive overflow + slim modular housing", "Register the housing design; prior-art search before any patent", "Aquaguard master brand; check ‘AquaLoop’ trademark"].map((x) => `<span class="benefit">${withSrc(x)}</span>`).join("")}</div>`, "", "mt")}
  ${details("Full FMEA table", table([{ h: "Failure", k: "failure" }, { h: "Customer impact", k: "effect" }, { h: "S", num: true, k: "S" }, { h: "O", num: true, k: "O" }, { h: "D", num: true, k: "D" }, { h: "RPN", num: true, f: (x) => `<b>${x.rpn}</b>` }, { h: "Mitigation", k: "mitigation" }, { h: "Validation", k: "validation" }], f))}`;
  mk("rMatrix", { type: "bubble", data: { datasets: f.map((x, i) => ({ label: x.failure, data: [{ x: x.O + (i % 2 ? 0.12 : -0.12), y: x.S, r: Math.sqrt(x.rpn) * 1.6 }], backgroundColor: x.rpn >= 150 ? "rgba(194,69,61,.7)" : x.rpn >= 100 ? "rgba(232,163,61,.75)" : "rgba(46,139,87,.65)" })) },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label} — RPN ${f[c.datasetIndex].rpn}` } } }, scales: { x: { min: 0, max: 8, title: { display: true, text: "Occurrence (1–10)" } }, y: { min: 2, max: 10, title: { display: true, text: "Severity (1–10)" } } } } });
}

// ================================================================== 11 ECONOMICS
function tEconomics(el) {
  const e = A.economics, a = e.assumptions, ue = e.unit_economics, n = A.content.economics_notes;
  const bomCols = [{ h: "Item", k: "item" }, { h: "Material", k: "material" }, { h: "Make/Buy", f: (r) => (/Make/.test(r.make_buy) ? "Make" : "Buy") }, { h: "Basis", f: (r) => withSrc(r.basis) }, { h: "Cost", num: true, f: (r) => inr(r.cost) }];
  const tip = (t) => `<span class="info" title="${esc(t)}">ⓘ</span>`;
  el.innerHTML = `
  <div class="grid g5">
    ${kpi(inr(e.recommended_price), "Recommended price " + tip("10 L core, incl. 18% GST. Bundle/attach price ₹1,299; 5 L ≈ ₹1,199."), "Range " + esc(a.price_range))}
    ${kpi(inr(e.base_unit_cost), "Manufacturing cost " + tip("Indicative BOM incl. 5% inbound freight & scrap"), "Per unit", "navy")}
    ${kpi(inr(ue.contribution), "Contribution per unit " + tip("Net realisation − manufacturing − 5% other variable"), "Net realisation " + inr(ue.net_realisation), "aqua")}
    ${kpi(num(ue.contribution_margin_pct, 1) + "%", "Contribution margin", "Of net realisation")}
    ${kpi(num(e.break_even_units_year1), "Break-even volume " + tip("First-year fixed costs ₹80 L ÷ contribution"), "Units, year 1", "amber")}
  </div>
  <div class="grid g3" style="margin-top:16px">
    ${card("Pricing & break-even calculator", `${slider("bP", "Selling price incl. GST", 799, 2999, 1, e.recommended_price, "inr")}${slider("bC", "Manufacturing cost / unit", 300, 1200, 1, e.base_unit_cost, "inr")}${slider("bM", "Channel margin (% ex-GST)", 0, 45, 1, a.channel_margin_pct)}${slider("bO", "Other variable (% of net)", 0, 15, 1, a.other_variable_pct)}${slider("bF", "First-year fixed costs", 2000000, 20000000, 500000, e.first_year_fixed, "lakh")}${slider("bV", "Year-1 volume (units)", 5000, 150000, 1000, a.scenarios.Base[0])}`)}
    ${card("Break-even chart", chartBox("bChart", "tall") + `<div id="bOut" class="result" style="margin-top:8px"></div>`)}
    ${card("Unit economics", chartBox("wfChart", "tall") + `<div id="bMargin" class="small"></div>`)}
  </div>
  ${sect("Financial scenarios")}
  <div class="grid g3">
    <div class="card span2"><h3>Three-year outlook ${tip(`t0 = −${lakh(a.one_time_investment)} (tooling, development, pilot); years 1–3 = units × contribution − ${lakh(a.annual_fixed_opex)} fixed opex; discount rate ${a.discount_rate_pct}%; no terminal value.`)}</h3>
      ${table([{ h: "Scenario", f: (r) => `<b>${r.name}</b>` }, { h: "Units Y1 / Y2 / Y3", f: (r) => r.years.map((y) => num(y.units / 1000) + "k").join(" / ") }, { h: "Net revenue (3 yr)", num: true, f: (r) => lakh(r.years.reduce((s, y) => s + y.net_revenue, 0)) }, { h: "Contribution (3 yr)", num: true, f: (r) => lakh(r.years.reduce((s, y) => s + y.contribution, 0)) }, { h: "Payback", num: true, f: (r) => (r.payback_years == null ? "> 3 yrs" : num(r.payback_years, 1) + " yrs") }, { h: `NPV`, num: true, f: (r) => `<b style="color:${r.npv >= 0 ? COL.green : COL.red}">${lakh(r.npv)}</b>` }], Object.entries(e.scenarios).map(([name, v]) => ({ name, ...v })))}
      ${chartBox("cfChart", "short")}</div>
    ${card("Price vs acceptance", chartBox("pChart", "tall") + `<p class="tiny muted">Bars: unit contribution. Line: % of respondents accepting the price.</p>`)}
  </div>
  ${insights([
    { title: `Launch at ${inr(e.recommended_price)}`, evidence: `${pct(e.wtp_reference.accept_at_recommended, 0)} accept; competitors ₹1,249 (R9) and ₹1,410 (R10).`, decision: `Attach price ${inr(a.bundle_price)} with a purifier or AMC widens reach to ${pct(e.wtp_reference.accept_at_bundle, 0)}.` },
    { title: "₹1,499–2,999 hypothesis: lower end only", evidence: `Median stated WTP ${inr(e.wtp_reference.median)}; few accept above ₹1,999.`, decision: "Validate price with genuine respondents before tooling." },
    { title: "Appliance module stays out of launch P&L", evidence: `Cost ${inr(e.module_unit_cost)} vs median extra WTP ${inr(e.wtp_reference.extra_wtp_median)}.`, decision: "Pilot only, after OEM approval." },
  ])}
  ${details("Indicative Bill of Materials", `<div class="grid g2"><div><h4>Base product — 10 L core</h4>${table(bomCols, e.bom_base, { foot: `<tr class="total"><td colspan="4">Total incl. ${a.inbound_scrap_pct}% freight & scrap</td><td class="num">${inr(e.base_unit_cost)}</td></tr>` })}</div>
    <div><h4>Optional appliance module</h4>${table(bomCols, e.bom_module, { foot: `<tr class="total"><td colspan="4">Total incl. ${a.inbound_scrap_pct}% freight & scrap</td><td class="num">${inr(e.module_unit_cost)}</td></tr>` })}</div></div>`)}
  ${details("Financial assumptions", list(a.notes))}`;

  const g = e.price_grid;
  mk("pChart", { type: "bar", data: { labels: g.map((x) => inr(x.price)), datasets: [
    { type: "line", label: "% accepting", data: g.map((x) => x.accept_pct), borderColor: COL.teal, backgroundColor: COL.teal, yAxisID: "y", tension: 0.2 },
    { type: "bar", label: "Contribution ₹", data: g.map((x) => x.contribution), backgroundColor: g.map((x) => (x.price === e.recommended_price ? COL.navy : x.contribution < 0 ? COL.red : COL.light)), yAxisID: "y1", borderRadius: 4 }] },
    options: { plugins: { legend: { position: "bottom" } }, scales: { y: { min: 0, max: 100, title: { display: true, text: "% accepting" } }, y1: { position: "right", grid: { display: false } } } } });
  const bc = mk("bChart", { type: "line", data: { labels: [], datasets: [{ label: "Year-1 profit (₹ L)", data: [], borderColor: COL.teal, backgroundColor: "rgba(13,158,158,.1)", fill: true, pointRadius: 0 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: "Units (000)" } }, y: { title: { display: true, text: "₹ lakh" } } } } });
  const wf = mk("wfChart", { type: "bar", data: { labels: ["Price", "GST", "Channel", "Mfg cost", "Other var.", "Contribution"], datasets: [{ data: [], backgroundColor: [COL.navy, COL.slate, COL.slate, COL.amber, COL.slate, COL.teal], borderRadius: 4 }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${inr(c.raw[1] - c.raw[0])}` } } }, scales: { y: { beginAtZero: true, title: { display: true, text: "₹ per unit" } } } } });
  const upd = () => {
    const P = +$("#bP").value, Cc = +$("#bC").value, M = +$("#bM").value, O = +$("#bO").value, F = +$("#bF").value, V = +$("#bV").value;
    const ex = P / (1 + a.gst_pct / 100), ch = ex * M / 100, net = ex - ch, oth = net * O / 100, con = Math.round(net - Cc - oth);
    const be = con > 0 ? Math.ceil(F / con) : null;
    wf.data.datasets[0].data = [[0, P], [ex, P], [net, ex], [net - Cc, net], [con, net - Cc], [0, con]]; wf.update();
    $("#bMargin").innerHTML = `Contribution <b style="color:${con > 0 ? COL.green : COL.red}">${inr(con)}</b> · margin ${net ? ((100 * con) / net).toFixed(1) : "—"}% of net realisation ${inr(net)}`;
    $("#bOut").innerHTML = be ? `Break-even <span class="big">${num(be)}</span> units · profit at ${num(V)}: <b style="color:${V * con - F >= 0 ? COL.green : COL.red}">${lakh(V * con - F)}</b>` : `<b style="color:${COL.red}">Negative contribution — no break-even.</b>`;
    const xs = Array.from({ length: 31 }, (_, i) => i * 5000);
    bc.data.labels = xs.map((x) => x / 1000); bc.data.datasets[0].data = xs.map((x) => (x * con - F) / 1e5); bc.update();
  };
  bindSliders(["bP", "bC", "bM", "bO", "bF", "bV"], upd); upd();
  mk("cfChart", { type: "line", data: { labels: ["t0", "Y1", "Y2", "Y3"], datasets: Object.entries(e.scenarios).map(([k, v], i) => ({ label: k, data: v.cash_flows.reduce((acc, c) => (acc.push((acc.length ? acc[acc.length - 1] : 0) + c), acc), []).map((x) => x / 1e5), borderColor: [COL.amber, COL.teal, COL.navy][i], tension: 0.2 })) }, options: { plugins: { legend: { position: "right" } }, scales: { y: { title: { display: true, text: "Cumulative ₹ L" } } } } });
}

// ================================================================== 12 COMMERCIALIZATION
function tCommercial(el) {
  const c = A.content.commercialization, st = c.stp, e = A.economics;
  const months = 18;
  el.innerHTML = `
  <div class="grid g4">
    ${card("Target segment", `<p class="small" style="margin:0">${esc(st.primary)}</p>`)}
    ${card("Positioning", `<p class="small" style="margin:0">The modular retrofit accessory that captures RO reject water neatly and never overflows — and can grow into a safe redistribution system.</p>`)}
    <div class="card usp"><div class="small">Unique selling proposition</div><div class="big">${esc(st.usp)}</div></div>
    ${kpi(inr(e.recommended_price), "Launch price (10 L core)", `Attach ${inr(e.assumptions.bundle_price)} · 5 L ≈ ₹1,199`, "amber")}
  </div>
  ${sect("Launch roadmap")}
  <div class="flow">${c.roadmap.map((r, i) => `<div class="flow-step ${i === 0 ? "partial" : "future"}"><div class="fs-h">${esc(r.stage.replace(/^\d\.\s*/, ""))}</div><div class="tiny muted">${esc(r.timing)}</div><div class="fs-b"><b>Gate:</b> ${esc(r.gate)}</div></div>`).join("")}</div>
  <div class="grid g2" style="margin-top:16px">
    ${card("Perceptual map", chartBox("perc", "tall"))}
    ${card("Why customers switch to AquaLoop", table([{ h: "Versus", f: (r) => `<b>${esc(r.vs)}</b>` }, { h: "AquaLoop advantage", k: "why" }], c.differentiation))}
  </div>
  ${sect("Marketing mix")}
  <div class="fourp">${Object.entries(c.four_p).map(([k, v]) => `<div class="p"><h4>${k}</h4>${list(v.slice(0, 3))}</div>`).join("")}</div>
  <div class="grid g3" style="margin-top:16px">
    ${card("Customer persona", `<div style="display:flex;gap:12px;align-items:center"><div class="avatar">P</div><div><b>${esc(st.persona.name)}</b><div class="small muted">${esc(st.persona.context)}</div></div></div>
      <div class="small" style="margin-top:10px"><b>Pains:</b> ${esc(st.persona.pains)}<br/><b>Gains:</b> ${esc(st.persona.gains)}<br/><b>Reached via:</b> ${esc(st.persona.channel)}</div>`)}
    <div class="card span2"><h3>Project timeline (months)</h3><div class="gantt"><div class="axis"><div></div><div class="ticks">${Array.from({ length: 7 }, (_, i) => `<span>M${i * 3}</span>`).join("")}</div><div></div></div>
      ${c.gantt.map((g) => `<div class="row"><div>${esc(g.task)}</div><div class="track"><div class="bar ${/Planned/.test(g.status) ? "planned" : /Pending|progress/.test(g.status) ? "pending" : ""}" style="left:${(100 * g.start) / months}%;width:${(100 * g.dur) / months}%"></div></div><div><span class="pill ${/Planned/.test(g.status) ? "grey" : /Pending|progress/.test(g.status) ? "amber" : "green"}">${/Planned/.test(g.status) ? "Planned" : /Pending/.test(g.status) ? "Next" : /progress/.test(g.status) ? "In progress" : "Complete"}</span></div></div>`).join("")}</div></div>
  </div>
  ${sect("Final recommendation")}
  <div class="grid g2">
    <div class="card verdict"><h3 style="color:#fff">Recommendation: proceed to validation and pilot</h3>
      <ul class="clean"><li>A real, everyday problem in millions of RO homes — today solved with buckets.</li><li>Concept D solves the top pains (safety, cleaning, retrofit, overflow) with a simple passive design.</li><li>Leverages Aquaguard's brand, installed base and technicians in 17,000+ pin codes ${src("R8")}.</li><li>Low capital, positive unit economics (${inr(e.unit_economics.contribution)} / unit), platform path to safe appliance reuse.</li></ul></div>
    ${card("Summary", table([{ h: "", f: (r) => `<b>${esc(r.k)}</b>` }, { h: "", f: (r) => withSrc(r.v) }], c.final.filter((x) => !/Market opportunity|Needs addressed/.test(x.k))))}
  </div>
  ${details("Segmentation bases & full positioning statement", `<div class="grid g2"><div><h4>Segmentation bases</h4>${list(st.segmentation)}<h4>Secondary target</h4><p class="small">${esc(st.secondary)}</p></div><div><h4>Positioning statement</h4><p class="small">${esc(st.positioning)}</p></div></div>`)}`;
  mk("perc", { type: "scatter", data: { datasets: c.perceptual.map((p, i) => ({ label: p.name, data: [{ x: p.x, y: p.y }], backgroundColor: p.name === "AquaLoop" ? COL.teal : SEQ[(i + 3) % SEQ.length], pointRadius: p.name === "AquaLoop" ? 12 : 8 })) },
    options: { plugins: { legend: { position: "bottom" } }, scales: { x: { min: 0, max: 5.5, title: { display: true, text: c.perceptual_axes.x } }, y: { min: 0, max: 5.5, title: { display: true, text: c.perceptual_axes.y } } } } });
}

// ------------------------------------------------------------------ boot
Promise.all(["/data/analysis.json", "/data/research.json", "/data/cad_modules.json"].map((u) => fetch(u).then((r) => r.json())))
  .then(([a, r, c]) => { A = a; R = r; CAD = c; state.dataset = a.meta.primary_dataset; shell(); })
  .catch((err) => { $("#main").innerHTML = `<div class="loading">Could not load analysis data (${esc(err.message)}).</div>`; });
