import { MISQUOTES } from "./misquotes";

/**
 * The hero scene: a wall of fabricated quotation cards, a measurement thrown through it,
 * and the one paragraph that can be checked left standing.
 *
 * Drawn rather than fetched. There is no image here to break, so the cards are SVG and the
 * shards are cut out of the cards themselves — each piece is a clipped clone of the card it
 * came from, which is why the text stays readable as it falls. A pile of generic triangles
 * would animate the same and say nothing.
 *
 * The red is correction ink. It marks an error; it is not a wound, and the thing that
 * breaks is always the forgery, never the page it was printed on.
 *
 * Everything below runs after paint. The headline beside it is plain HTML and does not wait
 * on this file.
 */

type Box = { x: number; y: number; w: number; h: number; rot: number };
type Layout = {
  axis: "x" | "y";
  vb: [number, number];
  quote: number;
  who: number;
  pad: number;
  cardLead: number;
  /** Which entries of MISQUOTES this layout has room for. */
  use: number[];
  cards: Box[];
  record: { x: number; y: number; w: number; h: number; size: number; lead: number };
  recLines: string[];
  num: { size: number; from: number; to: number; along: number; lead: number };
  still: { x: number; y: number };
};

const RECORD = {
  root: "0x78e0a0fd…14c4e972",
  name: "frederik.eth",
  index: 4,
  total: 4,
};

const WIDE: Layout = {
  axis: "x",
  vb: [1400, 560],
  quote: 17,
  who: 11,
  pad: 22,
  cardLead: 20,
  use: [0, 1, 2, 3, 4],
  cards: [
    { x: 20, y: 56, w: 320, h: 178, rot: -2.2 },
    { x: 280, y: 388, w: 280, h: 128, rot: 2.6 },
    { x: 500, y: 26, w: 320, h: 186, rot: -1.4 },
    { x: 770, y: 398, w: 260, h: 118, rot: 3.2 },
    { x: 990, y: 74, w: 320, h: 176, rot: -2.8 },
  ],
  record: { x: 420, y: 155, w: 520, h: 252, size: 21, lead: 30 },
  recLines: [
    "“…government of the people, by the",
    "people, for the people, shall not",
    "perish from the earth.”",
  ],
  num: { size: 250, from: -520, to: 1700, along: 286, lead: 96 },
  still: { x: 165, y: 300 },
};

/* Three cards on a phone rather than five: the whole field has to be visible at once, or
   the sweep happens somewhere the reader is not looking. */
const NARROW: Layout = {
  axis: "y",
  vb: [420, 450],
  quote: 15.5,
  who: 9.5,
  pad: 20,
  cardLead: 20,
  use: [0, 1, 3],
  cards: [
    { x: 8, y: 10, w: 258, h: 156, rot: -2 },
    { x: 148, y: 186, w: 250, h: 116, rot: 2.4 },
    { x: 30, y: 322, w: 230, h: 96, rot: 1.6 },
  ],
  record: { x: 18, y: 110, w: 384, h: 232, size: 15.5, lead: 22 },
  recLines: [
    "“…government of the people,",
    "by the people, for the people,",
    "shall not perish from",
    "the earth.”",
  ],
  num: { size: 118, from: -190, to: 720, along: 214, lead: 48 },
  still: { x: 214, y: 56 },
};

const NS = "http://www.w3.org/2000/svg";

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, name);
  for (const key in attrs) node.setAttribute(key, String(attrs[key]));
  return node;
}

function lines(
  x: number,
  y: number,
  rows: string[],
  lead: number,
  attrs: Record<string, string | number>,
): SVGTextElement {
  const text = el("text", { x, y, ...attrs });
  rows.forEach((row, i) => {
    const span = el("tspan", { x, dy: i ? lead : 0 });
    span.textContent = row;
    text.append(span);
  });
  return text;
}

/* ---- the geometry of a break -------------------------------------------------------
 * Rays are cast from the point of impact to the edge of the card, sorted by how far round
 * the perimeter they land, and each neighbouring pair closes into a shard — with any
 * corner that falls between them folded in, or the polygon would cut the corner off. */

function perimeter(b: Box, px: number, py: number): number {
  const e = 0.01;
  if (Math.abs(py - b.y) < e) return px - b.x;
  if (Math.abs(px - (b.x + b.w)) < e) return b.w + (py - b.y);
  if (Math.abs(py - (b.y + b.h)) < e) return b.w + b.h + (b.x + b.w - px);
  return 2 * b.w + b.h + (b.y + b.h - py);
}

function edgeHit(b: Box, px: number, py: number, angle: number): [number, number] {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (b.x + b.w - px) / dx);
  else if (dx < 0) t = Math.min(t, (b.x - px) / dx);
  if (dy > 0) t = Math.min(t, (b.y + b.h - py) / dy);
  else if (dy < 0) t = Math.min(t, (b.y - py) / dy);
  return [px + dx * t, py + dy * t];
}

