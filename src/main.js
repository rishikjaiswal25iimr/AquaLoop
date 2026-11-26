import "./style.css";
import "@google/model-viewer";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);
Chart.defaults.font.family = "Inter, 'Segoe UI', system-ui, sans-serif";
Chart.defaults.color = "#4b5b6c";
Chart.defaults.plugins.legend.labels.boxWidth = 12;

const COL = { navy: "#0f294d", teal: "#0d9e9e", aqua: "#5bc8eb", amber: "#e8a33d", slate: "#8a9aab", red: "#c2453d", green: "#2e8b57", light: "#cfe3ee" };
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

function src(ids) {
  return String(ids).split(/[,\s]+/).filter((x) => /^[RC]\d+$/.test(x)).map((id) => {
    const s = R.sources.find((x) => x.id === id);
    return `<a class="src" href="#refs" title="${esc(s ? s.name : id)}">${id}</a>`;
  }).join("");
}
const withSrc = (text) => esc(text).replace(/\(((?:R|C)\d+(?:[,\s/]+(?:R|C)\d+)*)\)/g, (m, ids) => src(ids.replace(/\//g, ",")));
const kpi = (v, l, s = "", cls = "") => `<div class="kpi ${cls}"><div class="v">${v}</div><div class="l">${l}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
const card = (title, body, extra = "", cls = "") => `<div class="card ${cls}">${title ? `<h3>${title}${extra ? `<span>${extra}</span>` : ""}</h3>` : ""}${body}</div>`;
const chartBox = (id, cls = "") => `<div class="chart ${cls}"><canvas id="${id}"></canvas></div>`;
const sect = (t) => `<h3 class="section-title">${t}</h3>`;
function table(cols, rows, opts = {}) {
  const th = cols.map((c) => `<th class="${c.num ? "num" : ""}">${c.h}</th>`).join("");
  const tr = rows.map((r, i) => `<tr class="${opts.rowClass ? opts.rowClass(r, i) : ""}">${cols.map((c) => `<td class="${c.num ? "num" : ""} ${c.cls || ""}">${c.f ? c.f(r, i) : esc(r[c.k])}</td>`).join("")}</tr>`).join("");
  return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tr}${opts.foot || ""}</tbody></table></div>`;
}
const list = (arr) => `<ul class="clean">${arr.map((x) => `<li>${withSrc(x)}</li>`).join("")}</ul>`;
const evidencePill = (kind) => ({
  practice: `<span class="pill amber">Practice data — illustrative</span>`,
  actual: `<span class="pill green">Genuine survey data</span>`,
  public: `<span class="pill navy">Public secondary discussion</span>`,
  research: `<span class="pill">Verified research</span>`,
  assumption: `<span class="pill grey">Assumption</span>`,
  design: `<span class="pill">Proposed design response</span>`,
  pending: `<span class="pill red">Pending</span>`,
}[kind]);

function mk(id, cfg) {
  const el = document.getElementById(id);
  if (!el) return null;
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: 350 } }, cfg.options || {});
  const c = new Chart(el, cfg);
  charts.push(c);
  return c;
}
const wrap = (t, n = 20) => { if (String(t).length <= n) return t; const w = String(t).split(" "); const out = [""]; w.forEach((x) => { if ((out[out.length - 1] + " " + x).trim().length > n) out.push(x); else out[out.length - 1] = (out[out.length - 1] + " " + x).trim(); }); return out; };
const barH = (items, color = COL.teal, valKey = "count", label = "Respondents", extra = {}) => ({
  type: "bar",
  data: { labels: items.map((x) => wrap(x.label)), datasets: [{ label, data: items.map((x) => x[valKey]), backgroundColor: Array.isArray(color) ? color : color, borderRadius: 5 }] },
  options: Object.assign({ indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} (${items[c.dataIndex].pct ?? ""}%)` } } }, scales: { x: { beginAtZero: true, grid: { color: "#eef2f5" } }, y: { grid: { display: false } } } }, extra),
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
  options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "Respondents" } }, x: { title: { display: true, text: "Rating (1 = lowest, 5 = highest)" }, grid: { display: false } } } },
});

function S() { // current survey slice
  const ds = A.survey[state.dataset] || A.survey.practice;
  return ds[state.segment] || ds["All respondents"];
}
function dataBanner() {
  const s = S();
  const isPractice = state.dataset === "practice";
  return `<div class="banner ${isPractice ? "warn" : "info"}"><b>${isPractice ? "Practice data" : "Genuine data"}</b>
  <span>${esc(s.label)} · n = ${s.n} valid respondents (${esc(state.segment)}). ${isPractice ? "Simulated responses used to build and demonstrate the analysis — not primary evidence. Percentages use valid-response denominators." : "Genuine responses collected with consent."}
  Genuine responses analysed: <b>${A.kpis.actual_n}</b>.</span></div>`;
}
function surveyControls() {
  const dsOpts = Object.keys(A.survey).filter((k) => A.survey[k]).map((k) => `<option value="${k}" ${k === state.dataset ? "selected" : ""}>${k === "practice" ? "Practice (simulated)" : "Genuine survey"}</option>`).join("");
  const segs = Object.keys(A.survey[state.dataset]).map((k) => `<option ${k === state.segment ? "selected" : ""}>${esc(k)}</option>`).join("");
  return `<div class="controls"><label class="small muted">Dataset</label><select id="dsSel">${dsOpts}</select>
    <label class="small muted">Segment (housing type)</label><select id="segSel">${segs}</select></div>`;
}
function bindSurveyControls(rerender) {
  $("#dsSel")?.addEventListener("change", (e) => { state.dataset = e.target.value; state.segment = "All respondents"; rerender(); });
  $("#segSel")?.addEventListener("change", (e) => { state.segment = e.target.value; rerender(); });
}
const img = (p, alt, cap = "") => `<div class="img-card"><img src="${p}" alt="${esc(alt)}" loading="lazy" data-zoom />${cap ? `<div class="tiny muted" style="margin-top:6px">${cap}</div>` : ""}</div>`;

// ------------------------------------------------------------------ tabs
const TABS = [
  { id: "overview", t: "Project Overview & NPD Process", k: "Tab 1 · Phase 0–5 map", render: tOverview },
  { id: "opportunity", t: "Opportunity & Product Planning", k: "Tab 2 · Sessions 3–4", render: tOpportunity },
  { id: "customers", t: "Customer Insights & Needs", k: "Tab 3 · Session 5", render: tCustomers },
  { id: "specs", t: "Product Specifications & QFD", k: "Tab 4 · Session 6", render: tSpecs },
  { id: "concepts", t: "Concept Generation & Selection", k: "Tab 5 · Sessions 7–8", render: tConcepts },
  { id: "testing", t: "Concept Testing & Refinement", k: "Tab 6 · Session 9", render: tTesting },
  { id: "architecture", t: "Architecture & Industrial Design", k: "Tab 7 · Sessions 10–11", render: tArchitecture },
  { id: "prototype", t: "Prototype & Concept Visualization", k: "Tab 8 · Session 14", render: tPrototype },
  { id: "sustainability", t: "Sustainability, Manufacturing & Supply Chain", k: "Tab 9 · Sessions 12–13", render: tSustainability },
  { id: "robust", t: "Robust Design, IP & Service Design", k: "Tab 10 · Sessions 15–17", render: tRobust },
  { id: "economics", t: "Product Development Economics", k: "Tab 11 · Session 18", render: tEconomics },
  { id: "commercial", t: "Commercialization & Project Management", k: "Tab 12 · Sessions 19–20", render: tCommercial },
  { id: "refs", t: "AI Log, Assumptions & References", k: "Utility", render: tRefs },
];
const LEADS = {
  overview: "How customer and market insight shaped a modular, retrofit RO reject-water accessory — from opportunity to commercialization.",
  opportunity: "Is the problem significant, why do existing alternatives fall short, and does it fit Eureka Forbes?",
  customers: "Python analysis of the survey workbook and thematic coding of public discussions → customer needs and design decisions.",
  specs: "Translating prioritised customer needs into target specifications and a House of Quality.",
  concepts: "Four alternative concepts, structured generation, Pugh screening and weighted scoring under a mandatory water-safety gate.",
  testing: "Stated usefulness, intent and willingness to pay — and how concerns were turned into design improvements.",
  architecture: "Eight functional modules on a shared housing 'bus' — repairable, configurable and upgradeable.",
  prototype: "Conceptual 2D sketch, simplified CAD model, exploded and cutaway views, flow diagram and the one-page prototype board.",
  sustainability: "Design for Environment and Manufacturing at an MBA level — water recovery, materials, make-or-buy and supply chain.",
  robust: "Usage variation, failure risks, intellectual-property position and the service journey.",
  economics: "Indicative BOM, pricing from stated WTP, unit economics with consistent GST treatment, break-even, scenarios and NPV.",
  commercial: "Segmentation, positioning, marketing mix, launch roadmap, project plan and the final recommendation.",
  refs: "How AI was used and critically evaluated, assumptions and limitations, and every source used in the app.",
};

function shell() {
  $("#nav").innerHTML = TABS.map((t, i) => `<a href="#${t.id}" data-id="${t.id}"><span class="num">${i < 12 ? i + 1 : "i"}</span>${t.t}</a>`).join("");
  $("#sidefoot").innerHTML = `IIM Ranchi · NPDD (Term V)<br/>Prof. Shilpi Saxena · WAI assignment<br/>
    <span class="pill ${A.kpis.survey_source === "practice" ? "amber" : "green"}">${A.kpis.survey_source === "practice" ? "Practice data" : "Genuine data"} · n=${A.kpis.survey_n}</span><br/>
    <span class="tiny">Built ${A.meta.generated}. Academic concept — not an existing or announced Eureka Forbes product.</span>`;
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
  const main = $("#main");
  main.innerHTML = `<div class="topbar"><div><div class="kicker">${tab.k}</div><h2>${tab.t}</h2><p class="lead">${LEADS[tab.id]}</p></div></div><div id="body"></div>`;
  tab.render($("#body"), () => render(tab));
}

// ================================================================== TAB 1
function tOverview(el) {
  const k = A.kpis, o = A.content.overview, e = A.economics;
  el.innerHTML = `
  <div class="hero">
    <div class="hero-img"><img src="/images/render_hero.png" alt="AquaLoop concept render" data-zoom /></div>
    <div class="hero-text">
      <div class="pill" style="background:rgba(91,200,235,.18);color:#bfe9f6">Proposed Aquaguard line extension · Eureka Forbes Ltd</div>
      <h2 style="margin-top:10px">Aquaguard AquaLoop</h2>
      <div style="color:#9cc9e6">Modular RO Reject-Water Recovery & Redistribution System</div>
      <div class="vp">“${esc(o.value_proposition)}”</div>
      <dl>
        <dt>Problem</dt><dd>${esc(o.problem)}</dd>
        <dt>Product</dt><dd>${esc(o.description)}</dd>
        <dt>Innovation</dt><dd>${esc(o.innovation)}</dd>
        <dt>Target</dt><dd>${o.targets.map(esc).join(" · ")}</dd>
        <dt>Stage</dt><dd><span class="pill amber">${esc(k.stage)}</span></dd>
      </dl>
    </div>
  </div>
  ${sect("Summary metrics")}
  <div class="grid g4">
    ${kpi(k.survey_n, "Survey responses analysed", "Practice (simulated) data · genuine: " + k.actual_n, "amber")}
    ${kpi(k.discussions_n, "Public discussions coded", "Problem validation, not AquaLoop reactions", "navy")}
    ${kpi(k.median_reject_band + " L", "Median daily reject-water band", `Midpoint ≈ ${k.median_reject_l} L/day (valid n excludes 'Unknown')`)}
    ${kpi(esc(k.top_pain), "Most cited pain point", `${pct(k.top_pain_pct)} of valid responses`, "aqua")}
    ${kpi(pct(k.intent_top2_pct, 0), "Stated purchase intent (4–5)", `Calibrated ≈ ${pct(S().concept_test.calibrated_intent_pct, 0)} — stated ≠ actual demand`, "amber")}
    ${kpi(inr(k.recommended_price), "Recommended launch price (10 L)", `Range ${esc(k.price_range)} · median stated WTP ${inr(k.wtp_median)}`)}
    ${kpi((k.annual_recovery_l / 1000).toFixed(1) + " kL", "Estimated reusable water / home / year", "Assumption-based; see water calculator (Tab 9)", "aqua")}
    ${kpi(num(e.unit_economics.contribution_margin_pct, 0) + "%", "Contribution margin (net realisation)", `Break-even ≈ ${num(e.break_even_units_year1)} units in year 1`, "navy")}
  </div>
  ${sect("Six-phase product development process — applied to AquaLoop")}
  <div class="phases">${o.phases.map((p) => `<div class="phase ${/Future|Planned/.test(p.status) ? "future" : /pending|Conceptual/i.test(p.status) ? "partial" : ""}">
     <h4>${esc(p.phase)}</h4><div class="muted">${esc(p.activities)}</div><div style="margin-top:6px">${esc(p.aqualoop)}</div><div class="st"><span class="pill ${/Future|Planned/.test(p.status) ? "grey" : /pending|Conceptual/i.test(p.status) ? "amber" : "green"}">${esc(p.status)}</span></div></div>`).join("")}</div>
  <div class="grid g2" style="margin-top:16px">
    ${card("Role in the Eureka Forbes portfolio", `<p style="margin:0">${withSrc(o.portfolio_role)}</p>
      <div class="banner info" style="margin-top:12px"><b>Key finding</b><span>Eureka Forbes already lists a basic “Aquaguard RO Reject Water Tank” ${src("R9")}. AquaLoop is therefore positioned as its next-generation, modular upgrade — not a white-space product.</span></div>`)}
    ${card("Project development roadmap", table([{ h: "Stage", k: "stage" }, { h: "Timing", k: "timing" }, { h: "Gate", k: "gate" }], A.content.commercialization.roadmap))}
  </div>
  ${sect("Course framework mapping")}
  ${card("", table([{ h: "Sessions", k: "session" }, { h: "Course topic", k: "topic" }, { h: "App tab", k: "tab" }, { h: "Applied to AquaLoop", k: "application" }], o.course_map), "", "")}
  <p class="tiny muted">Course outline: IIM Ranchi NPDD Term V ${src("C1")}; textbook ${src("C2")}. AquaLoop is an independently proposed academic concept, not an existing or announced Eureka Forbes product.</p>`;
}

// ================================================================== TAB 2
function tOpportunity(el) {
  const o = A.content.opportunity, m = A.market;
  el.innerHTML = `
  <div class="grid g2">
    ${card("Problem significance", `<ul class="clean">${o.significance.map((s) => `<li>${withSrc(s.text)}</li>`).join("")}</ul>`)}
    ${card("Customer problems with existing alternatives", table([{ h: "Alternative", k: "alt" }, { h: "Why it falls short", f: (r) => withSrc(r.problem) }], o.alternatives))}
  </div>
  <div class="grid g3" style="margin-top:16px">
    ${card("Market trends", list(o.trends))}
    ${card("Sustainability opportunity", `<p style="margin:0">${esc(o.sustainability)}</p>`)}
    ${card("Target markets", `<h4>Primary</h4><p style="margin:0">${esc(o.markets.primary)}</p><h4>Secondary</h4><p style="margin:0">${esc(o.markets.secondary)}</p>`)}
  </div>
  ${sect("Jobs to Be Done & PESTLE")}
  <div class="grid g2">
    ${card("Jobs to Be Done", `<div class="quote">${esc(o.jtbd.statement)}</div>
      <div class="grid g3"><div><h4>Functional</h4>${list(o.jtbd.functional)}</div><div><h4>Emotional</h4>${list(o.jtbd.emotional)}</div><div><h4>Social</h4>${list(o.jtbd.social)}</div></div>`)}
    ${card("Brief PESTLE", table([{ h: "Factor", k: "factor" }, { h: "Point", f: (r) => withSrc(r.point) }, { h: "Impact", f: (r) => `<span class="pill ${r.impact === "+" ? "green" : r.impact === "−" ? "red" : "grey"}">${esc(r.impact)}</span>` }], o.pestle))}
  </div>
  ${sect("Competitor benchmarking & market gap")}
  <div class="grid g2">
    ${card("Comparison (1 = poor, 5 = excellent)", table([{ h: "Option", f: (r) => `<b>${esc(r.name)}</b><div class="tiny muted">${withSrc(r.price)}</div>` }, ...o.competitors.dims.map((d, i) => ({ h: d, num: true, f: (r) => `<b style="color:${r.scores[i] >= 4 ? COL.teal : r.scores[i] <= 2 ? COL.red : COL.navy}">${r.scores[i]}</b>` }))], o.competitors.rows) + `<p class="tiny muted">${esc(o.competitors.note)}</p>`)}
    ${card("Gap profile", chartBox("radar", "tall"))}
  </div>
  ${sect("Strategic fit with Eureka Forbes")}
  <div class="grid g2">
    ${card("Assets AquaLoop can leverage", table([{ h: "Asset", k: "asset" }, { h: "Fit", f: (r) => withSrc(r.fit) }], o.strategic_fit))}
    ${card("Product mission statement", `<p style="margin-top:0"><b>Description:</b> ${esc(o.mission.description)}</p>
      <div class="grid g2"><div><h4>Business objectives</h4>${list(o.mission.objectives)}</div><div><h4>Target market</h4><p class="small" style="margin:0">${esc(o.mission.target_market)}</p></div>
      <div><h4>Assumptions</h4>${list(o.mission.assumptions)}</div><div><h4>Constraints</h4>${list(o.mission.constraints)}</div></div>
      <h4>Stakeholders</h4><div class="chips">${o.mission.stakeholders.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>`)}
  </div>
  ${sect("Indicative market sizing (TAM · SAM · SOM) — assumption-based")}
  <div class="grid g3">
    ${card("Adjust assumptions", `
      ${slider("mBase", "Installed purifier base 2025 (mn)", 10, 50, 0.5, m.installed_base_2025_mn)}
      ${slider("mRO", "RO share of installed base (%)", 20, 90, 1, m.ro_share_pct)}
      ${slider("mSAM", "Serviceable share (%)", 10, 80, 1, m.serviceable_share_pct)}
      ${slider("mSOM", "Obtainable share over 3 yrs (%)", 0.5, 10, 0.5, m.obtainable_share_3yr_pct)}
      ${slider("mPrice", "Price (₹)", 799, 2999, 100, A.economics.recommended_price)}`)}
    ${card("Result", `<div id="mOut"></div>`)}
    ${card("Funnel", chartBox("mChart"))}
  </div>
  <div class="banner warn" style="margin-top:12px"><b>Assumptions</b><span>${m.notes.map(withSrc).join(" ")}</span></div>
  ${card("Product planning decision", `<p style="margin:0">${esc(o.planning_decision)}</p>`)}`;

  mk("radar", { type: "radar", data: { labels: o.competitors.dims, datasets: o.competitors.rows.map((r, i) => ({ label: r.name, data: r.scores, borderColor: [COL.slate, COL.amber, COL.navy, COL.teal][i], backgroundColor: i === 3 ? "rgba(13,158,158,.18)" : "transparent", borderWidth: i === 3 ? 3 : 1.6, pointRadius: 2 })) },
    options: { scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, display: false }, pointLabels: { font: { size: 11 } } } }, plugins: { legend: { position: "bottom" } } } });
  const mc = mk("mChart", { type: "bar", data: { labels: ["TAM", "SAM", "SOM (3 yr)"], datasets: [{ data: [0, 0, 0], backgroundColor: [COL.navy, COL.teal, COL.aqua], borderRadius: 6 }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${num(c.raw, 2)} mn households` } } }, scales: { y: { type: "logarithmic", title: { display: true, text: "mn households (log)" } } } } });
  const upd = () => {
    const b = +$("#mBase").value, ro = +$("#mRO").value, sv = +$("#mSAM").value, ob = +$("#mSOM").value, pr = +$("#mPrice").value;
    const tam = b * ro / 100, sam = tam * sv / 100, som = sam * ob / 100;
    $("#mOut").innerHTML = `<table><tr><th>Level</th><th class="num">Households (mn)</th><th class="num">Value (₹ cr)</th></tr>
      <tr><td>TAM — RO households</td><td class="num">${num(tam, 2)}</td><td class="num">${num(tam * 1e6 * pr / 1e7)}</td></tr>
      <tr><td>SAM — reachable & suitable</td><td class="num">${num(sam, 2)}</td><td class="num">${num(sam * 1e6 * pr / 1e7)}</td></tr>
      <tr class="total"><td>SOM — 3-year obtainable</td><td class="num">${num(som * 1000, 0)}k units</td><td class="num">${num(som * 1e6 * pr / 1e7)}</td></tr></table>
      <p class="tiny muted">Cross-check: Base scenario volume (Tab 11) = ${num(A.economics.assumptions.scenarios.Base.reduce((a, b) => a + b, 0) / 1000)}k units over 3 years. One unit per household assumed.</p>`;
    mc.data.datasets[0].data = [tam, sam, som]; mc.update();
  };
  bindSliders(["mBase", "mRO", "mSAM", "mSOM", "mPrice"], upd); upd();
}
function slider(id, label, min, max, step, val, fmt = "") {
  return `<div class="slider"><label for="${id}">${label}</label><output id="${id}o">${val}</output><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" data-fmt="${fmt}"/></div>`;
}
function bindSliders(ids, fn) {
  ids.forEach((id) => { const el = $("#" + id); const o = $("#" + id + "o"); const f = () => { o.textContent = el.dataset.fmt === "inr" ? inr(+el.value) : el.dataset.fmt === "lakh" ? lakh(+el.value) : (+el.value).toLocaleString("en-IN"); fn(); }; el.addEventListener("input", f); o.textContent = el.dataset.fmt === "inr" ? inr(+el.value) : el.dataset.fmt === "lakh" ? lakh(+el.value) : (+el.value).toLocaleString("en-IN"); });
}

