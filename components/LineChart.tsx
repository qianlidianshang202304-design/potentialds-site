'use client';

import { useMemo } from 'react';

type ChartPoint = {
  date: string;
  sent: number;
  opened: number;
  openRate: number;
};

type Props = {
  data: ChartPoint[];
  height?: number;
};

export default function LineChart({ data, height = 240 }: Props) {
  const padding = { top: 20, right: 48, bottom: 32, left: 40 };

  const { width, sentPath, ratePath, xLabels, sentYTicks, rateYTicks } = useMemo(() => {
    const w = 640;
    const h = height;
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    if (data.length === 0) {
      return { width: w, sentPath: '', ratePath: '', xLabels: [], sentYTicks: [], rateYTicks: [] };
    }

    const maxSent = Math.max(...data.map((d) => d.sent), 1);
    const maxRate = 100;
    const n = data.length;

    const xStep = n > 1 ? chartW / (n - 1) : 0;

    const points = data.map((d, i) => {
      const x = padding.left + i * xStep;
      const sentY = padding.top + chartH - (d.sent / maxSent) * chartH;
      const rateY = padding.top + chartH - (d.openRate / maxRate) * chartH;
      return { x, sentY, rateY, ...d };
    });

    const toPath = (key: 'sentY' | 'rateY') =>
      points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p[key].toFixed(1)}`).join(' ');

    // X axis labels (show at most 6)
    const labelStep = Math.max(1, Math.ceil(n / 6));
    const xLabels = points
      .filter((_, i) => i % labelStep === 0 || i === n - 1)
      .map((p) => ({ x: p.x, label: p.date.slice(5) }));

    // Y ticks for sent count (5 steps)
    const sentYTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
      y: padding.top + chartH - frac * chartH,
      label: Math.round(frac * maxSent),
    }));

    // Y ticks for open rate (0%, 25%, 50%, 75%, 100%)
    const rateYTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
      y: padding.top + chartH - frac * chartH,
      label: `${Math.round(frac * 100)}%`,
    }));

    return {
      width: w,
      sentPath: toPath('sentY'),
      ratePath: toPath('rateY'),
      xLabels,
      sentYTicks,
      rateYTicks,
    };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-sm text-zinc-400">选择日期范围后查看趋势</p>
      </div>
    );
  }

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 320 }}>
        {/* Grid lines */}
        {sentYTicks.map((t, i) => (
          <line key={i} x1={padding.left} x2={width - padding.right} y1={t.y} y2={t.y} stroke="#f0f0f0" strokeWidth={1} />
        ))}

        {/* Y axis left labels (sent count) */}
        {sentYTicks.map((t, i) => (
          <text key={i} x={padding.left - 6} y={t.y + 3} textAnchor="end" fontSize={10} fill="#9ca3af">
            {t.label}
          </text>
        ))}

        {/* Y axis right labels (open rate) */}
        {rateYTicks.map((t, i) => (
          <text key={i} x={width - padding.right + 6} y={t.y + 3} textAnchor="start" fontSize={10} fill="#9ca3af">
            {t.label}
          </text>
        ))}

        {/* X axis labels */}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={height - padding.bottom + 16} textAnchor="middle" fontSize={10} fill="#9ca3af">
            {l.label}
          </text>
        ))}

        {/* Sent count line */}
        <path d={sentPath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Sent count dots */}
        {data.map((d, i) => {
          const xStep = data.length > 1 ? chartW / (data.length - 1) : 0;
          const x = padding.left + i * xStep;
          const maxSent = Math.max(...data.map((d2) => d2.sent), 1);
          const y = padding.top + chartH - (d.sent / maxSent) * chartH;
          return <circle key={`s-${i}`} cx={x} cy={y} r={3} fill="#3b82f6" />;
        })}

        {/* Open rate line */}
        <path d={ratePath} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 2" />

        {/* Open rate dots */}
        {data.map((d, i) => {
          const xStep = data.length > 1 ? chartW / (data.length - 1) : 0;
          const x = padding.left + i * xStep;
          const y = padding.top + chartH - (d.openRate / 100) * chartH;
          return <circle key={`r-${i}`} cx={x} cy={y} r={3} fill="#10b981" />;
        })}

        {/* Legend */}
        <g transform={`translate(${padding.left}, 6)`}>
          <circle cx={4} cy={4} r={4} fill="#3b82f6" />
          <text x={12} y={8} fontSize={10} fill="#6b7280">发信量</text>
          <circle cx={56} cy={4} r={4} fill="#10b981" />
          <text x={64} y={8} fontSize={10} fill="#6b7280">打开率</text>
        </g>
      </svg>
    </div>
  );
}

export type { ChartPoint };
