import { MISQUOTES } from "./misquotes";

/**
 * The hero scene: a wall of fabricated quotation cards, a measurement thrown through it,
 * and the one paragraph that can be checked left standing.
 *
 * Everything is a pure function of one number between 0 and 1. The caller decides what
 * feeds it — a clock here, and the scene runs again from the top whenever the hero comes
 * back into view, so a refutation that went past too quickly can be watched a second time.
 *
 * It is paced for reading, not for showing off: roughly eight hundred milliseconds between
 * one card breaking and the next, which is about as long as it takes to read the line the
 * break leaves behind.
 *
 * Drawn rather than fetched. The shards are cut out of the cards themselves — each piece is
 * a clipped clone of the card it came from, which is why the text stays readable as it
 * falls. A pile of generic triangles would animate the same and say nothing.
 *
 * The red is correction ink. It marks an error; it is not a wound, and the thing that
 * breaks is always the forgery, never the page it was printed on.
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
  /** How far the front travels while one card comes apart. */
  burst: number;
};

const RECORD = {
  root: "0x78e0a0fd…14c4e972",
  name: "frederik.eth",
  index: 4,
  total: 4,
};

const WIDE: Layout = {
  axis: "x",
  // Wide and shallow on purpose: the space left under the headline is a letterbox, and a
  // squarer drawing would be scaled down to fit its height and waste the width.
  vb: [1400, 460],
  quote: 18,
  who: 11.5,
  pad: 22,
  cardLead: 21,
  use: [0, 1, 2, 3, 4],
  cards: [
    { x: 20, y: 34, w: 330, h: 186, rot: -2.2 },
    { x: 280, y: 292, w: 292, h: 134, rot: 2.6 },
    { x: 500, y: 14, w: 330, h: 194, rot: -1.4 },
    { x: 770, y: 300, w: 272, h: 124, rot: 3.2 },
    { x: 990, y: 46, w: 330, h: 184, rot: -2.8 },
  ],
  record: { x: 420, y: 104, w: 540, h: 258, size: 22, lead: 31 },
  recLines: [
    "“…government of the people, by the",
    "people, for the people, shall not",
    "perish from the earth.”",
  ],
  num: { size: 230, from: -520, to: 1620, along: 232, lead: 96 },
  still: { x: 168, y: 248 },
  burst: 470,
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
  num: { size: 118, from: -190, to: 620, along: 214, lead: 48 },
  still: { x: 214, y: 56 },
  burst: 260,
};

/* The scroll is divided once, here, so the phases can be read in one place.
 *   rest    the wall stands, long enough to be looked at
 *   sweep   the figure crosses and the cards come apart in turn
 *   settle  the wreckage clears
 *   record  what can be checked rises, and is stamped */
const REST_END = 0.09;
const SWEEP_END = 0.8;
/* The reasons clear the field before the record enters it, rather than cross-fading
   through it — two things in the same place at half opacity is neither of them. */
const NOTES_OUT = [0.82, 0.86] as const;
const RECORD_START = 0.86;
const RECORD_END = 0.96;
const STAMP_START = 0.96;
const STAMP_END = 1;

/* Between SWEEP_END and RECORD_START all five refutations stand together, which is the
   one frame where the whole indictment is readable at once. It is held on purpose. */

/** How long the whole thing takes. Slow on purpose — every beat has a line to read. */
export const IMPACT_MS = 9000;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

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

type Piece = { g: SVGGElement; dx: number; dy: number; rot: number };
type Dot = { g: SVGCircleElement; dx: number; dy: number };
type Card = {
  intact: SVGGElement;
  wreck: SVGGElement;
  pieces: Piece[];
  dots: Dot[];
  note: SVGTextElement;
  at: number;
};

export type Impact = { render: (progress: number) => void; destroy: () => void };

