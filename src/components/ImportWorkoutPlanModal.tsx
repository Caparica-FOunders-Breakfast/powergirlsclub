import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { type Exercise, type WorkoutDay } from "@/data/workoutPlan";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const JSON_PLACEHOLDER = `[
  { "name": "Goblet Squat", "sets": 3, "reps": "10", "weight": "20", "unit": "kg", "progression": "+2.5 kg/week", "notes": "" },
  { "name": "Push Ups", "sets": 3, "reps": "10", "weight": "", "unit": "", "progression": "Add reps", "notes": "Bodyweight" }
]`;

// Loose shape the AI/JSON tab returns. We normalize into Exercise before saving.
interface RawExercise {
  name?: string;
  sets?: number | string;
  reps?: number | string;
  weight?: number | string;
  unit?: string;
  progression?: string;
  notes?: string;
}

interface DraftExercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  unit: string;
  progression: string;
  notes: string;
}

const toDraft = (raw: RawExercise): DraftExercise => ({
  name: String(raw?.name ?? "").trim(),
  sets: raw?.sets == null ? "" : String(raw.sets),
  reps: raw?.reps == null ? "" : String(raw.reps),
  weight: raw?.weight == null ? "" : String(raw.weight),
  unit: String(raw?.unit ?? "").trim(),
  progression: String(raw?.progression ?? "").trim(),
  notes: String(raw?.notes ?? "").trim(),
});

const draftToExercise = (d: DraftExercise): Exercise => {
  const setsNum = parseInt(d.sets, 10);
  const weightText = d.weight && d.unit
    ? `${d.weight} ${d.unit}`.trim()
    : d.weight || (d.notes.toLowerCase().includes("bodyweight") ? "Bodyweight" : "");
  return {
    name: d.name,
    sets: Number.isFinite(setsNum) && setsNum > 0 ? setsNum : 3,
    reps: d.reps || "10",
    suggestedWeight: weightText,
    progression: d.progression,
    ...(weightText.toLowerCase() === "bodyweight" ? { isBodyweight: true } : {}),
  };
};

// Read a File as base64 (data URL — the edge function strips the prefix).
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

interface ImportWorkoutPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDayIndices: number[];
  days: { idx: number; day: WorkoutDay }[];
  onImport: (dayIndex: number, exercises: Exercise[]) => Promise<void> | void;
}

