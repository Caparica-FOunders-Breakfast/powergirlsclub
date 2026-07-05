import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSavePersonalDay } from "@/hooks/usePersonalWorkoutPlan";
import { SETUP_DEFAULT_DAYS } from "@/hooks/useProfileSetup";
import { weeklyPlan, type Exercise } from "@/data/workoutPlan";

type Goal = "strength" | "tone" | "endurance";
type Equipment = "gym" | "dumbbells" | "bodyweight";
type Experience = "new" | "some" | "experienced";

const GOALS: { value: Goal; label: string }[] = [
  { value: "strength", label: "Get stronger 💪" },
  { value: "tone", label: "Tone up ✨" },
  { value: "endurance", label: "Endurance 🏃‍♀️" },
];
const EQUIPMENT: { value: Equipment; label: string }[] = [
  { value: "gym", label: "Full gym 🏋️‍♀️" },
  { value: "dumbbells", label: "Dumbbells & bands 🎒" },
  { value: "bodyweight", label: "Bodyweight only 🤸‍♀️" },
];
const EXPERIENCE: { value: Experience; label: string }[] = [
  { value: "new", label: "New to lifting 🌱" },
  { value: "some", label: "Some experience ⚡" },
  { value: "experienced", label: "Experienced 🔥" },
];

// Minimal generation: seed from the proven split for the chosen days, then
// tune reps to the goal and set count to experience. Equipment is captured so
// the plan can be refined later; exercises stay editable per day afterwards.
const REPS_BY_GOAL: Record<Goal, string> = {
  strength: "5–8",
  tone: "10–12",
  endurance: "15–20",
};
const SETS_BY_EXPERIENCE: Record<Experience, number> = {
  new: 2,
  some: 3,
  experienced: 4,
};

function Options<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={selected}
            className={cn(
              "rounded-full border-2 px-3.5 py-2 text-sm font-bold transition-all",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/30",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  days: number;
  /** Weekly progression the generated plan will use (source of truth). */
  kgPerWeek: number;
  /** Called after the plan is generated + saved (e.g. navigate to the week). */
  onGenerated: () => void;
}

export function PlanGeneratorModal({ open, onOpenChange, days, kgPerWeek, onGenerated }: Props) {
  const { toast } = useToast();
  const savePersonalDay = useSavePersonalDay();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [generating, setGenerating] = useState(false);

  const ready = goal !== null && equipment !== null && experience !== null;

  const generate = async () => {
    if (!ready) return;
    setGenerating(true);
    try {
      const sets = SETS_BY_EXPERIENCE[experience];
      const reps = REPS_BY_GOAL[goal];
      const indices = SETUP_DEFAULT_DAYS[days] ?? SETUP_DEFAULT_DAYS[5];
      const progression = `+${kgPerWeek} kg/week`;

      for (const idx of indices) {
        const template = weeklyPlan[idx];
        if (!template) continue;
        const exercises: Exercise[] = template.exercises.map((ex) => ({
          ...ex,
          sets,
          // Time/rounds-based moves keep their own rep scheme.
          reps: ex.isTimeBased || ex.isRoundsBased ? ex.reps : reps,
          progression,
        }));
        await savePersonalDay.mutateAsync({
          dayIndex: idx,
          exercises,
          label: template.label,
          emoji: template.emoji,
          isRest: false,
          isRecovery: template.isRecovery,
          restNote: template.restNote,
        });
      }

      toast({ title: "Plan generated 🎉", description: "Tweak any day whenever you like." });
      onOpenChange(false);
      onGenerated();
    } catch (e) {
      toast({
        title: "Couldn't generate the plan",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            Generate your plan ✨
          </DialogTitle>
        </DialogHeader>
        <div className="mt-1 space-y-5">
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              What's your main goal?
            </p>
            <Options options={GOALS} value={goal} onChange={setGoal} />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              What can you train with?
            </p>
            <Options options={EQUIPMENT} value={equipment} onChange={setEquipment} />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              How much lifting experience?
            </p>
            <Options options={EXPERIENCE} value={experience} onChange={setExperience} />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground">
            {days} days/week · +{kgPerWeek} kg/week progression. You can edit any day after.
          </p>
          <Button
            disabled={!ready || generating}
            onClick={generate}
            className="h-12 w-full gap-2 gradient-primary font-bold text-primary-foreground"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "Building your plan…" : "Generate my plan 🔥"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