export function mountImpact(svg: SVGSVGElement): Impact {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let draw: (p: number) => void = () => {};
  let last = 0;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  let width = innerWidth;

  function build() {
    svg.replaceChildren();

    const L = innerWidth < 840 ? NARROW : WIDE;
    svg.setAttribute("viewBox", `0 0 ${L.vb[0]} ${L.vb[1]}`);

    const defs = el("defs");
    const back = el("g"), burst = el("g"), front = el("g");
    svg.append(defs, back, burst, front);

    /* ---- the forgeries ---- */
    const cards: Card[] = L.cards.map((box, i) => {
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

      /* Every shard exists from the start and only ever moves, so the break can be run
         backwards as easily as forwards. */
      const px = box.x + box.w * (0.25 + Math.random() * 0.5);
      const py = box.y + box.h * (0.3 + Math.random() * 0.4);
      const wreck = el("g", { opacity: 0 });

      const pieces: Piece[] = shardsOf(box, px, py, 11).map((pts, k) => {
        const id = `shard-${i}-${k}`;
        const clip = el("clipPath", { id });
        clip.append(el("polygon", { points: pts.map((p) => p.join(",")).join(" ") }));
        defs.append(clip);

        const holder = el("g", { "clip-path": `url(#${id})` });
        holder.append(el("use", { href: `#fake-${i}` }));
        const piece = el("g");
        piece.append(holder);

        const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
        const my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        piece.style.transformOrigin = `${mx}px ${my}px`;
        wreck.append(piece);

        const a = Math.atan2(my - py, mx - px);
        const d = 70 + Math.random() * 210;
        return {
          g: piece,
          dx: Math.cos(a) * d + (L.axis === "x" ? 110 : 0),
          dy: Math.sin(a) * d + (L.axis === "y" ? 110 : 0),
          rot: (Math.random() - 0.5) * 150,
        };
      });

      const dots: Dot[] = Array.from({ length: 16 }, () => {
        const a = Math.random() * Math.PI * 2;
        const dot = el("circle", { cx: px, cy: py, r: 2 + Math.random() * 5.5, fill: "var(--alarm)" });
        wreck.append(dot);
        return {
          g: dot,
          dx: Math.cos(a) * (40 + Math.random() * 190),
          dy: Math.sin(a) * (30 + Math.random() * 120) + 190,
        };
      });
      burst.append(wreck);

      /* what the destruction is for: the reason, where the card stood */
      const note = el("text", {
        x: box.x, y: box.y + box.h / 2, opacity: 0, fill: "var(--alarm)",
        "font-family": "var(--font-ui)", "font-size": 16, "font-weight": 500,
      });
      note.textContent = fact.debunk;
      burst.append(note);

      return { intact: g, wreck, pieces, dots, note, at: L.axis === "x" ? cx : cy };
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
      "font-family": "var(--font-ui)", "font-size": 11, "letter-spacing": "0.14em",
    });
    label.textContent = "REGISTERED STATEMENT · SEPOLIA";
    rec.append(label);

    rec.append(lines(R.x + P, R.y + 78, L.recLines, R.lead, {
      fill: "var(--ink)", "font-family": "var(--font-display)", "font-size": R.size,
    }));

    const meta = el("text", {
      x: R.x + P, y: R.y + R.h - 52, fill: "var(--ink-soft)",
      "font-family": "var(--font-mono)", "font-size": 11.5,
    });
    meta.textContent = `${RECORD.root} · ${RECORD.name}`;
    rec.append(meta);

    /* The line the whole scene stands or falls on. Four forgeries broken and a fifth card
       stamped would otherwise read as "Citable proved Lincoln said it", which is exactly
       the claim this project refuses to make. */
    const caveat = el("text", {
      x: R.x + P, y: R.y + R.h - 24, fill: "var(--ink-faint)",
      "font-family": "var(--font-ui)", "font-size": 11.5,
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

    if (still.matches) {
      // The end state is the correct state, so the still version is simply that state —
      // with the projectile parked clear of the record instead of on top of it.
      cards.forEach((c) => { c.intact.remove(); c.wreck.remove(); c.note.remove(); });
      rec.setAttribute("opacity", "1");
      stamp.setAttribute("opacity", "1");
      stamp.style.transform = "rotate(-7deg)";
      cross = L.axis === "x" ? L.still.y : L.still.x;
      place(L.axis === "x" ? L.still.x : L.still.y);
      num.setAttribute("opacity", "1");
      streaks.forEach((r) => r.setAttribute("opacity", "0"));
      draw = () => {};
      return;
    }

    draw = (p: number) => {
      const t = span(p, REST_END, SWEEP_END);
      const flown = L.num.from + (L.num.to - L.num.from) * (1 - Math.pow(1 - t, 1.4));
      place(flown);

      const leaving = span(p, SWEEP_END - 0.06, SWEEP_END);
      num.setAttribute("opacity", t <= 0 ? "0" : String(1 - leaving));
      shock.setAttribute("opacity", t <= 0 || t >= 1 ? "0" : String((0.5 - t * 0.4) * (1 - leaving)));

      const clearing = span(p, NOTES_OUT[0], NOTES_OUT[1]);
      const rise = span(p, RECORD_START, RECORD_END);

      cards.forEach((card) => {
        const c = clamp01((flown + L.num.lead - card.at) / L.burst);
        card.intact.setAttribute("opacity", c > 0 ? "0" : "1");
        card.wreck.setAttribute("opacity", c > 0 ? "1" : "0");

        if (c > 0) {
          const out = 1 - Math.pow(1 - c, 2);          // thrown hard, then coasting
          const fall = c * c * 640;                     // and gravity all the way down
          const fade = 1 - span(c, 0.72, 1);
          card.pieces.forEach((s) => {
            s.g.style.transform =
              `translate(${s.dx * out}px, ${s.dy * out + fall}px) rotate(${s.rot * c}deg)`;
            s.g.style.opacity = String(fade);
          });
          card.dots.forEach((d) => {
            d.g.style.transform = `translate(${d.dx * out}px, ${d.dy * out}px)`;
            d.g.style.opacity = String(0.85 * (1 - span(c, 0.5, 1)));
          });
        }

        // The reason stays up until the field is cleared for the record.
        card.note.setAttribute("opacity", String(span(c, 0.04, 0.2) * (1 - clearing)));
      });

      rec.setAttribute("opacity", String(rise));
      rec.style.transform = `translate(0px, ${(1 - rise) * 18}px)`;

      const hit = span(p, STAMP_START, STAMP_END);
      stamp.setAttribute("opacity", String(hit));
      stamp.style.transform = `rotate(-7deg) scale(${2.1 - 1.1 * hit})`;
    };

    draw(last);
  }

  build();

  const onResize = () => {
    // Only a change of width can change the layout; mobile browsers fire resize on every
    // address-bar nudge, and rebuilding there would restart the scene mid-scroll.
    if (innerWidth === width) return;
    width = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 220);
  };
  addEventListener("resize", onResize);

  return {
    render(progress: number) {
      last = progress;
      draw(progress);
    },
    destroy() {
      clearTimeout(resizeTimer);
      removeEventListener("resize", onResize);
    },
  };
}
