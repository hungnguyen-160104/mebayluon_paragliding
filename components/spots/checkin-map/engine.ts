// @ts-nocheck — mã DOM thuần chuyển từ bản demo đã duyệt; kiểu dữ liệu ở CkMapData bên dưới (chỉ để đọc).
// components/spots/checkin-map/engine.ts
/**
 * BẢN ĐỒ CHECK-IN 3D Tú Lệ – Khau Phạ – Mù Cang Chải (bản 11, chủ duyệt 10/10/2026).
 *
 * Chuyển nguyên từ bản demo đã duyệt (scripts/ban-do-duong-di/ck_v11_template.html + ck_v11_3d.js),
 * chạy trong SHADOW ROOT của <CheckinMap3D>: kiểu và id (#stage, .card, .L…) không đụng CSS của trang.
 *
 *  - Khung đầu: sơ đồ tĩnh (nen-1600.webp) + nhãn HTML đứng thẳng. Không có WebGL / mất mạng → giữ sơ đồ
 *    tĩnh, chạm điểm thì phóng CSS (dự phòng).
 *  - MapLibre GL 6.13 (ESM từ jsdelivr, ghim phiên bản) + địa hình AWS Terrarium + nền OpenFreeMap. Tải xong
 *    thì mờ chéo MỘT lần sang bản đồ 3D; từ đó mọi chuyển cảnh là một lần flyTo.
 *  - Dữ liệu: /checkin-map/data-<vi|en>.json (scripts/ban-do-duong-di/ck_site.py sinh ra).
 *  - Hết hiển thị (cuộn khỏi màn hình) thì dừng vòng vẽ nhãn và dù bay để không tốn pin.
 */
export type CkMapOpts = {
  /** Link bài viết đã đăng, đã gắn tiền tố ngôn ngữ: mã điểm → href. */
  links: Record<string, string>;
  /** Bấm "Chi tiết ↓" trên thẻ: cuộn tới mục của điểm trong danh sách dưới bản đồ. Không có → ẩn nút. */
  onDetails?: (id: string) => void;
  /** Mở sẵn ở một điểm (khối bản đồ trong bài viết của điểm đó): bản đồ hiện ra đã ở điểm, kèm thẻ. */
  focus?: string;
  /** Chữ giao diện theo ngôn ngữ trang (lib/checkin-map/embed.ts CK_UI) — đè lên chữ trong tệp dữ liệu. */
  ui?: Record<string, string>;
  /** Bấm link bài viết (điều hướng phía client). */
  onNavigate: (href: string) => void;
};

const V = "6.13.0", CDN = `https://cdn.jsdelivr.net/npm/maplibre-gl@${V}/dist/`;

