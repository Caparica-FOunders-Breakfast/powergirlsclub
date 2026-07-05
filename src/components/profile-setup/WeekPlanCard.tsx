import { useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { motion, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import type { WorkoutDay } from "@/data/workoutPlan";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** Pull viewport coords out of whatever pointer/touch event framer-motion hands us. */
function clientPoint(e: MouseEvent | TouchEvent | PointerEvent): { x: number; y: number } | null {
  if ("clientX" in e) return { x: e.clientX, y: e.clientY };
  const t = e.changedTouches?.[0] ?? e.touches?.[0];
  return t ? { x: t.clientX, y: t.clientY } : null;
}

/**
 * Read-only "Your week" plan display for the completed Profile — mirrors the
 * Klarita split preview from the setup wizard. It is driven by the *same*
 * `plan` array the weekly view uses (defaults + custom overrides, masked to
 * the user's chosen training days), so the two screens can never disagree.
 *
 * When `onSwap` is provided, a workout can be dragged onto another day to swap
 * the two days' contents (move a workout to a free day, or trade two workouts).
 */
export function WeekPlanCard({
  plan,
  onSwap,
}: {
  plan: WorkoutDay[];
  onSwap?: (from: number, to: number) => void;
}) {
  const week = plan.slice(0, 7);
  const training = week
    .map((day, idx) => ({ day, idx }))
    .filter(({ day }) => !day.isRest);

  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const draggable = !!onSwap;

  // Which fixed weekday cell is the pointer currently over?
  const targetAt = (e: MouseEvent | TouchEvent | PointerEvent): number | null => {
    const p = clientPoint(e);
    if (!p) return null;
    for (let i = 0; i < cellRefs.current.length; i++) {
      const el = cellRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) return i;
    }
    return null;
  };

  const handleDrag = (e: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
    setOver(targetAt(e));
  };

  const handleDragEnd =
    (from: number) => (e: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
      const to = targetAt(e);
      setDragging(null);
      setOver(null);
      if (onSwap && to != null && to !== from) onSwap(from, to);
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
        Your {training.length}-day week
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {week.map((day, idx) => {
          const isTraining = !day.isRest;
          const isOver = over === idx && dragging !== idx;
          const isDragged = dragging === idx;
          return (
            <div
              key={idx}
              ref={(el) => (cellRefs.current[idx] = el)}
              className="relative"
            >
              <motion.div
                drag={draggable && isTraining}
                dragSnapToOrigin
                dragElastic={0.15}
                onDragStart={() => setDragging(idx)}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd(idx)}
                whileDrag={{ scale: 1.08, zIndex: 50 }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 py-2 transition-colors",
                  isTraining
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-background opacity-60",
                  draggable && isTraining && "cursor-grab active:cursor-grabbing touch-none",
                  isOver && "border-primary ring-2 ring-primary/40 bg-primary/10 opacity-100",
                  isDragged && "relative shadow-lg",
                )}
              >
                <span className="text-[10px] font-bold text-muted-foreground">
                  {DAY_LETTERS[idx]}
                </span>
                <span className="text-lg leading-none">
                  {isTraining ? day.emoji : "🧘"}
                </span>
              </motion.div>
            </div>
          );
        })}
      </div>

      <ul className="mt-4 space-y-1.5">
        {training.map(({ day, idx }) => (
          <li key={idx} className="flex items-center gap-2 text-sm">
            <span className="shrink-0">{day.emoji}</span>
            <span className="font-bold text-foreground">{day.day}</span>
            <span className="truncate text-muted-foreground">· {day.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
        {draggable
          ? "Drag a workout onto another day to swap them. Bigger changes? Tap “Set up again”."
          : "You can move training days anytime — tap “Set up again” to change your plan."}
      </p>
    </section>
  );
}
