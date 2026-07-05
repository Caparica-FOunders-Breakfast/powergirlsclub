import { useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import type { WorkoutDay } from "@/data/workoutPlan";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** Pull viewport coords out of whatever pointer/touch event framer-motion hands us. */
function clientPoint(e: MouseEvent | TouchEvent | PointerEvent): { x: number; y: number } | null {
  if ("clientX" in e) return { x: e.clientX, y: e.clientY };
  const t = e.changedTouches?.[0] ?? e.touches?.[0];
  return t ? { x: t.clientX, y: t.clientY } : null;
}

// Snappy but soft spring shared by the lift, snap-back, and emoji pop.
const SPRING = { type: "spring", stiffness: 550, damping: 32, mass: 0.7 } as const;

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
  // Cell rects captured at drag start so hit-testing each frame doesn't force a
  // layout reflow (the static cells don't move while one pill is dragged).
  const rectsRef = useRef<Array<DOMRect | null>>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const draggable = !!onSwap;

  const targetAt = (p: { x: number; y: number } | null): number | null => {
    if (!p) return null;
    const rects = rectsRef.current;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) return i;
    }
    return null;
  };

  const handleDragStart = (from: number) => () => {
    rectsRef.current = cellRefs.current.map((el) => el?.getBoundingClientRect() ?? null);
    setDragging(from);
  };

  const handleDrag = (e: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
    setOver(targetAt(clientPoint(e)));
  };

  const handleDragEnd =
    (from: number) => (e: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
      const to = targetAt(clientPoint(e));
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
          const canDrag = draggable && isTraining;
          return (
            <div
              key={idx}
              ref={(el) => (cellRefs.current[idx] = el)}
              className={cn("relative", isDragged && "z-50")}
            >
              <motion.div
                drag={canDrag}
                dragSnapToOrigin
                dragMomentum={false}
                dragTransition={{ bounceStiffness: 600, bounceDamping: 40 }}
                onDragStart={handleDragStart(idx)}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd(idx)}
                whileHover={canDrag ? { y: -2 } : undefined}
                whileTap={canDrag ? { scale: 0.96 } : undefined}
                whileDrag={{ scale: 1.12, zIndex: 50, cursor: "grabbing" }}
                transition={SPRING}
                animate={{ scale: isOver ? 1.06 : 1 }}
                style={{ willChange: "transform" }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 py-2 transition-colors duration-150",
                  isTraining
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-background opacity-60",
                  canDrag && "cursor-grab touch-none",
                  isOver && "border-primary bg-primary/10 opacity-100 shadow-md shadow-primary/20",
                  isDragged && "shadow-xl shadow-primary/25",
                )}
              >
                <span className="text-[10px] font-bold text-muted-foreground">
                  {DAY_LETTERS[idx]}
                </span>
                <div className="relative flex h-6 w-full items-center justify-center">
                  <motion.span
                    key={isTraining ? `w:${day.label}:${day.emoji}` : "rest"}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING}
                    className="absolute text-lg leading-none"
                  >
                    {isTraining ? day.emoji : "🧘"}
                  </motion.span>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      <ul className="mt-4 space-y-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {training.map(({ day, idx }) => (
            <motion.li
              key={idx}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={SPRING}
              className="flex items-center gap-2 text-sm"
            >
              <span className="shrink-0">{day.emoji}</span>
              <span className="font-bold text-foreground">{day.day}</span>
              <span className="truncate text-muted-foreground">· {day.label}</span>
            </motion.li>
          ))}
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