// ================================================================== TAB 3
function tCustomers(el, rerender) {
  const s = S(), d = A.discussions, c = A.content.needs;
  const themeRows = d.rows.filter((r) => !state.theme || r.themes.includes(state.theme));
  el.innerHTML = `${surveyControls()}<div style="height:10px"></div>${dataBanner()}
  ${sect("Customer profiling")}
  <div class="grid g4">
    ${card("Housing type", chartBox("cHouse", "short"))}
    ${card("Household size", chartBox("cSize", "short"), `<span class="tiny muted">mean ${num(s.profile.household_size_mean, 1)}</span>`)}
    ${card("Purifier brand", chartBox("cBrand", "short"))}
    ${card("Dishwasher ownership", chartBox("cDish", "short"))}
  </div>
  ${sect("Existing behaviour")}
  <div class="grid g3">
    ${card("Estimated daily reject water (L)", chartBox("cReject"), "", "") }
    ${card("Current collection method", chartBox("cColl"))}
    ${card("Reuse frequency", chartBox("cReuse") + `<p class="tiny muted">Any reuse: ${pct(s.behaviour.reuse_any_pct)} · daily/often: ${pct(s.behaviour.reuse_regular_pct)}. Benchmark: 39.8% reuse in Gurugram study ${src("R1")}.</p>`)}
  </div>
  <p class="tiny muted">Reject-water median band: <b>${esc(s.behaviour.reject_median_band)} L</b> (midpoint ≈ ${s.behaviour.reject_median_midpoint_l} L/day) among ${s.behaviour.reject_known_n} respondents who gave an estimate; ${pct(s.behaviour.reject_unknown_pct)} answered “Unknown” — itself an insight (low awareness, cf. 25.2% accurate estimation in ${src("R1")}).</p>
  ${sect("Pain point analysis")}
  <div class="grid g4">
    ${card("Main pain point (ranked)", chartBox("cPain", "tall"), "", "span2")}
    ${card("Problem severity", chartBox("cSev") + `<p class="tiny muted">Mean ${s.pain.severity.mean} · ${pct(s.pain.severity.top2_pct)} rate 4–5 (n=${s.pain.severity.n_valid})</p>`)}
    ${card("Space constraint", chartBox("cSpace") + `<p class="tiny muted">Mean ${s.pain.space.mean} · ${pct(s.pain.space.top2_pct)} rate 4–5</p>`)}
  </div>
  <div class="grid g2" style="margin-top:16px">
    ${card("Main purchase concerns", chartBox("cConcern") + `<p class="tiny muted">n = ${s.pain.purchase_concern.n_valid} valid (blank answers excluded).</p>`)}
    ${card("Segment cross-tab (housing type)", table([{ h: "Segment", k: "segment" }, { h: "n", k: "n", num: true }, { h: "Intent 4–5", num: true, f: (r) => pct(r.intent_top2_pct, 0) }, { h: "Usefulness mean", num: true, f: (r) => num(r.usefulness_mean, 2) }, { h: "Space mean", num: true, f: (r) => num(r.space_mean, 2) }, { h: "Median WTP", num: true, f: (r) => inr(r.wtp_median) }, { h: "Dishwasher", num: true, f: (r) => pct(r.dishwasher_pct, 0) }], A.survey[state.dataset]["All respondents"].segments) + `<p class="tiny muted">Small sub-samples — directional only.</p>`)}
  </div>
  ${sect("Feature importance")}
  <div class="grid g2">
    ${card("Ranked by mean rating (1–5)", chartBox("cFeat"))}
    ${card("Rating distribution (share of respondents)", chartBox("cFeatDist"))}
  </div>
  ${card("", table([{ h: "Rank", k: "rank", num: true }, { h: "Feature", k: "feature" }, { h: "Mean", num: true, f: (r) => num(r.mean, 2) }, { h: "Median", num: true, f: (r) => r.median }, { h: "% rating 4–5", num: true, f: (r) => pct(r.top2_pct) }, { h: "% rating 1–2", num: true, f: (r) => pct(r.bottom2_pct) }, { h: "n", num: true, k: "n_valid" }], s.features), "", "")}
  ${sect("Product preferences")}
  <div class="grid g3">
    ${card("Preferred storage capacity", chartBox("cCap"))}
    ${card("Preferred installation", chartBox("cInst"))}
    ${card("Preferred reuse connection", chartBox("cConn"))}
  </div>
  ${sect("Customer needs hierarchy & Voice of Customer")}
  <div class="grid g2">
    ${card("Needs hierarchy", table([{ h: "Level", f: (r) => `<span class="pill ${r.level === "Primary" ? "" : r.level === "Secondary" ? "navy" : "amber"}">${r.level}</span>` }, { h: "Need statement", k: "need" }, { h: "Explicit / latent", k: "type" }], c.hierarchy))}
    ${card("Voice of Customer matrix", table([{ h: "Customer observation", f: (r) => withSrc(r.observation) }, { h: "Customer need", k: "need" }, { h: "Product feature", f: (r) => `<b>${esc(r.feature)}</b>` }], c.voc) + `<p class="tiny muted">P01–P07 = public discussion source IDs (below).</p>`)}
  </div>
  ${sect("Public discussion analysis — thematic coding")}
  <div class="banner info"><b>Evidence type</b><span>${esc(d.caveat)}</span></div>
  <div class="grid g2">
    ${card(`Theme frequency across ${d.n} sources`, chartBox("cThemes", "tall") + `<p class="tiny muted">Keyword codebook applied to paraphrased observations and design implications (basic thematic analysis; no NLP/ML). A source can carry several themes.</p>`)}
    ${card("Filter by theme", `<div class="chips" id="themeChips"><span class="chip ${!state.theme ? "on" : ""}" data-t="">All</span>${d.themes.map((t) => `<span class="chip ${state.theme === t.theme ? "on" : ""}" data-t="${esc(t.theme)}">${esc(t.theme)} (${t.count})</span>`).join("")}</div>
      <div style="margin-top:10px">${table([{ h: "ID", k: "id" }, { h: "Platform & link", f: (r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.platform)}</a>` }, { h: "Observation (paraphrased)", k: "observation" }, { h: "Design implication", k: "implication" }], themeRows)}</div>`)}
  </div>
  ${sect("Actionable customer insights")}
  <div class="grid g3">${c.insights.map((i) => `<div class="insight"><h4>${esc(i.title)}</h4><div class="ev">${esc(i.evidence)}</div><div class="dec">${esc(i.decision)}</div></div>`).join("")}</div>
  <p class="tiny muted">Insights are generated from the ${state.dataset === "practice" ? "practice" : "genuine"} dataset (all respondents) and will update automatically when build_project.py is re-run with genuine responses.</p>`;

  bindSurveyControls(rerender);
  document.querySelectorAll("#themeChips .chip").forEach((ch) => ch.addEventListener("click", () => { state.theme = ch.dataset.t || null; rerender(); }));
  mk("cHouse", doughnut(s.profile.housing_type.items));
  mk("cSize", barV(s.profile.household_size.items, COL.navy));
  mk("cBrand", barH(s.profile.purifier_brand.items.map((x) => x), s.profile.purifier_brand.items.map((x) => (x.label === "Aquaguard" ? COL.teal : COL.slate))));
  mk("cDish", doughnut(s.profile.dishwasher_ownership.items));
  mk("cReject", barV(s.behaviour.reject_band.items, s.behaviour.reject_band.items.map((x) => (x.label === "Unknown" ? COL.slate : x.label === s.behaviour.reject_median_band ? COL.teal : COL.aqua))));
  mk("cColl", barH(s.behaviour.collection_method.items, COL.navy));
  mk("cReuse", barV(s.behaviour.reuse_frequency.items, [COL.teal, COL.aqua, COL.light, COL.slate]));
  mk("cPain", barH(s.pain.main_pain_point.items, s.pain.main_pain_point.items.map((x, i) => (x.label === "No major problem" ? COL.slate : i < 3 ? COL.teal : COL.aqua))));
  mk("cSev", likertBar(s.pain.severity, "Severity"));
  mk("cSpace", likertBar(s.pain.space, "Space"));
  mk("cConcern", barH(s.pain.purchase_concern.items, COL.amber));
  mk("cFeat", { type: "bar", data: { labels: s.features.map((f) => f.feature), datasets: [{ label: "Mean importance", data: s.features.map((f) => f.mean), backgroundColor: s.features.map((f) => (/Appliance/.test(f.feature) ? COL.amber : COL.teal)), borderRadius: 5 }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { min: 1, max: 5, title: { display: true, text: "Mean rating" } }, y: { grid: { display: false } } } } });
  mk("cFeatDist", { type: "bar", data: { labels: s.features.map((f) => f.feature), datasets: [1, 2, 3, 4, 5].map((i) => ({ label: String(i), data: s.features.map((f) => (100 * f.dist[i]) / f.n_valid), backgroundColor: LIK[i - 1] })) },
    options: { indexAxis: "y", plugins: { tooltip: { callbacks: { label: (c) => ` rating ${c.dataset.label}: ${c.raw.toFixed(1)}%` } } }, scales: { x: { stacked: true, max: 100, title: { display: true, text: "% of valid respondents" } }, y: { stacked: true, grid: { display: false } } } } });
  mk("cCap", barV(s.preferences.capacity.items, [COL.teal, COL.navy, COL.aqua, COL.slate]));
  mk("cInst", barH(s.preferences.installation.items, COL.navy));
  mk("cConn", barH(s.preferences.reuse_connection.items, s.preferences.reuse_connection.items.map((x) => (/Dishwasher|Washing/.test(x.label) ? COL.amber : COL.teal))));
  mk("cThemes", barH(d.themes.map((t) => ({ label: t.theme, count: t.count, pct: t.pct })), COL.navy, "count", "Sources"));
}

// ================================================================== TAB 4
function tSpecs(el) {
  const sp = A.content.specs, q = A.qfd;
  const heat = (v) => (v === 9 ? "h9" : v === 3 ? "h3" : v === 1 ? "h1" : "");
  const raw = Object.fromEntries(q.priorities.map((p) => [p.ec, p]));
  el.innerHTML = `
  ${card("Target product specifications", table([{ h: "Customer requirement", k: "req" }, { h: "Proposed feature", f: (r) => `<b>${esc(r.feature)}</b>` }, { h: "Indicative target specification", k: "target" }, { h: "Importance (mean 1–5)", num: true, f: (r) => (r.imp == null ? `<span class="muted">—</span>` : num(r.imp, 2)) }, { h: "Design rationale", f: (r) => withSrc(r.why) }], sp.rows) + `<p class="tiny muted">${esc(sp.dimensions)} Importance values come from the ${A.meta.primary_dataset} survey dataset; '—' = not asked in survey.</p>`)}
  ${sect("Simplified House of Quality (QFD)")}
  ${card(`Relationship matrix (${esc(q.scale)}) × customer importance`, `<div class="table-wrap"><table class="heat"><thead><tr><th>Customer need</th><th class="num">Imp.</th>${q.ecs.map((e, i) => `<th class="num" title="${esc(e)}" style="writing-mode:vertical-rl;transform:rotate(180deg);height:170px;white-space:normal;font-size:11.5px">${esc(e)}</th>`).join("")}</tr></thead>
    <tbody>${q.needs.map((n, r) => `<tr><td>${esc(n.need)}<div class="tiny muted">${esc(n.basis)}</div></td><td class="num"><b>${num(n.importance, 2)}</b></td>${q.matrix[r].map((v) => `<td class="c ${heat(v)}">${v || ""}</td>`).join("")}</tr>`).join("")}
    <tr class="total"><td>Technical priority (Σ importance × relationship)</td><td></td>${q.ecs.map((e) => `<td class="c">${num(raw[e].raw, 0)}</td>`).join("")}</tr>
    <tr class="total"><td>Relative weight</td><td></td>${q.ecs.map((e) => `<td class="c">${num(raw[e].pct, 0)}%</td>`).join("")}</tr>
    <tr class="total"><td>Rank</td><td></td>${q.ecs.map((e) => `<td class="c">${raw[e].rank}</td>`).join("")}</tr></tbody></table></div>`)}
  <div class="grid g2" style="margin-top:16px">
    ${card("Calculated technical priorities", chartBox("qChart", "tall"))}
    ${card("Major product trade-offs", list(sp.tradeoffs) + `<div class="banner info" style="margin-top:12px"><b>Conjoint?</b><span>${esc(sp.conjoint_note)}</span></div>`)}
  </div>`;
  mk("qChart", { type: "bar", data: { labels: q.priorities.map((p) => p.ec), datasets: [{ label: "Relative weight %", data: q.priorities.map((p) => p.pct), backgroundColor: q.priorities.map((p, i) => (/Distribution/.test(p.ec) ? COL.amber : i < 4 ? COL.teal : COL.aqua)), borderRadius: 5 }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: "% of total technical priority" } }, y: { grid: { display: false } } } } });
}

// ================================================================== TAB 5
const CONCEPT_SVG = {
  A: `<svg viewBox="0 0 200 110"><rect x="70" y="18" width="60" height="78" rx="6" fill="#d8f1fa" stroke="#33475b"/><rect x="74" y="55" width="52" height="38" fill="#8fd3f0"/><rect x="96" y="92" width="8" height="12" fill="#0d9e9e"/><path d="M30 25 H70" stroke="#0f294d" stroke-width="4"/></svg>`,
  B: `<svg viewBox="0 0 200 110"><rect x="62" y="10" width="76" height="14" rx="4" fill="#fff" stroke="#33475b"/><rect x="66" y="24" width="68" height="64" rx="6" fill="#d8f1fa" stroke="#33475b"/><rect x="70" y="50" width="60" height="35" fill="#8fd3f0"/><rect x="72" y="30" width="6" height="52" fill="#0d9e9e"/><rect x="62" y="88" width="76" height="12" rx="4" fill="#fff" stroke="#33475b"/><rect x="104" y="96" width="8" height="12" fill="#0d9e9e"/><path d="M62 16 H40 V100" stroke="#0f294d" stroke-width="4" fill="none"/></svg>`,
  C: `<svg viewBox="0 0 200 110"><rect x="20" y="20" width="56" height="70" rx="6" fill="#d8f1fa" stroke="#33475b"/><circle cx="100" cy="55" r="12" fill="#fff" stroke="#33475b"/><text x="96" y="59" font-size="10">P</text><path d="M76 55 H88 M112 55 H130 M130 55 V25 H170 M130 55 V85 H170" stroke="#e8a33d" stroke-width="3" fill="none"/><rect x="170" y="15" width="22" height="20" fill="#0f294d"/><rect x="170" y="75" width="22" height="20" fill="#0f294d"/><text x="40" y="104" font-size="9" fill="#c2453d">sensors + pump</text></svg>`,
  D: `<svg viewBox="0 0 200 110"><rect x="72" y="10" width="76" height="14" rx="4" fill="#fff" stroke="#33475b"/><rect x="76" y="24" width="68" height="64" rx="6" fill="#d8f1fa" stroke="#33475b"/><rect x="80" y="50" width="60" height="35" fill="#8fd3f0"/><rect x="82" y="30" width="6" height="52" fill="#0d9e9e"/><rect x="72" y="88" width="76" height="12" rx="4" fill="#fff" stroke="#33475b"/><rect x="114" y="96" width="8" height="12" fill="#0d9e9e"/><rect x="22" y="40" width="34" height="56" rx="5" fill="#fff8ec" stroke="#e8a33d" stroke-dasharray="4 3"/><rect x="30" y="48" width="12" height="28" fill="#5bc8eb"/><text x="16" y="34" font-size="9" fill="#a86a10">optional</text></svg>`,
};
function tConcepts(el) {
  const cs = A.concepts, ct = A.content.concepts;
  const weights = cs.criteria.map((c) => c.weight);
  el.innerHTML = `
  <div class="grid g4">${cs.concepts.map((c) => `<div class="concept ${c.id === cs.selected ? "sel" : ""}"><div style="display:flex;justify-content:space-between;align-items:center"><span class="tag">${c.id}</span>${c.id === cs.selected ? `<span class="pill">Selected</span>` : ""}</div>
    <h4 style="margin:6px 0 2px">${esc(c.name)}</h4>${CONCEPT_SVG[c.id]}<p class="small" style="margin:0">${esc(c.summary)}</p>${list(c.why)}
    <div style="margin-top:8px"><span class="pill ${c.safety_gate.startsWith("Pass") ? "green" : "red"}">Safety gate: ${esc(c.safety_gate)}</span></div></div>`).join("")}</div>
  ${sect("Structured concept generation")}
  <div class="grid g2">
    ${card("Morphological chart (selected path highlighted)", `<div class="table-wrap"><table><thead><tr><th>Sub-function</th><th>Option 1</th><th>Option 2</th><th>Option 3</th></tr></thead><tbody>
      ${ct.morph.map((m) => `<tr><td><b>${esc(m.function)}</b></td>${m.options.map((o, i) => `<td style="${i === m.chosen ? "background:#e6f6f6;font-weight:700;color:#0b7f7f" : ""}">${esc(o)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`)}
    ${card("Selected SCAMPER prompts", table([{ h: "Lens", f: (r) => `<b>${esc(r.lens)}</b>` }, { h: "Idea applied to AquaLoop", k: "idea" }], ct.scamper))}
  </div>
  ${sect("Concept screening — Pugh matrix")}
  ${card(`Baseline (datum): ${esc(cs.pugh.baseline_name)}`, `<div class="table-wrap"><table class="pugh"><thead><tr><th style="text-align:left">Selection criterion</th><th>A (datum)</th>${cs.pugh.concepts.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>
    ${cs.pugh.rows.map((r) => `<tr><td>${esc(r.criterion)}</td><td class="pugh-0">0</td>${cs.pugh.concepts.map((c) => `<td class="${r.ratings[c] > 0 ? "pugh-p" : r.ratings[c] < 0 ? "pugh-m" : "pugh-0"}">${r.ratings[c] > 0 ? "+" : r.ratings[c] < 0 ? "−" : "0"}</td>`).join("")}</tr>`).join("")}
    ${["plus", "same", "minus", "net"].map((k) => `<tr class="total"><td>${{ plus: "Sum +", same: "Sum 0", minus: "Sum −", net: "Net score" }[k]}</td><td class="pugh-0">—</td>${cs.pugh.concepts.map((c) => `<td class="ctr">${cs.pugh.totals[c][k]}</td>`).join("")}</tr>`).join("")}
    <tr><td><b>Decision</b></td><td></td>${cs.pugh.concepts.map((c) => `<td class="small ctr">${esc(cs.pugh.decision[c])}</td>`).join("")}</tr></tbody></table></div>`)}
  ${sect("Weighted concept scoring (1–5 scale) — adjust the weights")}
  <div class="grid g3">
    ${card("Criteria weights (%)", cs.criteria.map((c, i) => slider("w" + i, c.name, 0, 50, 1, c.weight)).join("") + `<div class="small">Total weight: <b id="wTot"></b> <span class="muted">(scores are normalised by the total)</span></div><button class="btn" id="wReset" style="margin-top:8px">Reset to initial weights</button>`)}
    <div class="card span2"><h3>Scoring matrix</h3><div id="wTable"></div>${chartBox("wChart", "short")}</div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    ${card("Selection rationale", `<p style="margin:0">${esc(ct.rationale)}</p>`)}
    <div class="banner danger" style="margin:0"><b>Mandatory constraint</b><span>Water safety and appliance compatibility act as a pass/fail gate regardless of numerical score: no connection to drinking-water plumbing; no untreated reject water to a dishwasher; appliance supply only after water testing, treatment and manufacturer approval.</span></div>
  </div>`;
  const ids = cs.criteria.map((_, i) => "w" + i);
  const ch = mk("wChart", { type: "bar", data: { labels: cs.concepts.map((c) => "Concept " + c.id), datasets: [{ data: [], backgroundColor: [], borderRadius: 6 }] }, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 5, title: { display: true, text: "Weighted score (1–5)" } } } } });
  const upd = () => {
    const w = ids.map((id) => +$("#" + id).value); const tot = w.reduce((a, b) => a + b, 0) || 1;
    $("#wTot").textContent = tot + "%";
    const scores = cs.concepts.map((c) => c.scores.reduce((a, s, i) => a + s * w[i], 0) / tot);
    const best = Math.max(...scores);
    $("#wTable").innerHTML = `<div class="table-wrap"><table><thead><tr><th>Criterion</th><th class="num">Weight</th>${cs.concepts.map((c) => `<th class="num">${c.id}</th>`).join("")}</tr></thead><tbody>
      ${cs.criteria.map((cr, i) => `<tr><td>${esc(cr.name)}</td><td class="num">${(100 * w[i] / tot).toFixed(0)}%</td>${cs.concepts.map((c) => `<td class="num">${c.scores[i]}</td>`).join("")}</tr>`).join("")}
      <tr class="total"><td>Weighted score</td><td class="num">100%</td>${scores.map((s) => `<td class="num" style="${s === best ? "color:#0b7f7f" : ""}">${s.toFixed(2)}</td>`).join("")}</tr>
      <tr><td>Safety gate</td><td></td>${cs.concepts.map((c) => `<td class="num">${c.safety_gate.startsWith("Pass") ? "✓" : "✕"}</td>`).join("")}</tr></tbody></table></div>`;
    ch.data.datasets[0].data = scores; ch.data.datasets[0].backgroundColor = cs.concepts.map((c, i) => (!c.safety_gate.startsWith("Pass") ? COL.red : scores[i] === best ? COL.teal : COL.slate)); ch.update();
  };
  bindSliders(ids, upd); upd();
  $("#wReset").addEventListener("click", () => { ids.forEach((id, i) => { $("#" + id).value = weights[i]; $("#" + id + "o").textContent = weights[i]; }); upd(); });
}

// ================================================================== TAB 6
function tTesting(el, rerender) {
  const s = S(), ct = s.concept_test, t = A.content.testing, d = A.discussions;
  el.innerHTML = `${surveyControls()}<div style="height:10px"></div>${dataBanner()}
  <div class="evidence-legend" style="margin-bottom:12px"><span class="small muted">Evidence legend:</span>${evidencePill("actual")}${evidencePill("practice")}${evidencePill("public")}${evidencePill("design")}${evidencePill("pending")}</div>
  <div class="grid g5">
    ${kpi(pct(ct.usefulness.top2_pct, 0), "Rate concept useful (4–5)", `Mean ${ct.usefulness.mean}`)}
    ${kpi(pct(ct.intent.top2_pct, 0), "Stated purchase intent (4–5)", `Mean ${ct.intent.mean}`, "amber")}
    ${kpi(pct(ct.calibrated_intent_pct, 0), "Calibrated intent (illustrative)", "0.8 × ‘5’ + 0.3 × ‘4’ heuristic", "navy")}
    ${kpi(inr(ct.wtp.median), "Median stated max WTP", `IQR ${inr(ct.wtp.p25)}–${inr(ct.wtp.p75)} · n=${ct.wtp.n_valid}`)}
    ${kpi(inr(ct.extra_wtp.median), "Median extra WTP for appliance module", `max ${inr(ct.extra_wtp.max)}`, "amber")}
  </div>
  <div class="banner warn" style="margin-top:12px"><b>Stated ≠ actual</b><span>${esc(t.stated_vs_actual)}</span></div>
  <div class="grid g3">
    ${card("Purchase intention distribution", chartBox("tIntent"))}
    ${card("Product usefulness", chartBox("tUse"))}
    ${card("Willingness-to-pay distribution", chartBox("tWtp"))}
  </div>
  <div class="grid g3" style="margin-top:16px">
    <div class="card span2"><h3>Indicative price acceptance <span class="pill grey">not an experimental demand curve</span></h3>
      <p class="sub">Share of valid respondents whose stated maximum WTP ≥ price.</p>${chartBox("tAcc", "tall")}
      ${slider("tPrice", "Selected price (₹)", 0, 3000, 1, A.economics.recommended_price, "inr")}<div class="result" id="tAccOut"></div></div>
    ${card("Feature preference ranking (% rating 4–5)", chartBox("tFeat", "tall"))}
  </div>
  ${sect("Appliance integration module — interest")}
  <div class="grid g3">
    ${card("Importance of appliance integration", chartBox("tApp"))}
    ${card("Preferred reuse connection", chartBox("tConn"))}
    ${card("Extra WTP for the module", chartBox("tExtra") + `<p class="tiny muted">Indicative module cost ${inr(A.economics.module_unit_cost)} vs median extra WTP ${inr(ct.extra_wtp.median)} → not viable at launch.</p>`)}
  </div>
  ${sect("1 · Existing online discussions validating the underlying problem")}
  <div class="banner info"><b>${evidencePill("public")}</b><span>These ${d.n} posts pre-date AquaLoop and discuss RO reject-water collection generally. They are not reactions to the AquaLoop concept. Engagement figures were not verified and are not shown.</span></div>
  <div class="grid g3">${d.rows.map((r) => `<div class="card"><div class="small muted">${esc(r.id)} · ${esc(r.platform)}</div><p style="margin:6px 0">${esc(r.observation)}</p><div class="small"><b>Implication:</b> ${esc(r.implication)}</div><div class="chips" style="margin-top:6px">${r.themes.map((x) => `<span class="pill navy">${esc(x)}</span>`).join(" ")}</div><a class="small" href="${esc(r.url)}" target="_blank" rel="noopener">Open source ↗</a></div>`).join("")}</div>
  ${sect("2 · Actual AquaLoop concept testing")}
  <div class="grid g2">
    ${card(`Genuine concept reactions ${evidencePill("pending")}`, `<p class="small" style="margin-top:0">No genuine AquaLoop concept reactions have been collected yet. Use the concept image and template below; add posts after publishing.</p>
      ${table(t.template_fields.map((f) => ({ h: f, k: "x" })), [{ x: "" }, { x: "" }, { x: "" }])}
      <h4>Concept-test plan</h4>${list(t.plan)}`)}
    ${card("Concept image for posting", img("/images/render_angle.png", "AquaLoop concept for testing") + `<div class="small" style="margin-top:8px"><b>Suggested caption:</b> “Concept: AquaLoop collects your RO purifier's reject water in a slim wall tank that never overflows, with a tap for mopping and cleaning. Would you use it? What would you pay?”</div><a class="btn primary" style="display:inline-block;margin-top:8px;text-decoration:none" href="/images/render_angle.png" download>Download image</a>`)}
  </div>
  ${sect("Feedback-to-design matrix")}
  ${card("", table([{ h: "Customer concern", f: (r) => `<b>${esc(r.concern)}</b>` }, { h: "Mentions (practice data)", num: true, k: "n" }, { h: "Proposed product improvement", f: (r) => `${esc(r.improvement)} ${evidencePill("design")}` }, { h: "Expected benefit", k: "benefit" }], t.feedback_to_design))}`;

  bindSurveyControls(rerender);
  mk("tIntent", likertBar(ct.intent, "Intent"));
  mk("tUse", likertBar(ct.usefulness, "Usefulness"));
  mk("tWtp", { type: "bar", data: { labels: ct.wtp.dist.map((x) => x.label), datasets: [{ data: ct.wtp.dist.map((x) => x.count), backgroundColor: COL.navy, borderRadius: 5 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "Respondents" } }, x: { title: { display: true, text: "Stated max WTP" } } } } });
  const acc = ct.wtp.acceptance;
  const vline = { id: "vline", afterDraw(c) { const p = +$("#tPrice")?.value; if (p == null) return; const x = c.scales.x.getPixelForValue(p); const { top, bottom } = c.chartArea; const g = c.ctx; g.save(); g.strokeStyle = COL.amber; g.setLineDash([5, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(x, top); g.lineTo(x, bottom); g.stroke(); g.restore(); } };
  const accChart = mk("tAcc", { type: "line", data: { datasets: [{ label: "% accepting", data: acc.map((a) => ({ x: a.price, y: a.accept_pct })), borderColor: COL.teal, backgroundColor: "rgba(13,158,158,.12)", fill: true, stepped: true, pointRadius: 0 }] },
    options: { parsing: false, plugins: { legend: { display: false } }, scales: { x: { type: "linear", min: 0, max: 3000, title: { display: true, text: "Price (₹, incl. GST)" } }, y: { min: 0, max: 100, title: { display: true, text: "% of valid respondents" } } } }, plugins: [vline] });
  const wtpVals = ct.wtp.dist; const n = wtpVals.reduce((a, b) => a + b.count, 0);
  const updAcc = () => { const p = +$("#tPrice").value; const k = wtpVals.filter((d) => d.value >= p).reduce((a, b) => a + b.count, 0);
    $("#tAccOut").innerHTML = `At <b>${inr(p)}</b>: <span class="big">${(100 * k / n).toFixed(1)}%</span> of ${n} valid respondents (${k}) state a max WTP at or above this price.`; accChart.update(); };
  bindSliders(["tPrice"], updAcc); updAcc();
  const f2 = [...s.features].sort((a, b) => b.top2_pct - a.top2_pct);
  mk("tFeat", { type: "bar", data: { labels: f2.map((f) => f.feature), datasets: [{ data: f2.map((f) => f.top2_pct), backgroundColor: f2.map((f) => (/Appliance/.test(f.feature) ? COL.amber : COL.teal)), borderRadius: 5 }] }, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { max: 100, title: { display: true, text: "% rating 4–5" } }, y: { grid: { display: false } } } } });
  mk("tApp", likertBar(ct.appliance_importance, "Appliance importance"));
  mk("tConn", barH(s.preferences.reuse_connection.items, COL.amber));
  mk("tExtra", { type: "bar", data: { labels: ct.extra_wtp.dist.map((x) => x.label), datasets: [{ data: ct.extra_wtp.dist.map((x) => x.count), backgroundColor: COL.amber, borderRadius: 5 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
}

// ================================================================== TAB 7
function archSVG() {
  const box = (x, y, w, h, t, s, fill, stroke, dash = "") => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="1.6" ${dash ? `stroke-dasharray="${dash}"` : ""}/><text x="${x + w / 2}" y="${y + h / 2 - 3}" text-anchor="middle" font-size="13" font-weight="700" fill="#0f294d">${t}</text><text x="${x + w / 2}" y="${y + h / 2 + 14}" text-anchor="middle" font-size="10.5" fill="#5b6b7c">${s}</text></g>`;
  const ln = (x1, y1, x2, y2, c, d = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2.5" ${d ? `stroke-dasharray="${d}"` : ""} marker-end="url(#ah${c.slice(1)})"/>`;
  return `<svg class="arch" viewBox="0 0 980 430" xmlns="http://www.w3.org/2000/svg">
  <defs>${[COL.teal, COL.amber, COL.slate, COL.navy].map((c) => `<marker id="ah${c.slice(1)}" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${c}"/></marker>`).join("")}</defs>
  <rect x="10" y="10" width="640" height="410" rx="16" fill="#f2fafa" stroke="#bfe4e4"/><text x="26" y="34" font-size="12" font-weight="800" fill="#0b7f7f">PASSIVE CORE — LAUNCH PRODUCT</text>
  <rect x="670" y="10" width="300" height="410" rx="16" fill="#fff8ec" stroke="#f3d29c" stroke-dasharray="6 4"/><text x="686" y="34" font-size="12" font-weight="800" fill="#a86a10">OPTIONAL — CONDITIONAL MODULE</text>
  ${box(30, 60, 180, 64, "3 · Inlet & retrofit", "push-fit tee on reject line", "#fff", COL.navy)}
  ${box(240, 170, 190, 90, "2 · Storage tank", "detachable, translucent 5/10 L", "#e3f5fb", COL.teal)}
  ${box(460, 60, 170, 64, "5 · Overflow bypass", "float → household drain", "#fff", COL.navy)}
  ${box(460, 300, 170, 64, "6 · Dispensing tap", "manual utility reuse", "#fff", COL.teal)}
  ${box(30, 300, 180, 64, "4 · Level indicator", "L / ½ / F window", "#fff", COL.teal)}
  ${box(240, 330, 190, 70, "1 · Main housing (bus)", "frame · base tray · header", "#eef2f5", COL.slate)}
  ${box(700, 150, 240, 70, "7 · Distribution module", "isolation · backflow · pump", "#fff", COL.amber)}
  ${box(700, 280, 240, 70, "8 · Quality safeguard", "test / treat → OEM-approved", "#fff", COL.amber)}
  ${ln(210, 100, 260, 168, COL.teal)} ${ln(430, 195, 470, 128, COL.slate)} ${ln(420, 260, 480, 298, COL.teal)} ${ln(210, 320, 238, 260, COL.navy, "4 3")}
  ${ln(335, 330, 335, 264, COL.navy, "4 3")} ${ln(430, 220, 696, 190, COL.amber, "7 5")} ${ln(820, 222, 820, 276, COL.amber)} ${ln(940, 315, 966, 315, COL.amber)}
  <text x="540" y="250" font-size="10.5" fill="#a86a10">side interface (bus)</text>
  <g font-size="11" fill="#5b6b7c"><line x1="30" y1="415" x2="60" y2="415" stroke="${COL.teal}" stroke-width="3"/><text x="66" y="419">water flow</text><line x1="150" y1="415" x2="180" y2="415" stroke="${COL.navy}" stroke-width="3" stroke-dasharray="4 3"/><text x="186" y="419">mechanical / mounting</text><line x1="330" y1="415" x2="360" y2="415" stroke="${COL.amber}" stroke-width="3" stroke-dasharray="7 5"/><text x="366" y="419">conditional flow</text></g>
  </svg>`;
}
function tArchitecture(el) {
  const a = A.content.architecture;
  el.innerHTML = `
  <div class="grid g3">
    <div class="card span2"><h3>Modular product architecture — function-to-module map</h3>${archSVG()}<p class="small muted" style="margin:6px 0 0">${esc(a.type)}</p></div>
    ${card("Exploded 3D view", img("/images/exploded_render.png", "Exploded render") + `<p class="tiny muted">From the CadQuery model (Tab 8 for the interactive viewer).</p>`)}
  </div>
  ${sect("Major modules & functions")}
  ${card("", table([{ h: "#", f: (r, i) => i + 1, num: true }, { h: "Module", f: (r) => `<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${r.color};border:1px solid #9fb0c0;margin-right:6px"></span><b>${esc(r.label)}</b>` }, { h: "Function", k: "function" }, { h: "Envelope (mm, W×D×H)", f: (r) => r.bbox_mm.join(" × ") }, { h: "Launch scope", f: (_, i) => (i < 6 ? `<span class="pill">Core</span>` : `<span class="pill amber">Optional</span>`) }], CAD.modules))}
  <div class="grid g2" style="margin-top:16px">
    ${card("Modular vs integral architecture", table([{ h: "Aspect", k: "aspect" }, { h: "Modular (chosen)", f: (r) => `<b>${esc(r.modular)}</b>` }, { h: "Integral", k: "integral" }], a.modular_vs_integral))}
    ${card("Advantages of modularity & future variants", `<div class="grid g2"><div><h4>Advantages</h4>${list(a.advantages)}</div><div><h4>Variants</h4>${list(a.variants)}</div></div>`)}
  </div>
  ${sect("Industrial design")}
  <div class="grid g3">
    ${card("Industrial-design principles applied", table([{ h: "Principle", f: (r) => `<b>${esc(r.principle)}</b>` }, { h: "Application", k: "application" }], a.id), "", "span2")}
    ${card("Design language", `<div class="chips">${[["#f6f8fa", "White housing"], [COL.teal, "Teal accents"], [COL.aqua, "Translucent aqua tank"], [COL.navy, "Navy badge & fittings"]].map(([c, l]) => `<span class="chip"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${c};border:1px solid #c9d6e2;vertical-align:-2px;margin-right:6px"></span>${l}</span>`).join("")}</div>
      <div style="margin-top:10px">${img("/images/render_front.png", "Front view render")}</div>`)}
  </div>`;
}

// ================================================================== TAB 8
function tPrototype(el) {
  const files = [
    ["2D product sketch (SVG)", "/drawings/product_sketch.svg"], ["2D product sketch (PNG)", "/drawings/product_sketch.png"],
    ["3D CAD assembly (STEP)", "/models/aqualoop_assembly.step"], ["3D mesh (STL)", "/models/aqualoop_assembly.stl"],
    ["3D web model (GLB)", "/models/aqualoop.glb"], ["Exploded 3D model (GLB)", "/models/aqualoop_exploded.glb"],
    ["CAD generation source (Python)", "/models/generate_cad.py"], ["Exploded view (SVG)", "/drawings/exploded_view.svg"],
    ["Internal working (SVG)", "/drawings/internal_working.svg"], ["Water flow diagram (SVG)", "/drawings/water_flow.svg"],
    ["Product render (PNG)", "/images/render_hero.png"], ["Prototype board (PNG)", "/images/prototype_board.png"], ["Prototype board (PDF)", "/drawings/prototype_board.pdf"],
  ];
  el.innerHTML = `
  <div class="banner info"><b>Scope</b><span>Conceptual MBA prototype — simple parametric geometry, consistent across all views. No tolerances, hidden lines, fittings, kitchen scene or plumbing design.</span></div>
  <div class="grid g3">
    <div class="card span2"><h3>C · Interactive 3D model viewer <span class="pill">drag to rotate · scroll to zoom</span></h3>
      <model-viewer id="mv" src="/models/aqualoop.glb" camera-controls touch-action="pan-y" camera-orbit="-28deg 72deg auto" field-of-view="28deg" shadow-intensity="1" exposure="1.05" environment-image="neutral" interaction-prompt="auto" alt="AquaLoop 3D model"></model-viewer>
      <div class="viewer-bar">
        <button class="btn active" data-src="/models/aqualoop.glb">Assembled</button><button class="btn" data-src="/models/aqualoop_exploded.glb">Exploded</button>
        <span style="width:12px"></span>
        <button class="btn" data-orbit="0deg 88deg auto">Front</button><button class="btn" data-orbit="90deg 88deg auto">Side</button><button class="btn" data-orbit="0deg 5deg auto">Top</button><button class="btn" data-orbit="-28deg 72deg auto">Iso</button>
        <button class="btn" id="mvRot">Auto-rotate</button><button class="btn primary" id="mvReset">Reset view</button>
      </div></div>
    ${card("Model facts", `<table>
      <tr><td>Core envelope</td><td class="num">${CAD.overall_mm.width_core} × ${CAD.overall_mm.depth} × ${CAD.overall_mm.height} mm</td></tr>
      <tr><td>With optional module</td><td class="num">≈ ${CAD.overall_mm.width_with_module} mm wide</td></tr>
      <tr><td>Tank envelope</td><td class="num">${CAD.tank_envelope_mm.join(" × ")} mm</td></tr>
      <tr><td>Gross tank volume</td><td class="num">≈ ${CAD.tank_gross_litres} L</td></tr>
      <tr><td>Major modules</td><td class="num">${CAD.modules.length}</td></tr></table>
      <p class="tiny muted">${esc(CAD.note)}</p><h4>Downloads</h4><div class="dl">${files.map(([l, p]) => `<a href="${p}" download>${l}<span class="pill grey">${p.split(".").pop().toUpperCase()}</span></a>`).join("")}</div>`)}
  </div>
  ${sect("A · Basic 2D product sketch")}
  ${card("", img("/drawings/product_sketch.svg", "2D product sketch", "Front, side and isometric views with feature labels and indicative dimensions."))}
  ${sect("D · Simplified exploded view & G · product render")}
  <div class="grid g2">${card("Exploded view — 8 labelled modules", img("/drawings/exploded_view.svg", "Exploded view"))}${card("Exploded 3D render", img("/images/exploded_render.png", "Exploded render"))}</div>
  ${sect("E · Internal working & F · water flow")}
  <div class="grid g2">${card("Internal working (transparent view)", img("/drawings/internal_working.svg", "Internal working"))}${card("Water flow & conditional appliance integration", img("/drawings/water_flow.svg", "Water flow diagram"))}</div>
  ${sect("G · Product render & H · prototype visualization board")}
  <div class="grid g3">${card("Studio render", img("/images/render_hero.png", "Product render"))}${card("Alternate angle", img("/images/render_angle.png", "Product render angle"))}${card("One-page prototype board (A4)", img("/images/prototype_board.png", "Prototype board", "For the report's full-page coloured prototype visualization."))}</div>`;
  const mv = $("#mv");
  el.querySelectorAll("[data-src]").forEach((b) => b.addEventListener("click", () => { mv.src = b.dataset.src; el.querySelectorAll("[data-src]").forEach((x) => x.classList.toggle("active", x === b)); }));
  el.querySelectorAll("[data-orbit]").forEach((b) => b.addEventListener("click", () => { mv.cameraOrbit = b.dataset.orbit; mv.fieldOfView = "28deg"; }));
  $("#mvRot").addEventListener("click", (e) => { mv.autoRotate = !mv.autoRotate; e.target.classList.toggle("active", mv.autoRotate); });
  $("#mvReset").addEventListener("click", () => { mv.cameraOrbit = "-28deg 72deg auto"; mv.cameraTarget = "auto auto auto"; mv.fieldOfView = "28deg"; mv.jumpCameraToGoal?.(); });
}

// ================================================================== TAB 9
function tSustainability(el) {
  const su = A.content.sustainability, w = A.water.defaults, fe = A.content.feasibility, e = A.economics;
  el.innerHTML = `
  <div class="grid g2">
    ${card("Sustainability impact matrix", table([{ h: "Dimension", f: (r) => `<b>${esc(r.dimension)}</b>` }, { h: "Impact", f: (r) => `<span class="pill ${/High \+|Medium \+/.test(r.impact) ? "green" : r.impact === "Neutral" ? "grey" : "navy"}">${esc(r.impact)}</span>` }, { h: "Design lever", k: "lever" }], su.matrix))}
    ${card("Design for Environment principles", list(su.dfe) + `<p class="small muted">Qualitative DfE only — no formal life-cycle assessment.</p>`)}
  </div>
  ${sect("Interactive water recovery calculator (estimates)")}
  <div class="grid g3">
    ${card("Inputs", `
      ${slider("wR", "Daily reject-water generation (L)", 1, 60, 0.5, w.daily_reject_l)}
      ${slider("wP", "Assumed recoverable share (%)", 10, 100, 5, w.recoverable_pct)}
      ${slider("wS", "Storage capacity (L)", 5, 30, 5, w.storage_l)}
      ${slider("wD", "Estimated reuse demand (L/day)", 1, 40, 1, w.reuse_demand_l)}
      ${slider("wN", "Days of operation per year", 30, 365, 5, w.days)}
      <p class="tiny muted">${w.notes.map(esc).join(" ")}</p>`)}
    ${card("Estimated recovery", `<div id="wOut"></div>`)}
    ${card("Sensitivity to storage size", chartBox("wChart", "tall"))}
  </div>
  ${sect("Water-quality feasibility check (appliance integration)")}
  <div class="banner danger"><b>Verdict</b><span>${withSrc(fe.verdict)}</span></div>
  ${card("", table([{ h: "Reuse application", f: (r) => `<b>${esc(r.use)}</b>` }, { h: "Feasibility", f: (r) => `<span class="pill ${/Never|Not/.test(r.status) ? "red" : /Conditional|Pre-soak/.test(r.status) ? "amber" : "green"}">${esc(r.status)}</span>` }, { h: "Source", f: (r) => src(r.src) }], fe.points) + `<p class="small muted">${esc(fe.tds_note)}</p>`)}
  ${sect("Manufacturing feasibility — base product")}
  ${card("Manufacturing strategy (indicative)", table([{ h: "Major component", k: "item" }, { h: "Proposed material", k: "material" }, { h: "Possible process", k: "process" }, { h: "Make or buy", k: "make_buy" }, { h: "Indicative cost", num: true, f: (r) => inr(r.cost) }], e.bom_base, { foot: `<tr class="total"><td colspan="4">Parts + conversion subtotal → with ${e.assumptions.inbound_scrap_pct}% inbound freight & scrap</td><td class="num">${inr(e.base_parts_total)} → ${inr(e.base_unit_cost)}</td></tr>` }) + `<p class="small muted">Injection moulding suits the housing (complex, repeatable, ~₹ lakhs per tool); blow moulding suits the hollow tank. Commodity RO fittings, taps and float valves are bought in. No tooling design or manufacturing drawings are developed at this stage.</p>`)}
  ${sect("Supply chain strategy")}
  ${card("", table([{ h: "Stage", f: (r) => `<b>${esc(r.stage)}</b>` }, { h: "Plan", k: "plan" }], su.supply_chain))}`;
  const ch = mk("wChart", { type: "bar", data: { labels: [5, 10, 15, 20, 30].map((x) => x + " L"), datasets: [{ label: "Annual reuse (kL)", data: [], backgroundColor: COL.teal, borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: "kL per year" } } } } });
  const calc = (R, P, Sc, D, N) => { const cap = R * P / 100; const used = Math.min(cap, Sc, D); return { used, cap }; };
  const upd = () => {
    const R = +$("#wR").value, P = +$("#wP").value, Sc = +$("#wS").value, D = +$("#wD").value, N = +$("#wN").value;
    const { used, cap } = calc(R, P, Sc, D, N);
    const bind = used === cap ? "reject supply" : used === Sc ? "storage capacity" : "reuse demand";
    $("#wOut").innerHTML = `<div class="result"><div class="small muted">Potential daily recovery</div><div class="big">${num(used, 1)} L/day</div></div>
      <div class="grid g2" style="margin-top:10px">${kpi(num(used * N / 12, 0) + " L", "Monthly (avg.)")}${kpi(num(used * N / 1000, 2) + " kL", "Annual")}</div>
      <p class="small" style="margin-top:10px">Binding constraint: <b>${bind}</b>. Recoverable supply ${num(cap, 1)} L/day; storage ${Sc} L; demand ${D} L/day.</p>
      <p class="tiny muted">Estimate only. Example: 100,000 homes at this rate ≈ ${num(used * N * 1e5 / 1e6, 0)} million litres/year.</p>`;
    ch.data.datasets[0].data = [5, 10, 15, 20, 30].map((s) => (calc(R, P, s, D, N).used * N) / 1000); ch.update();
  };
  bindSliders(["wR", "wP", "wS", "wD", "wN"], upd); upd();
}

// ================================================================== TAB 10
function tRobust(el) {
  const r = A.content.robust, f = A.fmea;
  el.innerHTML = `
  ${card("Robust design — major usage variations (noise factors)", table([{ h: "Variation", f: (x) => `<b>${esc(x.noise)}</b>` }, { h: "Range", f: (x) => withSrc(x.range) }, { h: "How the modular design accommodates it", k: "response" }], r.variations) + `<p class="tiny muted">Qualitative robustness reasoning — no Taguchi experiments or tolerance analysis.</p>`)}
  ${sect("Simplified FMEA")}
  <div class="grid g3">
    <div class="card span2"><h3>Failure modes ranked by risk priority number (RPN = S × O × D, each 1–10)</h3>${table([{ h: "Potential failure", f: (x) => `<b>${esc(x.failure)}</b>` }, { h: "Customer impact", k: "effect" }, { h: "S", num: true, k: "S" }, { h: "O", num: true, k: "O" }, { h: "D", num: true, k: "D" }, { h: "RPN", num: true, f: (x) => `<span class="pill ${x.rpn >= 150 ? "red" : x.rpn >= 100 ? "amber" : "green"}">${x.rpn}</span>` }, { h: "Proposed mitigation", k: "mitigation" }, { h: "Validation requirement", k: "validation" }], f)}<p class="tiny muted">S = severity, O = occurrence, D = detection difficulty; indicative judgements for prioritising prototype tests.</p></div>
    ${card("RPN profile", chartBox("fChart", "tall"))}
  </div>
  ${sect("Intellectual property")}
  ${card("", table([{ h: "Topic", f: (x) => `<b>${esc(x.topic)}</b>` }, { h: "Position", f: (x) => withSrc(x.point) }], r.ip) + `<div class="banner warn" style="margin-top:10px"><b>Note</b><span>No exhaustive patent search was performed; AquaLoop is not claimed to be patentable or patented.</span></div>`)}
  ${sect("Service design — customer journey")}
  <div class="journey">${r.journey.map((j, i) => `<div class="step"><div class="tiny muted">Step ${i + 1}</div><h4>${esc(j.stage)}</h4><div>${esc(j.touchpoint)}</div><div class="small" style="margin-top:6px;color:#0b7f7f"><b>Eureka Forbes:</b> ${esc(j.ef_support)}</div></div>`).join("")}</div>`;
  mk("fChart", { type: "bar", data: { labels: f.map((x) => x.failure.length > 28 ? x.failure.slice(0, 27) + "…" : x.failure), datasets: [{ data: f.map((x) => x.rpn), backgroundColor: f.map((x) => (x.rpn >= 150 ? COL.red : x.rpn >= 100 ? COL.amber : COL.green)), borderRadius: 5 }] }, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, title: { display: true, text: "RPN" } }, y: { grid: { display: false } } } } });
}

// ================================================================== TAB 11
function tEconomics(el) {
  const e = A.economics, a = e.assumptions, ue = e.unit_economics, n = A.content.economics_notes;
  const bomCols = [{ h: "Item", k: "item" }, { h: "Material", k: "material" }, { h: "Process", k: "process" }, { h: "Make/Buy", k: "make_buy" }, { h: "Basis", f: (r) => withSrc(r.basis) }, { h: "Cost", num: true, f: (r) => inr(r.cost) }];
  const modTot = e.bom_module.reduce((s, x) => s + x.cost, 0);
  el.innerHTML = `
  <div class="banner warn"><b>Financial estimates</b><span>All costs, margins, volumes and fixed costs are transparent assumptions or indicative benchmarks — not supplier quotations. Survey-based pricing uses practice data.</span></div>
  ${sect("Indicative Bill of Materials")}
  <div class="grid">
    ${card("Base product — AquaLoop 10 L core", table(bomCols, e.bom_base, { foot: `<tr class="total"><td colspan="5">Subtotal → incl. ${a.inbound_scrap_pct}% inbound freight & scrap</td><td class="num">${inr(e.base_parts_total)} → ${inr(e.base_unit_cost)}</td></tr>` }))}
    ${card("Optional appliance-integration module (separate SKU)", table(bomCols, e.bom_module, { foot: `<tr class="total"><td colspan="5">Subtotal → incl. ${a.inbound_scrap_pct}% freight & scrap</td><td class="num">${inr(modTot)} → ${inr(e.module_unit_cost)}</td></tr>` }) + `<p class="small">${esc(n.module)}</p>`)}
  </div>
  ${sect("Pricing")}
  <div class="grid g3">
    <div class="card span2"><h3>Price acceptance vs unit contribution (practice data)</h3>${chartBox("pChart", "tall")}<p class="tiny muted">Contribution index = % accepting × unit contribution — a simple screening aid, not a demand forecast.</p></div>
    ${card("Recommendation", `<div class="result"><div class="small muted">Launch price, 10 L core (incl. GST)</div><div class="big">${inr(e.recommended_price)}</div><div class="small">Range ${esc(a.price_range)} · attach/bundle ${inr(a.bundle_price)} · 5 L ≈ ₹1,199 · install ${inr(a.installation_fee)}</div></div>
      <p class="small">${withSrc(n.pricing)}</p>
      <table><tr><td>Initial hypothesis</td><td class="num">₹1,499–₹2,999</td></tr><tr><td>Median stated WTP</td><td class="num">${inr(e.wtp_reference.median)}</td></tr><tr><td>Accept at ${inr(e.recommended_price)}</td><td class="num">${pct(e.wtp_reference.accept_at_recommended)}</td></tr><tr><td>Index-maximising price</td><td class="num">${inr(e.contribution_index_max_price)}</td></tr><tr><td>Competitor street prices</td><td class="num">₹1,249 ${src("R9")} · ₹1,410 ${src("R10")}</td></tr></table>`)}
  </div>
  ${sect("Unit economics & break-even calculator")}
  <div class="grid g3">
    ${card("Adjust", `${slider("bP", "Selling price incl. GST (₹)", 799, 2999, 50, e.recommended_price, "inr")}${slider("bC", "Manufacturing cost (₹/unit)", 300, 1200, 1, e.base_unit_cost, "inr")}${slider("bM", "Channel margin (% of ex-GST)", 0, 45, 1, a.channel_margin_pct)}${slider("bO", "Other variable (% of net realisation)", 0, 15, 1, a.other_variable_pct)}${slider("bF", "First-year fixed costs (₹)", 2000000, 20000000, 500000, e.first_year_fixed, "lakh")}${slider("bV", "Expected year-1 volume (units)", 5000, 150000, 1000, a.scenarios.Base[0])}
      <p class="tiny muted">GST ${a.gst_pct}% is removed first; channel margin is applied to the ex-GST price; other variable costs to net realisation — no double counting.</p>`)}
    ${card("Per-unit waterfall", `<div id="bTable"></div>`)}
    ${card("Profit vs volume", chartBox("bChart", "tall") + `<div id="bOut" class="result" style="margin-top:8px"></div>`)}
  </div>
  ${sect("Financial feasibility — scenarios, payback & 3-year NPV")}
  <div class="grid">
    <div class="card"><h3>Scenario summary (price ${inr(e.recommended_price)}, unit contribution ${inr(ue.contribution)})</h3>
    ${table([{ h: "Scenario", f: (r) => `<b>${r.name}</b>` }, { h: "Units Y1 / Y2 / Y3", f: (r) => r.years.map((y) => num(y.units)).join(" / ") }, { h: "Net revenue (3 yr)", num: true, f: (r) => lakh(r.years.reduce((s, y) => s + y.net_revenue, 0)) }, { h: "Contribution (3 yr)", num: true, f: (r) => lakh(r.years.reduce((s, y) => s + y.contribution, 0)) }, { h: "Y1 vs break-even", num: true, f: (r) => (r.years[0].units >= e.break_even_units_year1 ? `<span class="pill green">above</span>` : `<span class="pill red">below</span>`) }, { h: "Payback (yrs)", num: true, f: (r) => (r.payback_years == null ? "> 3" : num(r.payback_years, 1)) }, { h: `NPV @ ${a.discount_rate_pct}%`, num: true, f: (r) => `<b style="color:${r.npv >= 0 ? COL.green : COL.red}">${lakh(r.npv)}</b>` }], Object.entries(e.scenarios).map(([name, v]) => ({ name, ...v })))}
    <p class="tiny muted">Cash flows: t0 = −${lakh(a.one_time_investment)} one-time (tooling, development, pilot); years 1–3 = units × contribution − ${lakh(a.annual_fixed_opex)} fixed opex. No terminal value. Break-even on first-year fixed costs: <b>${num(e.break_even_units_year1)} units</b>.</p></div>
  </div>
  <div class="grid g3" style="margin-top:16px">
    ${card("Cumulative cash flow", chartBox("cfChart", "tall"))}
    ${card("Commercial feasibility recommendation", `<p style="margin-top:0"><b>${esc(n.recommendation)}</b></p>${list(["Low capital (≈ ₹50 L one-time) relative to Eureka Forbes' scale (R6)", `Positive unit contribution of ${inr(ue.contribution)} (${ue.contribution_margin_pct}% of net realisation)`, "Keep the appliance module out of the launch P&L until extra WTP and OEM approval are proven", "Biggest sensitivities: price acceptance and attach rate — test before tooling"])}`)}
    ${card("Key assumptions", list(a.notes))}
  </div>`;

  const g = e.price_grid;
  mk("pChart", { type: "bar", data: { labels: g.map((x) => inr(x.price)), datasets: [
    { type: "line", label: "% accepting (left)", data: g.map((x) => x.accept_pct), borderColor: COL.teal, backgroundColor: COL.teal, yAxisID: "y", tension: 0.2 },
    { type: "bar", label: "Unit contribution ₹ (right)", data: g.map((x) => x.contribution), backgroundColor: g.map((x) => (x.price === e.recommended_price ? COL.navy : x.contribution < 0 ? COL.red : COL.light)), yAxisID: "y1", borderRadius: 4 }] },
    options: { scales: { y: { min: 0, max: 100, title: { display: true, text: "% accepting" } }, y1: { position: "right", grid: { display: false }, title: { display: true, text: "₹ contribution / unit" } } } } });
  const bc = mk("bChart", { type: "line", data: { labels: [], datasets: [{ label: "Year-1 profit (₹ L)", data: [], borderColor: COL.teal, backgroundColor: "rgba(13,158,158,.1)", fill: true, pointRadius: 0 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: "Units (000)" } }, y: { title: { display: true, text: "₹ lakh" } } } } });
  const upd = () => {
    const P = +$("#bP").value, Cc = +$("#bC").value, M = +$("#bM").value, O = +$("#bO").value, F = +$("#bF").value, V = +$("#bV").value;
    const ex = P / (1 + a.gst_pct / 100), ch = ex * M / 100, net = ex - ch, oth = net * O / 100, con = net - Cc - oth;
    const be = con > 0 ? Math.ceil(F / con) : null;
    $("#bTable").innerHTML = `<table>
      <tr><td>Selling price (incl. GST)</td><td class="num">${inr(P)}</td></tr><tr><td>− GST (${a.gst_pct}%)</td><td class="num">${inr(P - ex)}</td></tr>
      <tr><td>= Price ex-GST</td><td class="num">${inr(ex)}</td></tr><tr><td>− Channel cost (${M}%)</td><td class="num">${inr(ch)}</td></tr>
      <tr class="total"><td>= Net company realisation</td><td class="num">${inr(net)}</td></tr><tr><td>− Manufacturing cost</td><td class="num">${inr(Cc)}</td></tr>
      <tr><td>− Other variable (${O}%)</td><td class="num">${inr(oth)}</td></tr>
      <tr class="total"><td>= Contribution per unit</td><td class="num" style="color:${con > 0 ? COL.green : COL.red}">${inr(con)}</td></tr>
      <tr><td>Contribution margin</td><td class="num">${net ? ((100 * con) / net).toFixed(1) : "—"}%</td></tr></table>`;
    $("#bOut").innerHTML = be ? `Break-even: <span class="big">${num(be)}</span> units · profit at ${num(V)} units: <b style="color:${V * con - F >= 0 ? COL.green : COL.red}">${lakh(V * con - F)}</b>` : `<b style="color:${COL.red}">Negative contribution — no break-even.</b>`;
    const xs = Array.from({ length: 31 }, (_, i) => i * 5000);
    bc.data.labels = xs.map((x) => x / 1000); bc.data.datasets[0].data = xs.map((x) => (x * con - F) / 1e5); bc.update();
  };
  bindSliders(["bP", "bC", "bM", "bO", "bF", "bV"], upd); upd();
  mk("cfChart", { type: "line", data: { labels: ["t0", "Y1", "Y2", "Y3"], datasets: Object.entries(e.scenarios).map(([k, v], i) => ({ label: k, data: v.cash_flows.reduce((acc, c) => (acc.push((acc.length ? acc[acc.length - 1] : 0) + c), acc), []).map((x) => x / 1e5), borderColor: [COL.amber, COL.teal, COL.navy][i], tension: 0.2 })) }, options: { scales: { y: { title: { display: true, text: "Cumulative ₹ lakh" } } } } });
}

// ================================================================== TAB 12
function tCommercial(el) {
  const c = A.content.commercialization, st = c.stp;
  const months = 18;
  el.innerHTML = `
  <div class="grid g3">
    ${card("Segmentation, targeting & positioning", `<h4>Segmentation bases</h4>${list(st.segmentation)}<h4>Primary target</h4><p class="small" style="margin:0">${esc(st.primary)}</p><h4>Secondary target</h4><p class="small" style="margin:0">${esc(st.secondary)}</p>`)}
    ${card("Customer persona", `<div style="display:flex;gap:12px;align-items:center"><div style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,${COL.aqua},${COL.teal});display:grid;place-items:center;color:#fff;font-weight:800">P</div><div><b>${esc(st.persona.name)}</b><div class="small muted">${esc(st.persona.context)}</div></div></div>
      <table style="margin-top:10px"><tr><td><b>Pains</b></td><td>${esc(st.persona.pains)}</td></tr><tr><td><b>Gains</b></td><td>${esc(st.persona.gains)}</td></tr><tr><td><b>Reached via</b></td><td>${esc(st.persona.channel)}</td></tr></table><p class="tiny muted">Illustrative persona built from practice data and public discussions.</p>`)}
    ${card("Positioning & USP", `<div class="quote" style="font-size:15px">${esc(st.positioning)}</div><h4>Unique selling proposition</h4><div class="result"><span class="big" style="font-size:20px">${esc(st.usp)}</span></div>`)}
  </div>
  ${sect("Competitive differentiation")}
  <div class="grid g2">
    ${card("Why customers might prefer AquaLoop", table([{ h: "Versus", f: (r) => `<b>${esc(r.vs)}</b>` }, { h: "AquaLoop advantage", k: "why" }], c.differentiation))}
    ${card("Indicative perceptual map", chartBox("perc", "tall") + `<p class="tiny muted">Positions are the author's judgements for discussion, not survey-measured perceptions.</p>`)}
  </div>
  ${sect("Marketing mix (4Ps)")}
  <div class="fourp">${Object.entries(c.four_p).map(([k, v]) => `<div class="p"><h4>${k}</h4>${list(v)}</div>`).join("")}</div>
  ${sect("Commercialization roadmap")}
  <div class="phases" style="grid-template-columns:repeat(6,minmax(0,1fr))">${c.roadmap.map((r, i) => `<div class="phase ${i > 0 ? "future" : "partial"}"><h4>${esc(r.stage)}</h4><div class="muted">${esc(r.timing)}</div><div style="margin-top:6px"><b>Gate:</b> ${esc(r.gate)}</div></div>`).join("")}</div>
  ${sect("Project timeline (Gantt, proposed)")}
  ${card("", `<div class="gantt"><div class="axis"><div></div><div class="ticks">${Array.from({ length: 7 }, (_, i) => `<span>M${i * 3}</span>`).join("")}</div><div></div></div>
    ${c.gantt.map((g) => `<div class="row"><div>${esc(g.task)}</div><div class="track"><div class="bar ${/Planned/.test(g.status) ? "planned" : /Pending|progress/.test(g.status) ? "pending" : ""}" style="left:${(100 * g.start) / months}%;width:${(100 * g.dur) / months}%"></div></div><div><span class="pill ${/Planned/.test(g.status) ? "grey" : /Pending|progress/.test(g.status) ? "amber" : "green"}">${esc(g.status)}</span></div></div>`).join("")}</div>
    <p class="tiny muted">Months from project start. Future activities are proposed — none are claimed as completed. "Done" refers to desk-based work on practice data only.</p>`)}
  ${sect("Final recommendation")}
  <div class="grid g2">
    ${card("Recommendation summary", table([{ h: "", f: (r) => `<b>${esc(r.k)}</b>` }, { h: "", f: (r) => withSrc(r.v) }], c.final))}
    <div class="card" style="background:linear-gradient(135deg,#0f294d,#12457a);color:#d7e8f5"><h3 style="color:#fff">Why AquaLoop deserves to win</h3>
      <ul class="clean"><li>A real, everyday problem in millions of RO homes, already “solved” badly with buckets.</li><li>Solves the pains customers rate highest — safety, cleaning, retrofit, overflow — with a simple passive design.</li><li>Uses Eureka Forbes' unfair advantages: brand, installed base, technicians in 17,000+ pin codes.</li><li>Low capital, positive unit economics, and a platform path to safe appliance reuse.</li><li>Sustainability that customers can see: litres saved, not just claimed.</li></ul>
      <div style="margin-top:12px"><img src="/images/prototype_board.png" alt="Prototype board" style="width:100%;border-radius:8px;cursor:zoom-in" data-zoom/></div></div>
  </div>`;
  const pts = c.perceptual;
  mk("perc", { type: "scatter", data: { datasets: pts.map((p, i) => ({ label: p.name, data: [{ x: p.x, y: p.y }], backgroundColor: p.name === "AquaLoop" ? COL.teal : SEQ[(i + 3) % SEQ.length], pointRadius: p.name === "AquaLoop" ? 11 : 8 })) },
    options: { plugins: { legend: { position: "bottom" } }, scales: { x: { min: 0, max: 5.5, title: { display: true, text: c.perceptual_axes.x } }, y: { min: 0, max: 5.5, title: { display: true, text: c.perceptual_axes.y } } } } });
}

// ================================================================== UTILITY
function tRefs(el) {
  const c = A.content, m = A.meta;
  const logs = Object.entries(m.cleaning_log).map(([k, v]) => ({ k, ...v }));
  el.innerHTML = `
  ${sect("AI Usage and Reflection Log")}
  ${card("", table([{ h: "Project stage", f: (r) => `<b>${esc(r.stage)}</b>` }, { h: "Tool", f: (r) => `<span class="pill ${r.tool === "Claude" ? "" : "navy"}">${esc(r.tool)}</span>` }, { h: "AI prompt / task", k: "task" }, { h: "AI-generated recommendation", k: "rec" }, { h: "Status", f: (r) => `<span class="pill ${r.status === "Accepted" ? "green" : r.status === "Modified" ? "amber" : r.status === "Rejected" ? "red" : "grey"}">${esc(r.status)}</span>` }, { h: "Rationale", k: "why" }, { h: "Human review", k: "review" }], c.ai_log) + `<div class="banner warn" style="margin-top:10px"><b>Note</b><span>Status reflects how the recommendation was used in building this app. Human review entries are requirements for the student — no completed human reviews are claimed. ChatGPT entries describe its stated role in idea generation, planning and survey design.</span></div>`)}
  ${sect("Critical reflection on AI recommendations")}
  <div class="grid g3">${[["Modular over fully automated", "AI-generated concept C (automation) was attractive but failed the safety gate and cost targets; the simpler modular core was chosen."], ["Rejecting unnecessary engineering", "Detailed CAD, tolerances, pump sizing and plumbing were deliberately excluded to keep the work at MBA scope."], ["Appliance integration is conditional", "Evidence on reject-water TDS (R13) and dishwasher hardness limits (R15) overrode the idea of direct appliance supply."], ["No unsupported market claims", "Market reports disagree by >3×; the app uses transparent, adjustable assumptions rather than a single 'market size'."], ["Customer features before tech", "Survey ranking (safety, cleaning, retrofit, overflow) drove specs; low-rated modular capacity was kept as a variant, not the headline."], ["Practice data kept separate", "Simulated rows are labelled everywhere and never merged with genuine data; the app switches automatically when real data arrive."]].map(([t, d]) => `<div class="insight"><h4>${t}</h4><div class="ev">${withSrc(d)}</div></div>`).join("")}</div>
  ${sect("Assumptions and limitations")}
  ${card("", table([{ h: "Evidence type", f: (r) => `<b>${esc(r.type)}</b>` }, { h: "Status", f: (r) => `<span class="pill ${/Sourced/.test(r.status) ? "green" : /Pending|Required/.test(r.status) ? "red" : "amber"}">${esc(r.status)}</span>` }, { h: "Detail", k: "detail" }], c.assumptions))}
  ${sect("Data handling")}
  <div class="grid g2">
    ${card("Cleaning log (Python)", table([{ h: "Dataset", k: "k" }, { h: "Sheet", k: "sheet" }, { h: "Rows read", num: true, k: "rows_read" }, { h: "Blank rows removed", num: true, k: "blank_rows_removed" }, { h: "Analysed", num: true, k: "respondents_analysed" }], logs) + `<p class="tiny muted">Primary dataset: <b>${esc(m.primary_dataset)}</b>. Genuine data become primary automatically once ≥ ${m.min_actual_for_primary} valid responses exist. Only aggregated, anonymised outputs are published.</p>`)}
    ${card("Survey read-me (from workbook)", table([{ h: "Topic", k: "Topic" }, { h: "Guidance", k: "Guidance" }], m.readme))}
  </div>
  ${sect("References")}
  ${card("Research sources", `<ol class="ref-list" style="padding-left:18px">${R.sources.map((s) => `<li id="ref-${s.id}"><span class="id">${s.id}</span><b>${esc(s.name)}</b> <span class="pill grey">${esc(s.topic)}</span>${s.url ? ` — <a href="${esc(s.url)}" target="_blank" rel="noopener">link ↗</a>` : ""}<ul class="clean small">${s.findings.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></li>`).join("")}</ol><p class="tiny muted">Accessed ${esc(R.accessed)}. ${esc(R.note)}</p>`)}
  ${card("Public discussion links (dataset 2)", `<ul class="clean">${A.discussions.rows.map((r) => `<li><b>${esc(r.id)}</b> ${esc(r.platform)} — <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a> <span class="tiny muted">(${esc(r.verification)})</span></li>`).join("")}</ul>`, "", "")}`;
}

// ------------------------------------------------------------------ boot
Promise.all(["/data/analysis.json", "/data/research.json", "/data/cad_modules.json"].map((u) => fetch(u).then((r) => r.json())))
  .then(([a, r, c]) => { A = a; R = r; CAD = c; state.dataset = a.meta.primary_dataset; shell(); })
  .catch((err) => { $("#main").innerHTML = `<div class="loading">Could not load analysis data (${esc(err.message)}). Run <code>python build_project.py</code> first.</div>`; });
