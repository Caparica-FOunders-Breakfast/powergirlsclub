import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { addDays, differenceInDays, format, startOfWeek, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { ActivityLogEntry } from "@/hooks/useActivityData";

const TIME_FILTERS = [
  { key: "all", label: "All" },
  { key: "90d", label: "90d" },
  { key: "30d", label: "30d" },
  { key: "7d", label: "7d" },
] as const;
type TimeFilter = (typeof TIME_FILTERS)[number]["key"];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Cell = {
  date: Date;
  count: number;
  key: string;
  isToday: boolean;
  isFuture: boolean;
  isOutsideRange?: boolean;
};

const cellClass = (cell: Cell) => {
  if (cell.isOutsideRange) return "bg-transparent";
  if (cell.isToday) return "bg-primary";
  if (cell.isFuture) return "bg-muted/30"; // very light: future, still within the year
  if (cell.count === 0) return "bg-muted";  // medium gray: past day with no workout
  return "bg-primary/40";                    // pink: workout
};

const formatHour = (h: number) => {
  const period = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${period}`;
};

// Full calendar year: first column is the week containing Jan 1, last column is the week
// containing Dec 31. Days outside the year (prior-year tail in week 0, next-year head in the
// final week) are marked isOutsideRange. Days within the year but after today are isFuture.
function buildHeatmapCalendarYear(dayCounts: Map<string, number>): Cell[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = format(today, "yyyy-MM-dd");
  const year = today.getFullYear();
  const yearStart = new Date(year, 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  const yearEnd = new Date(year, 11, 31);
  yearEnd.setHours(0, 0, 0, 0);
  const firstWeekMonday = startOfWeek(yearStart, { weekStartsOn: 1 });
  const lastWeekMonday = startOfWeek(yearEnd, { weekStartsOn: 1 });

  const weeks: Cell[][] = [];
  let cursor = firstWeekMonday;
  while (cursor <= lastWeekMonday) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = addDays(cursor, d);
      const key = format(dt, "yyyy-MM-dd");
      const outside = dt < yearStart || dt > yearEnd;
      week.push({
        date: dt,
        count: dayCounts.get(key) ?? 0,
        key,
        isToday: key === todayKey,
        isFuture: !outside && dt > today,
        isOutsideRange: outside,
      });
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function monthMarkers(weeks: Cell[][]) {
  const markers: { weekIdx: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, idx) => {
    // Anchor the label to the first in-range cell so a Dec-tailed Jan-first-week labels as "Jan".
    const firstInRange = week.find((c) => !c.isOutsideRange) ?? week[0];
    const month = firstInRange.date.getMonth();
    if (month !== lastMonth) {
      markers.push({ weekIdx: idx, label: MONTH_LABELS[month] });
      lastMonth = month;
    }
  });
  return markers;
}

export function ActivityOverview({ entries }: { entries: ActivityLogEntry[] }) {
  const [filter, setFilter] = useState<TimeFilter>("all");

  const dayCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.date, (m.get(e.date) ?? 0) + 1);
    return m;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (filter === "all") return entries;
    const days = filter === "90d" ? 90 : filter === "30d" ? 30 : 7;
    const cutoff = subDays(new Date(), days);
    cutoff.setHours(0, 0, 0, 0);
    return entries.filter((e) => new Date(e.date + "T00:00:00") >= cutoff);
  }, [entries, filter]);

  const stats = useMemo(() => {
    const daySet = new Set(filteredEntries.map((e) => e.date));
    const workouts = daySet.size;
    const exercisesLogged = filteredEntries.length;

    const hourBuckets = new Map<number, number>();
    for (const e of filteredEntries) hourBuckets.set(e.hour, (hourBuckets.get(e.hour) ?? 0) + 1);
    let peakHour: number | null = null;
    let peakCount = 0;
    for (const [h, c] of hourBuckets) {
      if (c > peakCount) {
        peakHour = h;
        peakCount = c;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let current = 0;
    for (let i = 0; i < 400; i++) {
      const key = format(subDays(today, i), "yyyy-MM-dd");
      if (daySet.has(key)) {
        current++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }

    const sortedDays = Array.from(daySet).sort();
    let longest = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const d of sortedDays) {
      const cur = new Date(d + "T00:00:00");
      if (prev && differenceInDays(cur, prev) === 1) run++;
      else run = 1;
      if (run > longest) longest = run;
      prev = cur;
    }

    const windowDays =
      filter === "all"
        ? sortedDays.length > 0
          ? Math.max(1, differenceInDays(today, new Date(sortedDays[0] + "T00:00:00")) + 1)
          : 1
        : filter === "90d"
          ? 90
          : filter === "30d"
            ? 30
            : 7;
    const daysActivePct = Math.round((workouts / windowDays) * 100);

    return { workouts, daysActivePct, current, longest, peakHour, exercisesLogged };
  }, [filteredEntries, filter]);

  const yearHeatmap = useMemo(() => buildHeatmapCalendarYear(dayCounts), [dayCounts]);
  const yearMarkers = useMemo(() => monthMarkers(yearHeatmap), [yearHeatmap]);

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl bg-card border-2 border-border p-4 lg:p-5"
    >
      {/* Header + time filter */}
      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-display text-xl text-foreground lg:text-2xl">Activity Overview</h3>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Your training rhythm at a glance
          </p>
        </div>
        <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1 lg:overflow-visible lg:p-1 lg:mx-0 lg:bg-muted lg:rounded-lg">
          {TIME_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full lg:rounded-md text-xs font-extrabold uppercase tracking-wider transition-all",
                filter === f.key
                  ? "bg-primary text-primary-foreground lg:bg-card lg:text-foreground lg:shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground lg:bg-transparent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat boxes — 2 cols on mobile (3 rows = 2x3), 6 cols on desktop */}
      <div className="grid grid-cols-2 gap-2 mb-5 lg:grid-cols-6 lg:gap-2">
        <StatBox label="Workouts" value={String(stats.workouts)} />
        <StatBox label="Days active" value={`${stats.daysActivePct}%`} />
        <StatBox label="Current streak" value={`${stats.current}d`} accent="text-accent" />
        <StatBox label="Longest streak" value={`${stats.longest}d`} accent="text-neon-teal" />
        <StatBox label="Peak hour" value={stats.peakHour == null ? "—" : formatHour(stats.peakHour)} />
        <StatBox label="Exercises logged" value={String(stats.exercisesLogged)} />
      </div>

      {/* Mobile / tablet: full year, horizontally scrollable (auto-scrolls to today on mount) */}
      <div className="lg:hidden">
        <HeatmapGrid
          weeks={yearHeatmap}
          markers={yearMarkers}
          cellGap={2}
          labelSize={10}
          cellSize={14}
          scrollable
        />
      </div>

      {/* Desktop: full year, fit-to-card with no scroll */}
      <div className="hidden lg:block">
        <HeatmapGrid weeks={yearHeatmap} markers={yearMarkers} cellGap={4} labelSize={13} />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-[10px] font-bold text-muted-foreground flex-wrap">
        <span className="inline-flex items-center gap-1">
          <span className="w-[10px] h-[10px] rounded-[2px] bg-muted/30 inline-block" /> Future
        </span>
        <span>·</span>
        <span>Less</span>
        <div className="flex" style={{ gap: "2px" }}>
          <div className="w-[10px] h-[10px] rounded-[2px] bg-muted" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/40" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-primary" />
        </div>
        <span>More</span>
        <span className="hidden lg:inline">·</span>
        <span className="hidden lg:inline-flex items-center gap-1">
          <span className="w-[10px] h-[10px] rounded-[2px] bg-primary inline-block" /> Today
        </span>
      </div>
    </motion.div>
  );
}

function HeatmapGrid({
  weeks,
  markers,
  cellGap,
  labelSize,
  cellSize,
  scrollable = false,
}: {
  weeks: Cell[][];
  markers: { weekIdx: number; label: string }[];
  cellGap: number;
  labelSize: number;
  cellSize?: number;
  scrollable?: boolean;
}) {
  const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];

  if (scrollable) {
    return (
      <HeatmapScrollable
        weeks={weeks}
        markers={markers}
        cellGap={cellGap}
        labelSize={labelSize}
        cellSize={cellSize ?? 12}
        dayLetters={dayLetters}
      />
    );
  }

  // Single CSS grid: column 1 = fixed-width day labels, columns 2..N+1 = week columns at 1fr each.
  // Cells use aspect-ratio:1 so they stay square at whatever width 1fr resolves to.
  return (
    <div
      className="grid w-full font-bold text-muted-foreground select-none"
      style={{
        gridTemplateColumns: `auto repeat(${weeks.length}, minmax(0, 1fr))`,
        gridTemplateRows: `auto repeat(7, auto)`,
        columnGap: `${cellGap}px`,
        rowGap: `${cellGap}px`,
        fontSize: `${labelSize}px`,
      }}
    >
      {/* Row 1: empty corner + month labels */}
      <div />
      {weeks.map((_, idx) => {
        const marker = markers.find((m) => m.weekIdx === idx);
        return (
          <div key={`m${idx}`} className="leading-none text-left">
            {marker?.label ?? ""}
          </div>
        );
      })}

      {/* Rows 2–8: day label + cells */}
      {dayLetters.map((letter, dayIdx) => (
        <Fragment key={dayIdx}>
          <div className="leading-none text-right pr-1 self-center">{letter}</div>
          {weeks.map((week) => {
            const cell = week[dayIdx];
            return (
              <div
                key={cell.key}
                title={`${format(cell.date, "MMM d, yyyy")} — ${cell.count} exercise${cell.count === 1 ? "" : "s"}${cell.isToday ? " (today)" : ""}`}
                className={cn("rounded-[2px]", cellClass(cell))}
                style={{ aspectRatio: "1 / 1" }}
              />
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

function HeatmapScrollable({
  weeks,
  markers,
  cellGap,
  labelSize,
  cellSize,
  dayLetters,
}: {
  weeks: Cell[][];
  markers: { weekIdx: number; label: string }[];
  cellGap: number;
  labelSize: number;
  cellSize: number;
  dayLetters: string[];
}) {
  const cellPx = `${cellSize}px`;
  const gapPx = `${cellGap}px`;
  const labelPx = `${labelSize}px`;
  // Day-label column top padding matches the month-label row height (leading-none) + 4px margin.
  const dayColumnPadTop = `${labelSize + 4}px`;
  // After mount, scroll to the rightmost column so today is visible without manual scrolling.
  // requestAnimationFrame defers the read until layout has settled — the browser will clamp
  // scrollLeft to the maximum reachable value automatically.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth;
    });
    return () => cancelAnimationFrame(id);
  }, [weeks, cellSize, cellGap]);

  return (
    <div className="relative flex gap-2">
      {/* Fixed left column: day labels (not scrollable) */}
      <div
        className="shrink-0 flex flex-col font-bold text-muted-foreground"
        style={{ gap: gapPx, fontSize: labelPx, paddingTop: dayColumnPadTop }}
      >
        {dayLetters.map((letter, i) => (
          <div
            key={i}
            className="leading-none w-5 text-right"
            style={{ height: cellPx, lineHeight: cellPx }}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Scrollable area: month labels + heatmap cells */}
      <div ref={scrollRef} className="overflow-x-auto flex-1 min-w-0">
        {/* Month labels */}
        <div
          className="flex mb-1 font-bold text-muted-foreground select-none leading-none"
          style={{ fontSize: labelPx }}
        >
          <div className="flex" style={{ gap: gapPx }}>
            {weeks.map((_, idx) => {
              const marker = markers.find((m) => m.weekIdx === idx);
              return (
                <div key={idx} style={{ width: cellPx }} className="text-left">
                  {marker?.label ?? ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* Heatmap cells */}
        <div className="flex" style={{ gap: gapPx }}>
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col" style={{ gap: gapPx }}>
              {week.map((cell) => (
                <div
                  key={cell.key}
                  title={`${format(cell.date, "MMM d, yyyy")} — ${cell.count} exercise${cell.count === 1 ? "" : "s"}${cell.isToday ? " (today)" : ""}`}
                  className={cn("rounded-[2px]", cellClass(cell))}
                  style={{ width: cellPx, height: cellPx }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-3 rounded-xl bg-background border border-border">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </p>
      <p
        className={cn(
          "font-display tabular-nums mt-1 text-foreground text-2xl lg:text-[26px] leading-none",
          accent
        )}
      >
        {value}
      </p>
    </div>
  );
}
