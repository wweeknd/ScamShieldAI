import { useEffect, useRef, useState } from "react";
import { Focus, Minus, Plus } from "lucide-react";
import { scoreColor } from "../lib/format";

const W = 960;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Interactive force-directed graph rendered as SVG.
 * Self-contained mini physics sim (charge + spring + gravity) — no external deps.
 * Props: data {nodes, links}, selectedId, onSelect(node|null), height
 */
export default function NetworkGraph({ data, selectedId, onSelect, height = 540 }) {
  const H = height;
  const svgRef = useRef(null);
  const simRef = useRef({ nodes: [], links: [] });
  const rafRef = useRef(0);
  const dragRef = useRef(null);
  const [, setFrame] = useState(0);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hoverId, setHoverId] = useState(null);

  const rerender = () => setFrame((n) => (n + 1) % 1e9);

  useEffect(() => {
    const src = data?.nodes || [];
    const n = src.length || 1;
    const nodes = src.map((node, i) => {
      const a = (i / n) * Math.PI * 2;
      const rad = node.kind === "campaign" ? 30 : 170;
      return {
        ...node,
        x: W / 2 + Math.cos(a) * rad + (Math.random() - 0.5) * 50,
        y: H / 2 + Math.sin(a) * rad + (Math.random() - 0.5) * 50,
        vx: 0, vy: 0, fx: null, fy: null,
      };
    });
    const byId = Object.fromEntries(nodes.map((nd) => [nd.id, nd]));
    const links = (data?.links || [])
      .map((l) => ({ ...l, s: byId[l.source], t: byId[l.target] }))
      .filter((l) => l.s && l.t);
    simRef.current = { nodes, links };
    startSim();
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function startSim() {
    cancelAnimationFrame(rafRef.current);
    let alpha = 1;
    const cx = W / 2;
    const cy = H / 2;
    const tick = () => {
      const { nodes, links } = simRef.current;
      alpha += -alpha * 0.02;
      // charge repulsion (O(n^2), fine for small graphs)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy || 0.01;
          const dist = Math.sqrt(d2);
          const f = (5400 / d2) * alpha;
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }
      // spring links
      for (const l of links) {
        const L = l.kind === "in-campaign" ? 118 : 90;
        const dx = l.t.x - l.s.x;
        const dy = l.t.y - l.s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const diff = ((dist - L) / dist) * alpha * 0.45;
        const fx = dx * diff;
        const fy = dy * diff;
        l.s.vx += fx; l.s.vy += fy;
        l.t.vx -= fx; l.t.vy -= fy;
      }
      // gravity + integrate
      for (const nd of nodes) {
        if (nd.fx != null) {
          nd.x = nd.fx; nd.y = nd.fy; nd.vx = 0; nd.vy = 0;
          continue;
        }
        nd.vx += (cx - nd.x) * 0.016 * alpha;
        nd.vy += (cy - nd.y) * 0.016 * alpha;
        nd.vx *= 0.6; nd.vy *= 0.6;
        nd.x += nd.vx; nd.y += nd.vy;
      }
      rerender();
      if (alpha > 0.02) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  /* ----- coordinate helpers ----- */
  const toVB = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const toSim = (clientX, clientY) => {
    const vb = toVB(clientX, clientY);
    return { x: (vb.x - transform.x) / transform.k, y: (vb.y - transform.y) / transform.k };
  };

  /* ----- pointer handlers ----- */
  const onNodeDown = (e, node) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toSim(e.clientX, e.clientY);
    dragRef.current = { type: "node", node, dx: node.x - p.x, dy: node.y - p.y, moved: false };
  };
  const onBgDown = (e) => {
    const vb = toVB(e.clientX, e.clientY);
    dragRef.current = { type: "pan", startVB: vb, startT: { ...transform }, moved: false };
  };
  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.type === "node") {
      const p = toSim(e.clientX, e.clientY);
      d.node.fx = p.x + d.dx; d.node.fy = p.y + d.dy;
      d.moved = true;
      startSim();
    } else {
      const vb = toVB(e.clientX, e.clientY);
      setTransform({ ...d.startT, x: d.startT.x + (vb.x - d.startVB.x), y: d.startT.y + (vb.y - d.startVB.y) });
      d.moved = true;
    }
  };
  const onUp = () => {
    const d = dragRef.current;
    if (d?.type === "node") {
      d.node.fx = null; d.node.fy = null;
      if (!d.moved) onSelect?.(d.node);
    } else if (d?.type === "pan" && !d.moved) {
      onSelect?.(null);
    }
    dragRef.current = null;
  };
  const onWheel = (e) => {
    e.preventDefault();
    const vb = toVB(e.clientX, e.clientY);
    setTransform((t) => {
      const k = clamp(t.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.4, 2.6);
      const simx = (vb.x - t.x) / t.k;
      const simy = (vb.y - t.y) / t.k;
      return { k, x: vb.x - simx * k, y: vb.y - simy * k };
    });
  };
  const zoomBy = (factor) =>
    setTransform((t) => {
      const k = clamp(t.k * factor, 0.4, 2.6);
      const cx = W / 2;
      const cy = H / 2;
      const simx = (cx - t.x) / t.k;
      const simy = (cy - t.y) / t.k;
      return { k, x: cx - simx * k, y: cy - simy * k };
    });

  /* ----- highlight logic ----- */
  const active = hoverId || selectedId;
  const neighbors = new Set();
  if (active) {
    neighbors.add(active);
    for (const l of data?.links || []) {
      if (l.source === active) neighbors.add(l.target);
      if (l.target === active) neighbors.add(l.source);
    }
  }
  const dim = (id) => active && !neighbors.has(id);

  const { nodes, links } = simRef.current;
  const showLabel = (nd) =>
    nd.kind !== "indicator" || neighbors.has(nd.id) || nodes.length < 22;

  if (!data?.nodes?.length) {
    return (
      <div className="grid place-items-center text-slate-500 text-sm" style={{ height: H }}>
        No network data yet.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <button className="glass h-8 w-8 grid place-items-center hover:text-accent" onClick={() => zoomBy(1.2)} aria-label="Zoom in">
          <Plus className="h-4 w-4" />
        </button>
        <button className="glass h-8 w-8 grid place-items-center hover:text-accent" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">
          <Minus className="h-4 w-4" />
        </button>
        <button className="glass h-8 w-8 grid place-items-center hover:text-accent" onClick={() => setTransform({ x: 0, y: 0, k: 1 })} aria-label="Reset view">
          <Focus className="h-4 w-4" />
        </button>
      </div>

      {/* legend */}
      <div className="absolute left-3 top-3 z-10 glass px-3 py-2 text-[11px] text-slate-300 space-y-1">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-accent" /> Campaign</div>
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-danger" /> Event (by risk)</div>
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-500" /> Shared indicator</div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Interactive scam network graph linking events to shared indicators and campaigns"
        className="w-full touch-none select-none rounded-2xl"
        style={{ height: H, cursor: dragRef.current?.type === "pan" ? "grabbing" : "default" }}
        onPointerDown={onBgDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onWheel={onWheel}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* links */}
          {links.map((l, i) => {
            const on = active && (l.source === active || l.target === active);
            const stroke = l.kind === "in-campaign" ? "#8b5cf6" : "#38507a";
            return (
              <line
                key={i}
                x1={l.s.x} y1={l.s.y} x2={l.t.x} y2={l.t.y}
                stroke={on ? "#22d3ee" : stroke}
                strokeWidth={on ? 2.4 : 1.2}
                strokeOpacity={active ? (on ? 0.9 : 0.12) : l.kind === "in-campaign" ? 0.55 : 0.32}
                strokeDasharray={l.kind === "in-campaign" ? "0" : "4 4"}
              />
            );
          })}

          {/* nodes */}
          {nodes.map((nd) => {
            const isCampaign = nd.kind === "campaign";
            const isEvent = nd.kind === "event";
            const r = isCampaign ? 22 : isEvent ? 15 : 9;
            const fill = isCampaign ? "#8b5cf6" : isEvent ? scoreColor(nd.risk_score || 0) : "#334155";
            const stroke = isCampaign ? "#c4b5fd" : isEvent ? "rgba(255,255,255,0.85)" : "#64748b";
            const selected = nd.id === selectedId;
            return (
              <g
                key={nd.id}
                transform={`translate(${nd.x},${nd.y})`}
                style={{ cursor: "grab", opacity: dim(nd.id) ? 0.28 : 1, transition: "opacity 0.2s" }}
                onPointerDown={(e) => onNodeDown(e, nd)}
                onPointerEnter={() => setHoverId(nd.id)}
                onPointerLeave={() => setHoverId(null)}
              >
                {isCampaign && (
                  <circle r={r + 8} fill="none" stroke="#8b5cf6" strokeOpacity="0.4" className="animate-pulse-ring" />
                )}
                {selected && (
                  <circle r={r + 6} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeOpacity="0.9" />
                )}
                <circle
                  r={r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isEvent ? 2 : 1.5}
                  style={{ filter: isCampaign || isEvent ? `drop-shadow(0 0 6px ${fill}88)` : "none" }}
                />
                {showLabel(nd) && (
                  <text
                    y={r + 13}
                    textAnchor="middle"
                    fontSize={isCampaign ? 12 : 10.5}
                    fontWeight={isCampaign ? 700 : 500}
                    fill={isCampaign ? "#c4b5fd" : "#cbd5e1"}
                    style={{ paintOrder: "stroke", stroke: "#05070f", strokeWidth: 3, strokeLinejoin: "round" }}
                  >
                    {nd.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
