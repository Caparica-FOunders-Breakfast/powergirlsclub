

## Add Progression & Exercise Type Editing to ExerciseEditor

### What's missing
The `ExerciseEditor` component doesn't expose the `progression` field or the type toggles (`isBodyweight`, `isTimeBased`, `isRoundsBased`, `isAssisted`). Users can't customize how an exercise progresses week-to-week.

### Changes — single file: `src/components/ExerciseEditor.tsx`

1. **Add a "Progression" input field** below the sets/reps/weight row — a text input where users type the progression rule (e.g. "+2 kg", "Add reps", "-2 kg assist").

2. **Add exercise type toggles** — small chip/toggle buttons for the boolean flags:
   - Bodyweight
   - Time-based
   - Rounds-based
   - Assisted (inverted progression like Pull Ups)

   These appear as a row of small toggleable badges below the progression input. Tapping toggles the flag on/off.

3. **Update `addExercise` default** — new exercises get an empty `progression` string so users are prompted to fill it in.

This reuses the existing save flow — the full `Exercise` object (including progression and flags) already gets passed to `onSave` and stored in `user_workout_plans.exercises` JSONB. No database changes needed.

### Technical details
- The toggles use the existing `cn()` utility for conditional styling (active = primary bg, inactive = muted border)
- All fields are already part of the `Exercise` interface, so no type changes needed
- Works for both personal plan editing and admin default plan editing since both use this component