const ImportWorkoutPlanModal = ({
  open,
  onOpenChange,
  selectedDayIndices,
  days,
  onImport,
}: ImportWorkoutPlanModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"photo" | "json">("photo");
  const [loading, setLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftExercise[] | null>(null);
  const [targetDay, setTargetDay] = useState<number | null>(
    selectedDayIndices[0] ?? null,
  );

  // Reset state every time the modal closes so a re-open starts clean.
  useEffect(() => {
    if (open) {
      setTargetDay(selectedDayIndices[0] ?? null);
      return;
    }
    setTab("photo");
    setLoading(false);
    setPhotoError(null);
    setJsonText("");
    setJsonError(null);
    setDraft(null);
  }, [open, selectedDayIndices]);

  const dayLabel = useMemo(() => {
    if (targetDay == null) return null;
    const found = days.find((d) => d.idx === targetDay);
    return found ? `${found.day.day} · ${found.day.label}` : DAY_NAMES[targetDay];
  }, [targetDay, days]);

  const callAnalyze = async (file: File) => {
    if (!user) {
      setPhotoError("You need to be signed in.");
      return;
    }
    setLoading(true);
    setPhotoError(null);
    try {
      const dataUrl = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("analyze-workout-image", {
        body: { image: dataUrl },
      });
      if (error) {
        // Edge function returned a non-2xx; the error body is on the FunctionsHttpError
        // `context` (a Response). Pull a friendly message out if possible.
        const ctx = (error as unknown as { context?: Response }).context;
        let message = error.message || "AI reading failed";
        try {
          const text = ctx ? await ctx.clone().text() : "";
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed?.error) message = parsed.error;
          }
        } catch {
          // Ignore parse failure — keep the generic message.
        }
        setPhotoError(message);
        // Graceful degradation: drop the user into the JSON tab with a hint.
        setTab("json");
        toast({
          title: "AI reading failed",
          description: "Please paste your plan as JSON instead.",
          variant: "destructive",
        });
        return;
      }
      const exercises: RawExercise[] = Array.isArray(data?.exercises) ? data.exercises : [];
      if (exercises.length === 0) {
        setPhotoError("No exercises detected — try a clearer photo.");
        return;
      }
      setDraft(exercises.map(toDraft));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Couldn't analyze the image");
    } finally {
      setLoading(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    await callAnalyze(file);
  };

  const parseJson = () => {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setJsonError("Expected a non-empty JSON array.");
        return;
      }
      setDraft((parsed as RawExercise[]).map(toDraft));
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const updateDraft = (idx: number, field: keyof DraftExercise, value: string) => {
    setDraft((prev) =>
      prev ? prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex)) : prev,
    );
  };

  const removeDraft = (idx: number) => {
    setDraft((prev) => (prev ? prev.filter((_, i) => i !== idx) : prev));
  };

  const confirm = async () => {
    if (!draft || draft.length === 0) return;
    if (targetDay == null) {
      toast({ title: "Pick a day to import into", variant: "destructive" });
      return;
    }
    const exercises = draft
      .filter((d) => d.name.trim())
      .map(draftToExercise);
    if (exercises.length === 0) {
      toast({ title: "Add at least one exercise with a name", variant: "destructive" });
      return;
    }
    try {
      await onImport(targetDay, exercises);
      toast({ description: `Imported ${exercises.length} exercise${exercises.length === 1 ? "" : "s"}` });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Couldn't save",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Import workout plan
          </DialogTitle>
        </DialogHeader>

        {!draft ? (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "photo" | "json")} className="mt-2">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="photo">Photo Import</TabsTrigger>
              <TabsTrigger value="json">Paste JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="photo" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Snap a photo of your plan and we'll extract the exercises for you.
              </p>

              {loading ? (
                <div className="flex flex-col items-center gap-2 py-10">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-bold text-foreground">Reading your workout plan...</p>
                  <p className="text-[11px] text-muted-foreground">This usually takes 5–15 seconds.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-20 flex-col gap-1 border-2 border-dashed"
                    >
                      <ImagePlus className="w-5 h-5 text-primary" />
                      <span className="text-xs font-bold">Upload image</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      className="h-20 flex-col gap-1 border-2 border-dashed"
                    >
                      <Camera className="w-5 h-5 text-primary" />
                      <span className="text-xs font-bold">Take photo</span>
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onPickFile}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onPickFile}
                    className="hidden"
                  />
                  {photoError && (
                    <p className="text-xs font-bold text-destructive">{photoError}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Up to 5 imports per day. JPEG, PNG, or WebP. Max ~5 MB.
                  </p>
                </>
              )}
            </TabsContent>

            <TabsContent value="json" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Paste a JSON array of exercises. Each item: <code>name</code>, <code>sets</code>,{" "}
                <code>reps</code>, <code>weight</code>, <code>unit</code>, <code>progression</code>,{" "}
                <code>notes</code>.
              </p>
              <Textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={JSON_PLACEHOLDER}
                rows={10}
                className="font-mono text-xs"
              />
              {jsonError && (
                <p className="text-xs font-bold text-destructive">{jsonError}</p>
              )}
              <Button
                type="button"
                onClick={parseJson}
                disabled={!jsonText.trim()}
                className="w-full h-10 font-bold"
              >
                Parse & Preview
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Import into
              </Label>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {days.length === 0 ? (
                  <p className="col-span-2 text-xs italic text-muted-foreground">
                    No training days selected yet — pick days in the form above first.
                  </p>
                ) : (
                  days.map(({ idx, day }) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTargetDay(idx)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg border-2 text-left text-xs transition-colors",
                        targetDay === idx
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      <span className="mr-1">{day.emoji}</span>
                      <span className="font-bold text-foreground">{day.day}</span>
                      <span className="block text-[10px] font-bold text-muted-foreground">
                        {day.label}
                      </span>
                    </button>
                  ))
                )}
              </div>
              {dayLabel && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  These exercises will replace what's currently on <strong>{dayLabel}</strong>.
                </p>
              )}
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {draft.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border-2 border-border bg-background space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={ex.name}
                      onChange={(e) => updateDraft(idx, "name", e.target.value)}
                      placeholder="Exercise name"
                      className="h-8 text-sm font-bold border-primary/20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDraft(idx)}
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Sets</label>
                      <Input
                        value={ex.sets}
                        onChange={(e) => updateDraft(idx, "sets", e.target.value)}
                        className="h-7 text-xs text-center border-primary/20"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Reps</label>
                      <Input
                        value={ex.reps}
                        onChange={(e) => updateDraft(idx, "reps", e.target.value)}
                        className="h-7 text-xs text-center border-primary/20"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Weight</label>
                      <Input
                        value={ex.weight}
                        onChange={(e) => updateDraft(idx, "weight", e.target.value)}
                        className="h-7 text-xs text-center border-primary/20"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Unit</label>
                      <Input
                        value={ex.unit}
                        onChange={(e) => updateDraft(idx, "unit", e.target.value)}
                        placeholder="kg"
                        className="h-7 text-xs text-center border-primary/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">
                      Progression
                    </label>
                    <Input
                      value={ex.progression}
                      onChange={(e) => updateDraft(idx, "progression", e.target.value)}
                      placeholder="+2.5 kg/week"
                      className="h-7 text-xs border-primary/20"
                    />
                  </div>
                  {ex.notes && (
                    <p className="text-[10px] italic text-muted-foreground">Notes: {ex.notes}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft(null);
                  setPhotoError(null);
                  setJsonError(null);
                }}
                className="h-10 text-sm font-bold"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={confirm}
                disabled={draft.length === 0 || targetDay == null}
                className="h-10 gradient-primary text-primary-foreground font-bold flex-1"
              >
                Confirm & Import {draft.length} exercise{draft.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportWorkoutPlanModal;
