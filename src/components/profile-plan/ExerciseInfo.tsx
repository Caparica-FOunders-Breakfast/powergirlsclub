import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { exerciseBenefit } from "@/lib/exerciseBenefits";

const INK = "#2B1736";

/**
 * Small "i" next to an exercise name that explains why the exercise is good
 * for you. Opens on hover with a mouse and on tap on a phone (hover doesn't
 * exist there). Renders nothing when we have no note for the exercise.
 */
export function ExerciseInfo({ name, color = "#77677E" }: { name: string; color?: string }) {
  const [open, setOpen] = useState(false);
  const benefit = exerciseBenefit(name);
  if (!benefit) return null;

  const hoverOpen = (e: React.PointerEvent) => { if (e.pointerType === "mouse") setOpen(true); };
  const hoverClose = (e: React.PointerEvent) => { if (e.pointerType === "mouse") setOpen(false); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Why ${name} is good for you`}
          onPointerEnter={hoverOpen}
          onPointerLeave={hoverClose}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, margin: "-6px 0 -6px 2px", padding: 0, border: 0, background: "transparent", color, cursor: "pointer", verticalAlign: "middle" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true" style={{ display: "inline-block" }}>
            <circle cx="12" cy="12" r="10" /><path d="M12 11v6M12 7.5v.01" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        onPointerEnter={hoverOpen}
        onPointerLeave={hoverClose}
        onOpenAutoFocus={(e) => e.preventDefault()}
        style={{ width: 280, padding: "12px 14px", borderRadius: 14, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, background: "#FFFFFF", color: INK, fontFamily: "Nunito, system-ui, sans-serif" }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#C21C70" }}>WHY {name.toUpperCase()}</p>
        <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, lineHeight: 1.45 }}>{benefit}</p>
      </PopoverContent>
    </Popover>
  );
}