function shardsOf(b: Box, px: number, py: number, n: number): [number, number][][] {
  const P = 2 * (b.w + b.h);
  const corners: [[number, number], number][] = [
    [[b.x, b.y], 0],
    [[b.x + b.w, b.y], b.w],
    [[b.x + b.w, b.y + b.h], b.w + b.h],
    [[b.x, b.y + b.h], 2 * b.w + b.h],
  ];
  const rays = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * ((Math.PI * 2) / n) * 0.75;
    const p = edgeHit(b, px, py, a);
    return { p, s: perimeter(b, p[0], p[1]) };
  }).sort((u, v) => u.s - v.s);

  return rays.map((a, i) => {
    const c = rays[(i + 1) % rays.length];
    const end = c.s > a.s ? c.s : c.s + P;
    const between = corners
      .flatMap(([p, s]): [[number, number], number][] => [[p, s], [p, s + P]])
      .filter(([, s]) => s > a.s && s < end)
      .sort((u, v) => u[1] - v[1])
      .map(([p]) => p);
    return [[px, py] as [number, number], a.p, ...between, c.p];
  });
}

export type Impact = { replay: () => void; destroy: () => void };

export function mountImpact(svg: SVGSVGElement): Impact {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let pending: ReturnType<typeof setTimeout>[] = [];
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  function build() {
    cancelAnimationFrame(frame);
    pending.forEach(clearTimeout);
    pending = [];
    svg.replaceChildren();

    const L = innerWidth < 840 ? NARROW : WIDE;
    svg.setAttribute("viewBox", `0 0 ${L.vb[0]} ${L.vb[1]}`);

    const defs = el("defs");
    const back = el("g"), burst = el("g"), front = el("g");
    svg.append(defs, back, burst, front);

    /* ---- the forgeries ---- */
    const cards = L.cards.map((box, i) => {
      const fact = MISQUOTES[L.use[i]];
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const g = el("g", { id: `fake-${i}`, transform: `rotate(${box.rot} ${cx} ${cy})` });

      g.append(el("rect", {
        x: box.x, y: box.y, width: box.w, height: box.h,
        fill: "#ffffff", stroke: "#a4a99e", "stroke-width": 1,
      }));

      /* the furniture of a post, so it is read as one and not as an index card */
      g.append(el("circle", {
        cx: box.x + 26, cy: box.y + 25, r: 10.5,
        fill: "none", stroke: "var(--rule-strong)", "stroke-width": 1.25,
      }));
      g.append(el("rect", { x: box.x + 45, y: box.y + 20, width: 70, height: 4.5, fill: "#c9ccc3" }));
      g.append(el("rect", { x: box.x + 45, y: box.y + 29, width: 42, height: 4.5, fill: "#dcdfd7" }));

      g.append(lines(box.x + L.pad, box.y + 62, fact.lines, L.cardLead, {
        fill: "var(--ink)", "font-family": "var(--font-display)", "font-size": L.quote,
      }));

      const who = el("text", {
        x: box.x + L.pad, y: box.y + box.h - 17, fill: "var(--ink-faint)",
        "font-family": "var(--font-ui)", "font-size": L.who, "letter-spacing": "0.12em",
      });
      who.textContent = `— ${fact.who}`;
      g.append(who);

      defs.append(g.cloneNode(true));      // the template every shard is cut from
      back.append(g);
      return { g, box, cx, cy, i, fact, gone: false };
    });

    /* ---- the record that survives ----
     * It does not survive as a nicer post. It stops being a post: the paragraph, its
     * place, the root and the name — the things a reader can go and check. */
    const R = L.record;
    const P = L.pad + 8;
    const rec = el("g", { opacity: 0 });
    rec.append(el("rect", {
      x: R.x, y: R.y, width: R.w, height: R.h,
      fill: "#ffffff", stroke: "var(--seal)", "stroke-width": 1.5,
    }));
    rec.append(el("rect", { x: R.x, y: R.y, width: 5, height: R.h, fill: "var(--seal)" }));

    const label = el("text", {
      x: R.x + P, y: R.y + 36, fill: "var(--ink-faint)",
      "font-family": "var(--font-ui)", "font-size": 10, "letter-spacing": "0.14em",
    });
    label.textContent = "REGISTERED STATEMENT · SEPOLIA";
    rec.append(label);

    rec.append(lines(R.x + P, R.y + 78, L.recLines, R.lead, {
      fill: "var(--ink)", "font-family": "var(--font-display)", "font-size": R.size,
    }));

    const meta = el("text", {
      x: R.x + P, y: R.y + R.h - 52, fill: "var(--ink-soft)",
      "font-family": "var(--font-mono)", "font-size": 10.5,
    });
    meta.textContent = `${RECORD.root} · ${RECORD.name}`;
    rec.append(meta);

    /* The line the whole scene stands or falls on. Four forgeries broken and a fifth card
       stamped would otherwise read as "Citable proved Lincoln said it", which is exactly
       the claim this project refuses to make. */
    const caveat = el("text", {
      x: R.x + P, y: R.y + R.h - 24, fill: "var(--ink-faint)",
      "font-family": "var(--font-ui)", "font-size": 10,
    });
    caveat.textContent = "Proves the paragraph and its place — not that Lincoln said it.";
    rec.append(caveat);
    front.append(rec);

    const stampW = L.axis === "x" ? 112 : 100;
    const stampH = L.axis === "x" ? 60 : 54;
    const sx = R.x + R.w - stampW - 26;
    const sy = R.y + R.h - (L.axis === "x" ? 142 : 118);
    const stamp = el("g", { opacity: 0 });
    stamp.append(el("rect", {
      x: sx, y: sy, width: stampW, height: stampH,
      fill: "none", stroke: "var(--seal)", "stroke-width": 2.5,
    }));
    const proven = el("text", {
      x: sx + stampW / 2, y: sy + stampH * 0.47, fill: "var(--seal)", "text-anchor": "middle",
      "font-family": "var(--font-ui)", "font-size": L.axis === "x" ? 16 : 14,
      "font-weight": 600, "letter-spacing": "0.1em",
    });
    proven.textContent = "PROVEN";
    const where = el("text", {
      x: sx + stampW / 2, y: sy + stampH * 0.78, fill: "var(--seal)", "text-anchor": "middle",
      "font-family": "var(--font-mono)", "font-size": L.axis === "x" ? 10.5 : 9.5,
    });
    where.textContent = `paragraph ${RECORD.index} of ${RECORD.total}`;
    stamp.append(proven, where);
    stamp.style.transformOrigin = `${sx + stampW / 2}px ${sy + stampH / 2}px`;
    stamp.style.transform = "rotate(-7deg)";   // a stamp lands askew
    front.append(stamp);

    /* ---- the projectile ---- */
    const num = el("g", { opacity: 0 });
    const streaks = ([[-6, 210, 4, 0.22], [34, 150, 2.5, 0.16], [-52, 118, 2, 0.13],
                      [78, 96, 2, 0.11], [-96, 168, 3, 0.15]] as const)
      .map(([off, len, thick, op]) => {
        const r = el("rect", { width: len, height: thick, fill: "var(--alarm)", opacity: op });
        r.dataset.off = String(off);
        r.dataset.len = String(len);
        return r;
      });
    const head = el("text", {
      fill: "var(--alarm)", "font-family": "var(--font-display)", "font-size": L.num.size,
      "font-weight": 600, "text-anchor": "middle", "dominant-baseline": "central",
    });
    head.textContent = "6×";
    num.append(...streaks, head);
    front.append(num);

    const shock = el("line", { stroke: "var(--alarm)", "stroke-width": 2, opacity: 0 });
    front.append(shock);

    let cross = L.num.along;               // never write back to the layout constant
    const place = (p: number) => {
      const x = L.axis === "x" ? p : cross;
      const y = L.axis === "x" ? cross : p;
      head.setAttribute("x", String(x));
      head.setAttribute("y", String(y));
      streaks.forEach((r) => {
        const off = Number(r.dataset.off), len = Number(r.dataset.len);
        if (L.axis === "x") {
          r.setAttribute("x", String(x - L.num.lead * 1.3 - len));
          r.setAttribute("y", String(y + off));
        } else {
          r.setAttribute("width", "2.5");
          r.setAttribute("height", String(len));
          r.setAttribute("x", String(x + off * 0.55));
          r.setAttribute("y", String(y - L.num.lead * 1.3 - len));
        }
      });
      const at = p + L.num.lead;
      if (L.axis === "x") {
        shock.setAttribute("x1", String(at)); shock.setAttribute("x2", String(at));
        shock.setAttribute("y1", "0"); shock.setAttribute("y2", String(L.vb[1]));
      } else {
        shock.setAttribute("y1", String(at)); shock.setAttribute("y2", String(at));
        shock.setAttribute("x1", "0"); shock.setAttribute("x2", String(L.vb[0]));
      }
    };

    function shatter(card: (typeof cards)[number]) {
      card.gone = true;
      const b = card.box;
      const px = b.x + b.w * (0.25 + Math.random() * 0.5);
      const py = b.y + b.h * (0.3 + Math.random() * 0.4);

      shardsOf(b, px, py, 11).forEach((pts, k) => {
        const id = `shard-${card.i}-${k}`;
        const clip = el("clipPath", { id });
        clip.append(el("polygon", { points: pts.map((p) => p.join(",")).join(" ") }));
        defs.append(clip);

        const holder = el("g", { "clip-path": `url(#${id})` });
        holder.append(el("use", { href: `#fake-${card.i}` }));
        const piece = el("g");
        piece.append(holder);

        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
        const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        piece.style.transformOrigin = `${cx}px ${cy}px`;
        burst.append(piece);

        const a = Math.atan2(cy - py, cx - px);
        const d = 70 + Math.random() * 210;
        const dx = Math.cos(a) * d + (L.axis === "x" ? 110 : 0);
        const dy = Math.sin(a) * d + (L.axis === "y" ? 110 : 0);
        const rot = (Math.random() - 0.5) * 150;
        piece.animate(
          [
            { transform: "translate(0px,0px) rotate(0deg)", opacity: 1 },
            { transform: `translate(${dx * 0.4}px,${dy * 0.4 - 26}px) rotate(${rot * 0.35}deg)`,
              opacity: 1, offset: 0.28 },
            { transform: `translate(${dx}px,${dy + 640}px) rotate(${rot}deg)`, opacity: 0 },
          ],
          { duration: 1000 + Math.random() * 520, easing: "cubic-bezier(.22,.6,.45,1)", fill: "forwards" },
        );
      });

      card.g.remove();

      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2;
        const dot = el("circle", { cx: px, cy: py, r: 2 + Math.random() * 5.5, fill: "var(--alarm)" });
        burst.append(dot);
        dot.animate(
          [
            { transform: "translate(0,0)", opacity: 0.85 },
            { transform: `translate(${Math.cos(a) * (40 + Math.random() * 190)}px,` +
                         `${Math.sin(a) * (30 + Math.random() * 120) + 190}px)`, opacity: 0 },
          ],
          { duration: 780 + Math.random() * 420, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" },
        );
      }

      /* what the destruction is for: the reason, where the card stood */
      const note = el("text", {
        x: b.x, y: b.y + b.h / 2, fill: "var(--alarm)",
        "font-family": "var(--font-ui)", "font-size": 13, "font-weight": 500,
      });
      note.textContent = card.fact.debunk;
      burst.append(note);
      note.animate(
        [
          { opacity: 0, transform: "translate(0,10px)" },
          { opacity: 1, transform: "translate(0,0)", offset: 0.14 },
          { opacity: 1, transform: "translate(0,0)", offset: 0.72 },
          { opacity: 0, transform: "translate(0,-10px)" },
        ],
        { duration: 1700, easing: "ease-out", fill: "forwards" },
      );
    }

    if (still.matches) {
      // The end state is the correct state, so the still version is simply that state —
      // with the projectile parked clear of the record instead of on top of it.
      cards.forEach((c) => c.g.remove());
      rec.setAttribute("opacity", "1");
      stamp.setAttribute("opacity", "1");
      cross = L.axis === "x" ? L.still.y : L.still.x;
      place(L.axis === "x" ? L.still.x : L.still.y);
      num.setAttribute("opacity", "1");
      streaks.forEach((r) => r.setAttribute("opacity", "0"));
      shock.setAttribute("opacity", "0");
      return;
    }

    const T0 = 500, T1 = 3000;
    const started = performance.now();
    place(L.num.from);
    const axisOf = (c: (typeof cards)[number]) => (L.axis === "x" ? c.cx : c.cy);

    function finish() {
      num.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" });
      rec.animate(
        [{ opacity: 0, transform: "translate(0,18px)" }, { opacity: 1, transform: "translate(0,0)" }],
        { duration: 620, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" },
      );
      pending.push(setTimeout(() => {
        stamp.animate(
          [{ opacity: 0, transform: "rotate(-7deg) scale(2.1)" },
           { opacity: 1, transform: "rotate(-7deg) scale(1)" }],
          { duration: 230, easing: "cubic-bezier(.3,1.5,.5,1)", fill: "forwards" },
        );
      }, 470));
    }

    const step = (now: number) => {
      const t = now - started;
      if (t > T0) {
        num.setAttribute("opacity", "1");
        const k = Math.min(1, (t - T0) / (T1 - T0));
        const eased = 1 - Math.pow(1 - k, 1.5);        // fast in, losing energy
        const p = L.num.from + (L.num.to - L.num.from) * eased;
        place(p);
        shock.setAttribute("opacity", k < 0.96 ? String(0.5 - k * 0.4) : "0");
        cards.forEach((c) => { if (!c.gone && p + L.num.lead >= axisOf(c)) shatter(c); });
        if (k >= 1) { finish(); return; }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  build();
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 220);
  };
  addEventListener("resize", onResize);

  return {
    replay: build,
    destroy() {
      cancelAnimationFrame(frame);
      pending.forEach(clearTimeout);
      clearTimeout(resizeTimer);
      removeEventListener("resize", onResize);
    },
  };
}