export function mountCheckinMap(root: ShadowRoot, D: any, opts: CkMapOpts): () => void {
  const T = { ...D.T, ...(opts.ui || {}) }, CARDS = D.cards, POS = D.pos, LBL = D.lbl, NEN = D.nen;
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let dead = false, vis = true, cur = null, hiAsked = false;
  const cleanups = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn, o)); };
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  root.innerHTML = `<link rel="stylesheet" href="${CDN}maplibre-gl.css"><link rel="stylesheet" href="/checkin-map/engine.css">
<div id="stage">
  <div class="zoom" id="zoom"><div class="sway" id="sway">
    <img class="base" src="${D.poster.s}" alt="${esc(T.alt)}" decoding="async">
    <img class="base hi" id="hi" alt="" aria-hidden="true">
    <div id="anc"></div>
  </div></div>
  <div id="ov"><svg id="ovs"></svg></div>
  <div class="sm3" id="sm3"><div class="m" id="sm3m"></div></div>
  <button id="home3" type="button">${esc(T.home)}</button>
  <div class="card" id="card" role="dialog" aria-live="polite"><button class="x" type="button" aria-label="${esc(T.close)}">×</button><img alt="" decoding="async"><span class="cr"></span><div class="b"><small></small><strong></strong><p></p><div class="acts"><a class="go" hidden>${esc(T.read)}</a>${opts.onDetails ? `<button class="det" type="button">${esc(T.details)}</button>` : ""}</div></div></div>
  <div id="hint">${esc(T.hint)}</div>
</div>`;
  const $ = (s) => root.querySelector(s);
  const stage = $("#stage"), zoomEl = $("#zoom"), anc = $("#anc"), ov = $("#ov"), ovs = $("#ovs"), el = $("#sm3");
  const narrow = () => matchMedia("(max-width: 759px)").matches;
  const ZOOM_SCALE = 4.2, ZOOM_TILT = 32, ZOOM_TURN = -7;

  // ───────── lớp nhãn HTML trên sơ đồ tĩnh (đặt lại mỗi khung hình theo điểm neo → chữ luôn đứng)
  function mkAnc(x, y) { const a = document.createElement("div"); a.className = "anc"; a.style.left = (x / NEN.W * 100) + "%"; a.style.top = (y / NEN.H * 100) + "%"; anc.appendChild(a); return a; }
  const ITEMS = [];
  for (const L of LBL) {
    const e = document.createElement("div"); e.className = "L " + L.cls; e.innerHTML = `<span class="t">${L.html}</span>`;
    ov.appendChild(e);
    const it = { L, el: e, a: mkAnc(L.x, L.y), p: L.px != null ? mkAnc(L.px, L.py) : null, line: null, pt: null };
    if (it.p && L.lead) { it.line = document.createElementNS("http://www.w3.org/2000/svg", "line"); ovs.appendChild(it.line); }
    if (it.p && L.mark) { it.pt = document.createElement("div"); it.pt.className = "P" + (L.mark === "target" ? " tg" : ""); it.pt.innerHTML = L.mark === "logo" ? `<s></s><img src="${D.logo}" alt=""><i></i>` : "<i></i>"; ov.appendChild(it.pt); }
    if (L.id) { e.addEventListener("click", (ev) => { ev.stopPropagation(); tap(L.id); }); e.setAttribute("role", "button"); e.tabIndex = 0; e.addEventListener("keydown", (ev) => { if (ev.key === "Enter") tap(L.id); }); }
    ITEMS.push(it);
  }
  for (const d of D.nen.det) { const e = document.createElement("div"); e.className = "L det " + d.k; e.innerHTML = `<span class="t">${esc(d.t)}</span>`; ov.appendChild(e); ITEMS.push({ L: { prio: 0, det: true }, el: e, a: mkAnc(d.x + 8, d.y - 6) }); }
  const flyLine = document.createElementNS("http://www.w3.org/2000/svg", "line"); flyLine.setAttribute("class", "fly"); ovs.appendChild(flyLine);
  const lk = LBL.find((l) => l.id === "khau-pha" && l.px != null), lc = LBL.find((l) => l.id === "clubhouse" && l.px != null);
  const flyA = mkAnc(lk.px, lk.py), flyB = mkAnc(lc.px, lc.py);

  const GSVG = (c) => `<svg viewBox="0 0 34 30" width="30" height="26"><path d="M2 11C8 2 26 2 32 11C27 9 21 8.5 17 8.5S7 9 2 11Z" fill="${c}" stroke="#1c1a16" stroke-width="1.3"/><path d="M4 10.5L17 24M30 10.5L17 24M10 9L17 24M24 9L17 24" stroke="#1c1a16" stroke-width=".7" opacity=".8"/><circle cx="17" cy="25" r="2.6" fill="#1c1a16"/></svg>`;
  const GLIDE = [{ c: "#ce362a", t0: .12, sp: 1 / 34 }, { c: "#f2963e", t0: .42, sp: 1 / 28 }, { c: "#2e8cbe", t0: .7, sp: 1 / 38 },
    { c: "#eec02c", at: "B", r: 26, per: 22, ph: 0 }, { c: "#ce362a", at: "B", r: 18, per: 30, ph: 2 }, { c: "#2e8cbe", at: "A", r: 22, per: 26, ph: 1 }];
  for (const g of GLIDE) { g.el = document.createElement("div"); g.el.className = "gl"; g.el.innerHTML = GSVG(g.c); ov.appendChild(g.el); }
  function glideFrame(ax, ay, bx, by, now) {
    const t = now / 1000;
    for (const g of GLIDE) { let x, y;
      if (g.at) { const [cx, cy] = g.at === "A" ? [ax, ay] : [bx, by], a = (RM ? g.ph : t * 2 * Math.PI / g.per + g.ph); x = cx + Math.cos(a) * g.r * 1.6; y = cy - 30 + Math.sin(a) * g.r * .6; }
      else { const k = RM ? g.t0 : ((g.t0 + t * g.sp) % 1); x = ax + (bx - ax) * k; y = ay + (by - ay) * k - 14 - Math.sin(k * Math.PI) * 26 + (RM ? 0 : Math.sin(t * 1.3 + g.t0 * 9) * 2); }
      g.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; }
  }
  const center = (e, r0) => { const r = e.getBoundingClientRect(); return [r.left - r0.left, r.top - r0.top]; };
  let raf = 0;
  function frame() {
    raf = 0;
    if (dead || !vis || stage.classList.contains("live")) return;      // bản đồ 3D đã thay chỗ / ngoài màn hình: nghỉ
    const r0 = stage.getBoundingClientRect(), W = r0.width, H = r0.height;
    ov.style.setProperty("--fs", Math.max(10, Math.min(14, W / 2400 * 34)).toFixed(1) + "px");
    const zoomed = zoomEl.classList.contains("zooming"), placed = [];
    const list = ITEMS.slice().sort((a, b) => ((b.L.id && b.L.id === cur) - (a.L.id && a.L.id === cur)) || (b.L.prio - a.L.prio));
    for (const it of list) {
      let [x, y] = center(it.a, r0);
      if (cur && it.L.id === cur && it.p && zoomed) { const [px, py] = center(it.p, r0); if (x < 40 || x > W - 40 || y < 20 || y > H - 20 || Math.hypot(x - px, y - py) > 220) { x = px; y = py - (it.L.mark === "logo" ? 78 : 44); } }
      let show = x > -60 && x < W + 60 && y > -30 && y < H + 30;
      if (it.L.det && !zoomed) show = false;
      if (it.L.zoomOnly && !zoomed) show = false;
      if (show) {
        it.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
        it.el.classList.remove("hide");
        const t = it.el.firstChild, w = t.offsetWidth, h = t.offsetHeight, bx = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
        if (placed.some((b) => bx[0] < b[2] + 3 && b[0] < bx[2] + 3 && bx[1] < b[3] + 3 && b[1] < bx[3] + 3)) show = false; else placed.push(bx);
      }
      it.el.classList.toggle("hide", !show);
      it.el.classList.toggle("on", !!cur && it.L.id === cur);
      it.el.classList.toggle("dim", !!cur && !!it.L.id && it.L.id !== cur && !it.L.det);
      if (it.p) { const [px, py] = center(it.p, r0);
        if (it.pt) it.pt.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px)`;
        if (it.line) { if (show) { it.line.setAttribute("x1", px); it.line.setAttribute("y1", py); it.line.setAttribute("x2", x); it.line.setAttribute("y2", y); it.line.style.display = ""; } else it.line.style.display = "none"; } }
    }
    const [ax, ay] = center(flyA, r0), [bx2, by2] = center(flyB, r0);
    flyLine.setAttribute("x1", ax); flyLine.setAttribute("y1", ay); flyLine.setAttribute("x2", bx2); flyLine.setAttribute("y2", by2);
    glideFrame(ax, ay, bx2, by2, performance.now());
    raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && !dead) raf = requestAnimationFrame(frame); };
  kick();

  // ───────── thẻ điểm + chạm điểm
  const card = $("#card"), cimg = card.querySelector("img"), go = card.querySelector("a.go");
  function fillCard(id) {
    const c = CARDS[id], ph = c.photo;
    card.classList.remove("on"); void card.offsetWidth;
    card.querySelector(".cr").textContent = ph ? ph.credit : "";
    if (ph) { cimg.src = ph.src; cimg.alt = c.name; cimg.style.display = ""; card.classList.add("ph"); } else { cimg.removeAttribute("src"); cimg.style.display = "none"; card.classList.remove("ph"); }
    card.querySelector("small").textContent = c.tag; card.querySelector("strong").textContent = c.name; card.querySelector("p").textContent = c.desc;
    const href = opts.links[id];
    if (href) { go.href = href; go.hidden = false; } else { go.removeAttribute("href"); go.hidden = true; }
  }
  const showCard = (id) => { if (cur !== id) return; fillCard(id); card.classList.add("on"); };
  on(go, "click", (e) => { const h = go.getAttribute("href"); if (h && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); opts.onNavigate(h); } });
  const det = card.querySelector("button.det");
  if (det) on(det, "click", () => cur && opts.onDetails && opts.onDetails(cur));
  function tap(id) {
    if (!CARDS[id] || cur === id) return;
    if (!POS[id] && !ok3d(id)) { closeZoom(); if (opts.onDetails) opts.onDetails(id); return; }       // ngoài khung sơ đồ tĩnh (Lùng Cúng) khi không có 3D
    cur = id; card.classList.remove("on");
    if (ok3d(id)) { $("#home3").style.display = "block"; open3d(id, () => showCard(id)); return; }   // MỘT chuyển cảnh: bay 3D
    // dự phòng: phóng tĩnh
    if (!hiAsked) { hiAsked = true; const hi = $("#hi"); hi.onload = () => hi.classList.add("on"); hi.src = D.poster.l; }
    const p = POS[id], x = p.x / NEN.W * 100, y = (p.y - NEN.y0) / NEN.H * 100;
    zoomEl.style.transformOrigin = `${x}% ${y}%`; $("#sway").style.transformOrigin = `${x}% ${y}%`;
    zoomEl.style.transform = `translate(${(narrow() ? 50 : 36) - x}%, ${(narrow() ? 40 : 58) - y}%) perspective(1000px) rotateX(${ZOOM_TILT}deg) rotateZ(${ZOOM_TURN}deg) scale(${ZOOM_SCALE})`;
    zoomEl.classList.add("zooming"); stage.classList.add("zoomed");
    fillCard(id); card.classList.add("on"); kick();
  }
  function closeStatic() {
    cur = null; $("#home3").style.display = "none"; zoomEl.style.transform = ""; zoomEl.classList.remove("zooming"); stage.classList.remove("zoomed"); card.classList.remove("on");
  }
  function closeZoom() { if (close3d()) return; closeStatic(); kick(); }
  on(card.querySelector(".x"), "click", closeZoom);
  on(stage, "click", (e) => { if (cur && !e.target.closest(".card,.L,#sm3")) closeZoom(); });
  on(document, "keydown", (e) => { if (e.key === "Escape" && cur) closeZoom(); });
  on($("#home3"), "click", closeZoom);

  // ───────── bản đồ 3D (MapLibre)
  const CAM = D.cam, LB = D.lb, OVL = D.ov, RT = D.rt, ST = D.st;
  const BOUNDS = [[104.07, 21.725], [104.33, 21.875]];
  const FONT = ["Noto Sans Regular"], FONT_B = ["Noto Sans Bold"], INK = "#1c1a16", PAPER = "#fffdf6";
  const STOP_WORDS = ["Tú Lệ", "Mù Cang Chải", "Ngã Ba Kim", "Lìm Thái", "Lìm Mông", "Kim Nọi", "Púng Luông", "La Pán Tẩn", "Chao"];
  const NM = ["coalesce", ["get", "name:vi"], ["get", "name"], ""];
  const DUP = ["!", ["any", ...["le champ", "garrya", "mebayluon", "khau phạ", "khau pha", "mâm xôi", "móng ngựa", "kim nọi", "lũng cúng", "púng luông", "huy thanh", "dù lượn", "aragl", "tú lệ", "mù cang chải", "lìm thái", "lìm mông"].map((t) => ["in", t, ["downcase", NM]])]];
  const RAD = (id) => { const sel = ["==", ["get", "id"], id || "-"]; return ["interpolate", ["linear"], ["zoom"], 10, ["case", sel, 9, 6], 13, ["case", sel, 12, 8.5], 16, ["case", sel, 13, 10]]; };
  let map = null, auto = false, failed = false, ready = false, OVCAM = null, OUT = false, glRaf = 0, instantNext = false;
  function style() {
    const w = (a, b) => ["interpolate", ["exponential", 1.6], ["zoom"], 12, a, 17, b];
    const lc = { "line-cap": "round", "line-join": "round" };
    return { version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
      sources: {
        omt: { type: "vector", url: "https://tiles.openfreemap.org/planet", attribution: "© OpenStreetMap contributors · OpenFreeMap" },
        dem: { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 15, attribution: T.dem },
        ours: { type: "geojson", data: OVL }, rt: { type: "geojson", data: RT }, stops: { type: "geojson", data: ST }, lb: { type: "geojson", data: LB } },
      terrain: { source: "dem", exaggeration: 1.35 },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": "#c4d292" } },
        { id: "relief", type: "color-relief", source: "dem", paint: { "color-relief-color": ["interpolate", ["linear"], ["elevation"], 500, "rgb(134,184,124)", 1000, "rgb(196,210,146)", 1600, "rgb(222,196,146)", 2300, "rgb(228,224,218)"] } },
        { id: "shade", type: "hillshade", source: "dem", paint: { "hillshade-exaggeration": 0.55, "hillshade-shadow-color": "#3a2c1c", "hillshade-highlight-color": "#fffdf6", "hillshade-accent-color": "#5a4630" } },
        { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": "#7fb4d6" } },
        { id: "river-glow", type: "line", source: "omt", "source-layer": "waterway", minzoom: 13, paint: { "line-color": "#dff0fa", "line-opacity": 0.85, "line-width": ["interpolate", ["exponential", 1.7], ["zoom"], 13, ["match", ["get", "class"], "river", 4, 2.5], 17, ["match", ["get", "class"], "river", 34, 20]] }, layout: lc },
        { id: "river", type: "line", source: "omt", "source-layer": "waterway", paint: { "line-color": "#3d8fcc", "line-width": ["interpolate", ["exponential", 1.7], ["zoom"], 11, ["match", ["get", "class"], "river", 1.6, 0.8], 14, ["match", ["get", "class"], "river", 5, 3], 17, ["match", ["get", "class"], "river", 26, 14]] }, layout: lc },
        { id: "path", type: "line", source: "omt", "source-layer": "transportation", minzoom: 13, filter: ["in", ["get", "class"], ["literal", ["path", "track"]]], paint: { "line-color": "#6e4628", "line-width": w(0.6, 2.2), "line-dasharray": [2, 1.5] } },
        { id: "minor-case", type: "line", source: "omt", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["minor", "service"]]], paint: { "line-color": "#8a6a4a", "line-width": w(1.2, 7) }, layout: lc },
        { id: "minor", type: "line", source: "omt", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["minor", "service"]]], paint: { "line-color": PAPER, "line-width": w(0.6, 5) }, layout: lc },
        { id: "major-case", type: "line", source: "omt", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["tertiary", "secondary", "primary", "trunk"]]], paint: { "line-color": "#5c1e0e", "line-width": w(3, 14) }, layout: lc },
        { id: "major", type: "line", source: "omt", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["tertiary", "secondary", "primary", "trunk"]]], paint: { "line-color": "#e24a28", "line-width": w(1.8, 10) }, layout: lc },
        { id: "house", type: "fill-extrusion", source: "omt", "source-layer": "building", minzoom: 14, paint: { "fill-extrusion-color": "#b49a80", "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6], "fill-extrusion-opacity": 0.92 } },
        { id: "ql-case", type: "line", source: "ours", filter: ["==", ["get", "k"], "ql32"], paint: { "line-color": "#5c1e0e", "line-width": w(4.5, 16) }, layout: lc },
        { id: "ql", type: "line", source: "ours", filter: ["==", ["get", "k"], "ql32"], paint: { "line-color": "#e24a28", "line-width": w(2.8, 11) }, layout: lc },
        { id: "spur-case", type: "line", source: "ours", filter: ["==", ["get", "k"], "spur"], paint: { "line-color": "#5c1e0e", "line-width": w(2, 9) }, layout: lc },
        { id: "spur", type: "line", source: "ours", filter: ["==", ["get", "k"], "spur"], paint: { "line-color": "#e8743c", "line-width": w(1.2, 6) }, layout: lc },
        { id: "flight", type: "line", source: "ours", filter: ["==", ["get", "k"], "flight"], paint: { "line-color": "#78146e", "line-width": w(2, 6), "line-dasharray": [3, 2] } },
        { id: "route", type: "line", source: "rt", filter: ["==", ["get", "id"], ""], paint: { "line-color": "#f2963e", "line-width": w(3, 9), "line-dasharray": [2, 1.2] }, layout: lc },
        { id: "road-name", type: "symbol", source: "omt", "source-layer": "transportation_name", minzoom: 14, layout: { "symbol-placement": "line", "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"]], "text-font": FONT, "text-size": 12, "text-padding": 6, "symbol-spacing": 420, "symbol-sort-key": 5 }, paint: { "text-color": "#5c1e0e", "text-halo-color": PAPER, "text-halo-width": 1.6 } },
        { id: "water-name", type: "symbol", source: "omt", "source-layer": "waterway", minzoom: 13, layout: { "symbol-placement": "line", "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"]], "text-font": FONT_B, "text-size": ["interpolate", ["linear"], ["zoom"], 13, 12, 17, 15], "text-padding": 6, "symbol-spacing": 480, "symbol-sort-key": 5 }, paint: { "text-color": "#13568a", "text-halo-color": PAPER, "text-halo-width": 1.8 } },
        { id: "poi", type: "symbol", source: "omt", "source-layer": "poi", minzoom: 15, filter: ["all", ["any", ["in", ["get", "subclass"], ["literal", ["viewpoint", "guest_house", "hotel", "restaurant", "parking"]]], ["in", ["get", "class"], ["literal", ["lodging", "restaurant", "parking"]]]], ["<=", ["get", "rank"], 25], DUP], layout: { "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"]], "text-font": FONT, "text-size": 11, "text-max-width": 8, "text-padding": 5, "symbol-sort-key": ["get", "rank"], "text-variable-anchor": ["top", "bottom", "left", "right"], "text-radial-offset": 0.4 }, paint: { "text-color": "#47443b", "text-halo-color": PAPER, "text-halo-width": 1.4 } },
        { id: "peak", type: "symbol", source: "omt", "source-layer": "mountain_peak", minzoom: 12, filter: DUP, layout: { "text-field": ["concat", "▲ ", NM, ["case", ["has", "ele"], ["concat", " ", ["to-string", ["get", "ele"]], " m"], ""]], "text-font": FONT, "text-size": 12, "text-padding": 5, "symbol-sort-key": ["-", 0, ["coalesce", ["get", "ele"], 0]], "text-variable-anchor": ["top", "bottom", "left", "right"], "text-radial-offset": 0.3 }, paint: { "text-color": "#4a3420", "text-halo-color": PAPER, "text-halo-width": 1.6 } },
        { id: "waterfall", type: "symbol", source: "omt", "source-layer": "poi", minzoom: 12, filter: ["in", ["get", "subclass"], ["literal", ["waterfall", "rapids"]]], layout: { "text-field": ["concat", "≋ ", ["coalesce", ["get", "name:vi"], ["get", "name"], "Thác"]], "text-font": FONT_B, "text-size": ["interpolate", ["linear"], ["zoom"], 12, 12, 17, 15], "text-anchor": "left", "text-offset": [0.6, 0], "text-padding": 5 }, paint: { "text-color": "#13568a", "text-halo-color": PAPER, "text-halo-width": 2 } },
        { id: "place", type: "symbol", source: "omt", "source-layer": "place", filter: ["all", ["in", ["get", "class"], ["literal", ["village", "hamlet", "suburb", "neighbourhood", "town", "isolated_dwelling"]]], ["!", ["in", ["coalesce", ["get", "name:vi"], ["get", "name"]], ["literal", STOP_WORDS]]], DUP], layout: { "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"]], "text-font": FONT_B, "text-size": ["interpolate", ["linear"], ["zoom"], 12, 11, 16, 14], "text-letter-spacing": 0.04, "text-padding": 6, "symbol-sort-key": ["match", ["get", "class"], "town", 0, "village", 1, 2], "text-variable-anchor": ["center", "top", "bottom", "left", "right"], "text-radial-offset": 0.5 }, paint: { "text-color": INK, "text-halo-color": PAPER, "text-halo-width": 1.8 } },
        { id: "stop-dot", type: "circle", source: "stops", filter: ["has", "n"], paint: { "circle-radius": RAD(null), "circle-color": ["match", ["get", "kind"], "fly", "#0f2e21", "land", "#164e6e", "#da251d"], "circle-stroke-color": PAPER, "circle-stroke-width": 2.5, "circle-pitch-alignment": "viewport" } },
      ] };
  }
  function ovCam() {        // khớp sơ đồ tĩnh: hướng nhìn 287°, nghiêng 45°, ôm sát 17 điểm dọc QL32 (bỏ Lùng Cúng ở xa)
    const pts = ST.features.filter((f) => f.properties.n && f.properties.id !== "lung-cung").map((f) => f.geometry.coordinates);
    const c = map.cameraForBounds(BOUNDS, { bearing: -73, pitch: 45, padding: 20 }); const cam = { center: c.center, zoom: c.zoom, bearing: -73, pitch: 45 };
    const W = map.getContainer().clientWidth, H = map.getContainer().clientHeight, Tp = 56, Bm = W < 500 ? 64 : 52, S = W < 500 ? 34 : 70;
    for (let i = 0; i < 6; i++) { map.jumpTo(cam); const P = pts.map((p) => map.project(p));
      const x0 = Math.min(...P.map((p) => p.x)), x1 = Math.max(...P.map((p) => p.x)), y0 = Math.min(...P.map((p) => p.y)), y1 = Math.max(...P.map((p) => p.y));
      const ll = map.unproject([W / 2 + ((x0 + x1) / 2 - W / 2), H / 2 + ((y0 + y1) / 2 - (Tp + H - Bm) / 2)]); cam.center = [ll.lng, ll.lat];
      cam.zoom = Math.min(13, cam.zoom + 0.85 * Math.log2(Math.min((W - 2 * S) / Math.max(1, x1 - x0), (H - Tp - Bm) / Math.max(1, y1 - y0)))); }
    return cam;
  }
  function pad() { const r = el.getBoundingClientRect(); return innerWidth < 760 ? { top: 40, bottom: Math.round(r.height * 0.42), left: 20, right: 20 } : { top: 60, bottom: Math.round(r.height * 0.12), left: 30, right: Math.min(360, Math.round(r.width * 0.45)) }; }
  function fly(id, done) {
    const f = ST.features.find((x) => x.properties.id === id), c = CAM[id]; if (!map || !f || !c) return;
    const sel = ["==", ["get", "id"], id];
    map.setPaintProperty("stop-dot", "circle-radius", RAD(id));
    map.setPaintProperty("stop-dot", "circle-stroke-color", ["case", sel, "#f2963e", PAPER]);
    map.setPaintProperty("stop-dot", "circle-stroke-width", ["case", sel, 4, 2.5]);
    map.setFilter("route", ["==", ["get", "id"], id]);
    auto = true; map.once("moveend", () => { auto = false; lod(); if (done) done(); });
    const instant = RM || instantNext; instantNext = false;
    map.flyTo({ center: f.geometry.coordinates, zoom: c.zoom, pitch: c.pitch, bearing: c.bearing, padding: pad(), duration: instant ? 0 : 2600, curve: 1.3, essential: true });
  }
  const img = (src, w, h) => new Promise((ok, no) => { const i = w ? new Image(w, h) : new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const svgUri = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  function lod() {
    if (!map || !OVCAM || !map.getLayer("clu")) return; const out = map.getZoom() < OVCAM.zoom - 0.08; if (out === OUT) return; OUT = out;
    const v = (b) => (b ? "visible" : "none");
    for (const ly of ["plaque", "plaque-pin", "stop-dot", "stop-num", "icons", "gliders", "flight"]) if (map.getLayer(ly)) map.setLayoutProperty(ly, "visibility", v(!out));
    for (const ly of ["clu", "clu-lb", "clu-dot", "clu-name"]) map.setLayoutProperty(ly, "visibility", v(out));
  }
  const ok3d = (id) => ready && !failed && !!CAM[id];
  function selLabel(id) { const k = id || "-"; map.setFilter("plaque", ["all", ["has", "id"], ["!=", ["get", "id"], k]]); map.setFilter("plaque-sel", ["==", ["get", "id"], k]); }
  const open3d = (id, done) => { selLabel(id); fly(id, done); };
  function close3d() {
    if (!map || !ready) return false;
    map.setFilter("route", ["==", ["get", "id"], ""]); selLabel(null);
    ["circle-radius", "circle-stroke-color", "circle-stroke-width"].forEach((p, i) => map.setPaintProperty("stop-dot", p, [RAD(null), PAPER, 2.5][i]));
    map.stop(); auto = true; map.once("moveend", () => { auto = false; lod(); }); map.flyTo({ ...OVCAM, duration: RM ? 0 : 2200, curve: 1.3, essential: true });
    closeStatic();
    return true;
  }
  async function boot() {
    try {
      const ml = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ CDN + "maplibre-gl.mjs");
      if (dead) return;
      const L = ml.default && ml.default.Map ? ml.default : ml;
      // thư viện tự tìm maplibre-gl-worker.mjs cạnh mình trên CDN và tự bọc blob khi khác nguồn — không đặt setWorkerUrl
      const IM = { logo: await img(D.logo),
        glider: await img(svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="68" height="60" viewBox="0 0 34 30"><path d="M2 11C8 2 26 2 32 11C27 9 21 8.5 17 8.5S7 9 2 11Z" fill="#f2963e" stroke="#1c1a16" stroke-width="1.3"/><path d="M4 10.5L17 24M30 10.5L17 24" stroke="#1c1a16" stroke-width=".8"/><circle cx="17" cy="25" r="2.6" fill="#1c1a16"/></svg>'), 68, 60),
        houses: await img(svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="72" height="48" viewBox="0 0 36 24"><path d="M3 12L10 5L17 12Z M19 12L26 5L33 12Z M11 14L18 7L25 14Z" fill="#96602c" stroke="#1c1a16" stroke-width="1"/><path d="M5 12h10v8H5z M21 12h10v8H21z M13 14h10v8H13z" fill="#d6b07a" stroke="#1c1a16" stroke-width="1"/></svg>'), 72, 48) };
      if (dead) return;
      map = new L.Map({ container: $("#sm3m"), style: style(), bounds: BOUNDS, pitch: 45, bearing: -73, maxPitch: 75, attributionControl: { compact: true }, dragRotate: true, fadeDuration: 150, cooperativeGestures: false });
      map.addControl(new L.NavigationControl({ visualizePitch: true }), "bottom-right");
      map.on("error", (e) => console.warn("[check-in 3D]", e && e.error && e.error.message));
      map.once("load", async () => {
        for (const k in IM) map.addImage(k, IM[k]);
        map.addLayer({ id: "icons", type: "symbol", source: "stops", filter: ["has", "icon"], layout: { "icon-image": ["get", "icon"], "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.35, 16, 0.7], "icon-anchor": "bottom", "icon-offset": [0, -14], "icon-allow-overlap": true } }, "stop-dot");
        // điểm = chấm có số (như sơ đồ tĩnh)
        map.addLayer({ id: "stop-num", type: "symbol", source: "stops", filter: ["has", "n"], layout: { "text-field": ["to-string", ["get", "n"]], "text-font": FONT_B, "text-size": ["interpolate", ["linear"], ["zoom"], 10, 7.5, 13, 10, 16, 11], "text-allow-overlap": true, "text-ignore-placement": true, "text-pitch-alignment": "viewport" }, paint: { "text-color": "#fff" } });
        OVCAM = ovCam(); map.jumpTo(OVCAM); map.setMinZoom(OVCAM.zoom - 0.6); map.setMaxBounds([[103.98, 21.64], [104.42, 21.95]]);
        // thu nhỏ quá toàn cảnh: gom điểm thành cụm "khu · n điểm", bấm cụm thì bay vào
        map.addSource("stc", { type: "geojson", data: { type: "FeatureCollection", features: ST.features.filter((f) => f.properties.n) }, cluster: true, clusterRadius: 40, clusterMaxZoom: 16, clusterProperties: { sn: ["+", ["get", "n"]] } });
        const AREA = ["let", "avg", ["/", ["get", "sn"], ["get", "point_count"]], ["case", ["<=", ["var", "avg"], 3.5], "Tú Lệ", ["<=", ["var", "avg"], 6.5], "Bản Lìm", ["<=", ["var", "avg"], 8.5], "Đèo Khau Phạ", ["<=", ["var", "avg"], 10.5], "Ngã Ba Kim", ["<=", ["var", "avg"], 13.5], "La Pán Tẩn", ["literal", "Mù Cang Chải"]]];
        map.addLayer({ id: "clu-dot", type: "circle", source: "stc", filter: ["!", ["has", "point_count"]], layout: { visibility: "none" }, paint: { "circle-radius": 6, "circle-color": ["match", ["get", "kind"], "fly", "#0f2e21", "land", "#164e6e", "#da251d"], "circle-stroke-color": PAPER, "circle-stroke-width": 2, "circle-pitch-alignment": "viewport" } });
        map.addLayer({ id: "clu-name", type: "symbol", source: "stc", filter: ["!", ["has", "point_count"]], layout: { visibility: "none", "text-field": ["get", "name"], "text-font": FONT_B, "text-size": 11, "text-variable-anchor": ["bottom", "top", "right", "left"], "text-radial-offset": 0.8, "text-padding": 4, "symbol-sort-key": ["get", "n"] }, paint: { "text-color": INK, "text-halo-color": PAPER, "text-halo-width": 2 } });
        map.addLayer({ id: "clu", type: "circle", source: "stc", filter: ["has", "point_count"], layout: { visibility: "none" }, paint: { "circle-radius": 7, "circle-color": "#da251d", "circle-stroke-color": PAPER, "circle-stroke-width": 2.5, "circle-pitch-alignment": "viewport" } });
        map.addLayer({ id: "clu-lb", type: "symbol", source: "stc", filter: ["has", "point_count"], layout: { visibility: "none", "text-field": ["concat", AREA, " · ", ["to-string", ["get", "point_count"]], " " + T.stops], "text-font": FONT_B, "text-size": 12.5, "text-max-width": 30, "text-anchor": "bottom", "text-offset": [0, -0.9],
          "icon-image": "p-exit", "icon-text-fit": "both", "icon-text-fit-padding": [4, 8, 4, 8], "icon-anchor": "bottom", "text-padding": 4, "icon-padding": 4 }, paint: { "text-color": "#fbf6ea" } });
        for (const ly of ["clu", "clu-lb"]) {
          map.on("click", ly, async (e) => { const f = e.features && e.features[0]; if (!f) return;
            let z = OVCAM.zoom + 0.4; try { z = Math.max(z, await map.getSource("stc").getClusterExpansionZoom(f.properties.cluster_id)); } catch (_) {}
            auto = true; map.once("moveend", () => { auto = false; lod(); }); map.easeTo({ center: f.geometry.coordinates, zoom: Math.min(z, 14), duration: 900 }); });
          map.on("mouseenter", ly, () => { map.getCanvas().style.cursor = "pointer"; }); map.on("mouseleave", ly, () => { map.getCanvas().style.cursor = ""; });
        }
        map.on("zoom", () => { if (!auto) lod(); });
        // dù bay là là: lớp symbol nằm DƯỚI bảng tên → không che chữ
        const A = ST.features.find((f) => f.properties.id === "khau-pha").geometry.coordinates, B = ST.features.find((f) => f.properties.id === "clubhouse").geometry.coordinates;
        const G3 = [{ c: "#ce362a", t0: .1, sp: 1 / 40 }, { c: "#f2963e", t0: .45, sp: 1 / 32 }, { c: "#2e8cbe", t0: .75, sp: 1 / 46 }, { c: "#eec02c", at: B, r: .0022, per: 26, ph: 0 }, { c: "#ce362a", at: B, r: .0015, per: 34, ph: 2 }, { c: "#2e8cbe", at: A, r: .0018, per: 30, ph: 1 }];
        const gsv = (c) => svgUri(GSVG(c).replace('width="30" height="26"', 'xmlns="http://www.w3.org/2000/svg" width="60" height="52"'));
        for (const c of new Set(G3.map((g) => g.c))) map.addImage("g" + c.slice(1), await img(gsv(c), 60, 52), { pixelRatio: 2 });
        map.addSource("gl", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "gliders", type: "symbol", source: "gl", layout: { "icon-image": ["get", "img"], "icon-size": ["get", "sz"], "icon-offset": ["get", "off"], "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true } });
        let lastT = 0;
        const tick = (now) => {
          glRaf = 0; if (dead || !map) return;
          if (now - lastT > 70) { lastT = now; const t = now / 1000, z = map.getZoom(), up = Math.max(6, Math.min(70, (z - 11) * 16)), sc = Math.max(0.6, Math.min(1, 0.6 + (z - 11) * 0.2)), spread = Math.max(1, Math.pow(2, 12.3 - z));
            const Fs = G3.map((g) => { let lng, lat, h = up;
              if (g.at) { const a = RM ? g.ph : t * 2 * Math.PI / g.per + g.ph; lng = g.at[0] + Math.cos(a) * g.r * spread; lat = g.at[1] + Math.sin(a) * g.r * .75 * spread; h = up * .6; }
              else { const k = RM ? g.t0 : ((g.t0 + t * g.sp) % 1); lng = A[0] + (B[0] - A[0]) * k; lat = A[1] + (B[1] - A[1]) * k; h = up * (1.6 - k); }
              return { type: "Feature", properties: { img: "g" + g.c.slice(1), sz: sc, off: [0, -h / sc] }, geometry: { type: "Point", coordinates: [lng, lat] } }; });
            map.getSource("gl").setData({ type: "FeatureCollection", features: Fs }); }
          if (!RM && vis) glRaf = requestAnimationFrame(tick);
        };
        startGliders = () => { if (!glRaf && !dead && !RM) glRaf = requestAnimationFrame(tick); };
        tick(performance.now());
        // bảng tên kiểu nhà (ảnh co giãn 9 ô) — chữ luôn đứng, tự ẩn khi chồng nhau
        const plq = (fill, stroke, lw) => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d");
          g.fillStyle = "rgba(0,0,0,.22)"; g.beginPath(); g.roundRect(3, 5, 26, 25, 7); g.fill();
          g.fillStyle = fill; g.strokeStyle = stroke; g.lineWidth = lw; g.beginPath(); g.roundRect(2, 2, 27, 26, 7); g.fill(); g.stroke();
          return g.getImageData(0, 0, 32, 32); };
        const po = { stretchX: [[9, 23]], stretchY: [[9, 21]], content: [7, 6, 25, 24], pixelRatio: 2 };
        map.addImage("p-norm", plq("#fffdf6", "#1c1a16", 2.2), po); map.addImage("p-on", plq("#fffdf6", "#f2963e", 5), po);
        map.addImage("p-fly", plq("#0f2e21", "#f2963e", 4), po); map.addImage("p-land", plq("#164e6e", "#96cde8", 4), po);
        map.addImage("p-km", plq("#8c2418", "#fbf6ea", 3), po); map.addImage("p-exit", plq("#1c1a16", "#1c1a16", 2), po);
        const head = ["case", ["has", "l1"], ["format", ["concat", ["get", "l1"], "\n"], { "font-scale": 0.78, "text-color": ["match", ["get", "kind"], "fly", "#ffd29e", "land", "#ffd29e", "#b05c1e"] }, ["get", "l2"], {}], ["get", "l2"]];
        const ICO = ["match", ["get", "kind"], "fly", "p-fly", "land", "p-land", "km", "p-km", "exit", "p-exit", "p-norm"];
        const TCOL = ["match", ["get", "kind"], "fly", "#fbf6ea", "land", "#fbf6ea", "km", "#fbf6ea", "exit", "#fbf6ea", INK];
        const TSZ = ["match", ["get", "kind"], "fly", 15, "land", 15, "key", 15, "km", 12.5, 13];
        map.addLayer({ id: "plaque-pin", type: "symbol", source: "lb", filter: ["!", ["has", "id"]], layout: { "text-field": ["get", "l2"], "text-font": FONT_B, "text-size": ["interpolate", ["linear"], ["zoom"], 10.5, ["match", ["get", "kind"], "key", 11.5, 10.5], 12.6, TSZ], "text-max-width": 20,
          "icon-image": ICO, "icon-text-fit": "both", "icon-text-fit-padding": [3, 6, 3, 6], "symbol-sort-key": ["get", "pri"], "text-padding": 4, "icon-padding": 4 }, paint: { "text-color": TCOL } });
        const SMALL = ["match", ["get", "kind"], "fly", 12, "land", 12, "key", 11.5, 10.5];
        const VA = { "text-field": ["step", ["zoom"], ["coalesce", ["get", "s"], ["get", "l2"]], 12.6, head], "text-font": FONT_B, "text-size": ["interpolate", ["linear"], ["zoom"], 10.5, SMALL, 12.6, TSZ], "text-justify": "auto", "text-max-width": 20, "text-line-height": 1.15,
          "text-variable-anchor": ["bottom", "top", "right", "left", "bottom-right", "bottom-left"], "text-radial-offset": ["interpolate", ["linear"], ["zoom"], 10.5, 0.7, 13, 1.15],
          "icon-image": ICO, "icon-text-fit": "both", "icon-text-fit-padding": [3, 6, 3, 6], "text-padding": 4, "icon-padding": 4 };
        map.addLayer({ id: "plaque", type: "symbol", source: "lb", filter: ["has", "id"], layout: { ...VA, "symbol-sort-key": ["get", "pri"] }, paint: { "text-color": TCOL } });
        map.addLayer({ id: "plaque-sel", type: "symbol", source: "lb", filter: ["==", ["get", "id"], "-"], layout: { ...VA, "icon-image": ["match", ["get", "kind"], "fly", "p-fly", "land", "p-land", "p-on"], "text-allow-overlap": true, "icon-allow-overlap": true }, paint: { "text-color": TCOL } });
        map.on("click", (e) => { const f = map.queryRenderedFeatures(e.point, { layers: ["plaque-sel", "plaque", "stop-dot", "clu-dot", "clu-name"].filter((l) => map.getLayer(l)) }).find((x) => x.properties.id); if (f) tap(f.properties.id); });   // một lần bấm = một lệnh
        for (const ly of ["plaque", "plaque-sel", "stop-dot"]) { map.on("mouseenter", ly, () => { map.getCanvas().style.cursor = "pointer"; }); map.on("mouseleave", ly, () => { map.getCanvas().style.cursor = ""; }); }
        let shown = false;
        const reveal = () => { if (shown || dead) return; shown = true; el.classList.add("on"); stage.classList.add("live"); };
        const goLive = () => {
          if (ready || dead) return; ready = true;
          const f = opts.focus && CARDS[opts.focus] ? opts.focus : null;
          if (!f) { reveal(); return; }
          // mở sẵn ở điểm: nhảy thẳng (không bay) rồi mới hiện bản đồ khi ô ở đó đã tải — không thấy toàn cảnh chớp qua
          instantNext = true; tap(f);
          map.once("idle", reveal); setTimeout(reveal, 4000);
        };
        map.once("idle", goLive); setTimeout(goLive, 5000);        // ô bản đồ đã tải xong → mờ chéo MỘT lần
      });
    } catch (err) {
      console.warn("[check-in 3D] không dựng được — giữ sơ đồ tĩnh", err); failed = true;
      if (opts.focus && CARDS[opts.focus] && !dead) tap(opts.focus);      // dự phòng: phóng tĩnh tới điểm
    }
  }
  let startGliders = () => {};
  boot();

  // ───────── ngoài màn hình thì nghỉ (vòng vẽ nhãn tĩnh + dù bay 3D)
  const io = new IntersectionObserver((es) => { vis = es.some((x) => x.isIntersecting); if (vis) { kick(); startGliders(); } }, { rootMargin: "100px" });
  io.observe(stage);

  const api = { tap, closeZoom, get map() { return map; }, ok3d };
  (root.host as any).__ck = api;            // tay cầm cho phép thử (Playwright)
  return () => {
    dead = true; io.disconnect(); cleanups.forEach((f) => f());
    if (raf) cancelAnimationFrame(raf); if (glRaf) cancelAnimationFrame(glRaf);
    try { map && map.remove(); } catch (_) {}
    map = null; root.innerHTML = "";
  };
}
