import { cn } from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export const SPARKLINE_COLORS = [
  "hsl(330, 80%, 55%)",
  "hsl(280, 50%, 65%)",
  "hsl(45, 90%, 55%)",
  "hsl(260, 60%, 60%)",
  "hsl(168, 70%, 48%)",
];

export function PowerSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 28;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = h - padding - (val / max) * (h - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${w - padding},${h - padding} L${padding},${h - padding} Z`;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={w} height={h} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${color})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {data.length > 0 && (() => {
          let lastIdx = -1;
          for (let i = data.length - 1; i >= 0; i--) { if (data[i] > 0) { lastIdx = i; break; } }
          if (lastIdx < 0) return null;
          const cx = padding + (lastIdx / (data.length - 1)) * (w - padding * 2);
          const cy = h - padding - (data[lastIdx] / max) * (h - padding * 2);
          return <circle cx={cx} cy={cy} r={2.5} fill={color} />;
        })()}
      </svg>
      <div className="flex gap-[6px]">
        {DAY_LABELS.map((d, i) => (
          <span
            key={i}
            className={cn(
              "text-[8px] font-bold leading-none",
              data[i] > 0 ? "text-foreground/60" : "text-muted-foreground/40"
            )}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}
