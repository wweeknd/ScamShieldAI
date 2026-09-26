import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Lightweight, dependency-free area chart (replaces recharts).
 * Renders a smooth cyan area with grid, axis labels and a hover tooltip.
 * Expects data: [{ label, date, count }].
 */
const H = 260;
const PAD = { top: 14, right: 12, bottom: 26, left: 34 };

export default function ActivityChart({ data = [] }) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState(null); // index

  // Measure width responsively.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect?.width;
      if (cw) setW(Math.max(240, Math.round(cw)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset hover if data changes underneath us.
  useEffect(() => setHover(null), [data]);

  const n = data.length;
  const innerW = Math.max(1, w - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;

  const counts = data.map((d) => d.count || 0);
  const maxCount = Math.max(1, ...counts);
  const step = Math.max(1, Math.ceil(maxCount / 4));
  const niceMax = step * 4;
  const ticks = [0, step, step * 2, step * 3, step * 4];

  const x = (i) => (n <= 1 ? PAD.left + innerW / 2 : PAD.left + (i / (n - 1)) * innerW);
  const y = (v) => PAD.top + innerH - (v / niceMax) * innerH;

  const pts = data.map((d, i) => [x(i), y(d.count || 0)]);

  // Smooth path via horizontal-tangent cubic beziers (monotone-ish look).
  const linePath = pts.length
    ? pts.reduce((acc, [px, py], i) => {
        if (i === 0) return `M ${px} ${py}`;
        const [x0, y0] = pts[i - 1];
        const cx = (x0 + px) / 2;
        return `${acc} C ${cx} ${y0} ${cx} ${py} ${px} ${py}`;
      }, "")
    : "";
  const areaPath = linePath
    ? `${linePath} L ${pts[pts.length - 1][0]} ${PAD.top + innerH} L ${pts[0][0]} ${PAD.top + innerH} Z`
    : "";

  const onMove = (e) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    // nearest index
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x(i) - mx);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setHover(best);
  };

  const active = hover != null && hover < n ? hover : null;
  const tipLeft = active != null ? Math.min(Math.max(x(active), 54), w - 54) : 0;

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: H }}>
      <svg
        width={w}
        height={H}
        role="img"
        aria-label="Events analyzed per day over the last 7 days"
        className="block"
      >
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal grid + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={w - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />
            <text
              x={PAD.left - 8}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#64748b"
              fontSize="11"
            >
              {t}
            </text>
          </g>
        ))}

        {/* area + line */}
        {areaPath && <path d={areaPath} fill="url(#activityFill)" />}
        {linePath && (
          <path d={linePath} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
        )}

        {/* x labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fill="#64748b"
            fontSize="11"
          >
            {d.label}
          </text>
        ))}

        {/* dots */}
        {pts.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={active === i ? 5 : 3} fill="#22d3ee" />
        ))}

        {/* hover guide */}
        {active != null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={PAD.top}
            y2={PAD.top + innerH}
            stroke="rgba(255,255,255,0.12)"
          />
        )}

        {/* interaction layer */}
        <rect
          x={0}
          y={0}
          width={w}
          height={H}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      {active != null && (
        <div
          className="glass px-3 py-2 text-xs pointer-events-none absolute -translate-x-1/2"
          style={{ left: tipLeft, top: 4 }}
        >
          <div className="text-slate-400">{data[active].label}</div>
          <div className="text-white font-semibold">
            {data[active].count} {data[active].count === 1 ? "event" : "events"}
          </div>
        </div>
      )}
    </div>
  );
}
