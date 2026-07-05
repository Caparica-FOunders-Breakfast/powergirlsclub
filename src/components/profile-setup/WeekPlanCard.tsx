import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import type { WorkoutDay } from "@/data/workoutPlan";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Snappy but soft spring shared by the lift, layout swap, and list reorder.
const SPRING = { type: "spring", stiffness: 500, damping: 34, mass: 0.7 } as const;

/** Pull viewport coords out of whatever pointer/touch event framer-motion hands us. */
function clientPoint(e: MouseEvent | TouchEvent | PointerEvent): { x: number; y: number } | null {
  if ("clientX" in e) return { x: e.clientX, y: e.clientY };
  const t = e.changedTouches?.[0] ?? e.touches?.[0];
  return t ? { x: t.clientX, y: t.clientY } : null;
}

/** A tile carries a stable uid so framer-motion can animate it flying between
 *  columns on a swap; `day` is the workout content currently in that column. */
interface Tile {
  uid: number;
  day: WorkoutDay;
}

const swapAt = (tiles: Tile[], a: number, b: number): Tile[] => {
  const next = tiles.slice();
  [next[a], next[b]] = [next[b], next[a]];
  return next;
};

const planSig = (plan: WorkoutDay[]) =>
  plan.map((d) => `${d.label}|${d.emoji}|${d.isRest ? "r" : "t"}`).join(",");

/**
 * Read-only "Your week" plan display for the completed Profile — mirrors the
 * Klarita split preview from the setup wizard. It is driven by the *same*
 * `plan` array the weekly view uses (defaults + custom overrides, masked to
 * the user's chosen training days), so the two screens can never disagree.
 *
 * When `onSwap` is provided, a workout tile can be dragged onto another weekday
 * to swap them: the dragged tile settles into the target column and the day
 * that lived there slides over to the dragged tile's old column. Weekday labels
 * (M/T/W…) stay fixed in a header row; only the workout tiles move.
 */
export function WeekPlanCard({
  plan,
  onSwap,
}: {
  plan: WorkoutDay[];
  onSwap?: (from: number, to: number, next: WorkoutDay[]) => Promise<void>;
}) {
  const draggable = !!onSwap;
  const gridRef = useRef<HTMLDivElement>(null);
  const rectsRef = useRef<DOMRect[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  // Tiles are keyed by a stable uid and always rendered in weekday-column order
  // (index 0 = Monday …). A swap reorders the array carrying uids, so the moved
  // tiles animate via `layout`. Content is reconciled from the server plan by
  // column, keeping uids in place — so a confirmed swap never re-animates.
  const [tiles, setTiles] = useState<Tile[]>(() =>
    plan.slice(0, 7).map((day, i) => ({ uid: i, day })),
  );
  const sig = planSig(plan);
  useEffect(() => {
    setTiles((prev) =>
      plan.slice(0, 7).map((day, i) => ({ uid: prev[i]?.uid ?? i, day })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const week = tiles.length ? tiles : plan.slice(0, 7).map((day, i) => ({ uid: i, day }));
  const trainingCount = week.filter((t) => !t.day.isRest).length;

  // Which fixed weekday column is the pointer over? Uses rects captured at drag
  // start (columns don't move while a single tile is dragged).
  const columnAt = (p: { x: number; y: number } | null): number | null => {
    if (!p) return null;
    const rects = rectsRef.current;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) return i;
    }
    return null;
  };

  const handleDragStart = (from: number) => () => {
    const cells = gridRef.current ? Array.from(gridRef.current.children) : [];
    rectsRef.current = cells.map((c) => c.getBoundingClientRect());
    setDragging(from);
  };

  const handleDrag = (e: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
    setOver(columnAt(clientPoint(e)));
  };

  const handleDragEnd =
    (from: number) => async (e: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
      const to = columnAt(clientPoint(e));
      setDragging(null);
      setOver(null);
      if (!onSwap || to == null || to === from) return;
      const next = swapAt(week, from, to);
      setTiles(next);
      try {
        await onSwap(from, to, next.map((t) => t.day));
      } catch {
        // Persist failed — slide the tiles back to where they were.
        setTiles((prev) => swapAt(prev, from, to));
      }
    };

  return (
    <section className="rounded-2xl border-2 border-border bg-card p-5 lg:p-6">
      <div className="mb-5 flex items-center gap-3">
        <Calendar className="w-5 h-5 text-primary shrink-0" />
        <h3 className="font-display text-xl text-foreground lg:text-2xl">
          Your training week
        </h3>
      </div>

      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        Your {trainingCount}-day week
      </p>

      {/* Fixed weekday labels — these never move. */}
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {DAY_LETTERS.map((letter, i) => (
          <span
            key={i}
            className="text-center text-[10px] font-bold text-muted-foreground"
          >
            {letter}
          </span>
        ))}
      </div>

      {/* Workout tiles — reorder + animate on swap. */}
      <div ref={gridRef} className="mt-1.5 grid grid-cols-7 gap-1.5">
        {week.map((tile, col) => {
          const isTraining = !tile.day.isRest;
          const isOver = over === col && dragging !== col;
          const isDragged = dragging === col;
          const canDrag = draggable && isTraining;
          return (
            <motion.div
              key={tile.uid}
              layout
              drag={canDrag}
              dragSnapToOrigin
              dragConstraints={gridRef}
              dragElastic={0.2}
              onDragStart={handleDragStart(col)}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd(col)}
              whileHover={canDrag ? { y: -2 } : undefined}
              whileTap={canDrag ? { scale: 0.96 } : undefined}
              whileDrag={{ scale: 1.12, zIndex: 50, cursor: "grabbing" }}
              transition={SPRING}
              animate={{ scale: isOver ? 1.06 : 1 }}
              style={{ willChange: "transform" }}
              className={cn(
                "flex items-center justify-center rounded-xl border-2 py-3 transition-colors duration-150",
                isTraining
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background opacity-60",
                canDrag && "cursor-grab touch-none",
                isOver && "border-primary bg-primary/10 opacity-100 shadow-md shadow-primary/20",
                isDragged && "shadow-xl shadow-primary/25",
              )}
            >
              <span className="text-lg leading-none">
                {isTraining ? tile.day.emoji : "🧘"}
              </span>
            </motion.div>
          );
        })}
      </div>

      <ul className="mt-4 space-y-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {week.map((tile, col) =>
            tile.day.isRest ? null : (
              <motion.li
                key={tile.uid}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={SPRING}
                className="flex items-center gap-2 text-sm"
              >
                <span className="shrink-0">{tile.day.emoji}</span>
                <span className="font-bold text-foreground">{DAY_NAMES[col]}</span>
                <span className="truncate text-muted-foreground">· {tile.day.label}</span>
              </motion.li>
            ),
          )}
        </AnimatePresence>
      </ul>

      <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
        {draggable
          ? "Drag a workout onto another day to swap them. Bigger changes? Tap “Set up again”."
          : "You can move training days anytime — tap “Set up again” to change your plan."}
      </p>
    </section>
  );
}
