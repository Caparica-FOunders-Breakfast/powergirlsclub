

## Plan: Auto-update Scorecard on exercise log changes

**Problem**: When a user completes exercises in the weekly plan, the Exercise Scorecard doesn't refresh automatically because the `exercise-scorecard` query is never invalidated after saving an exercise log.

**Fix**: Add `exercise-scorecard` to the list of invalidated queries in the `useSaveExerciseLog` mutation's `onSuccess` callback.

### Changes

**File: `src/hooks/useExerciseLogs.ts`**
- In `useSaveExerciseLog`, add `queryClient.invalidateQueries({ queryKey: ["exercise-scorecard"] })` to the `onSuccess` handler (line ~69, alongside the existing invalidations).

This is a one-line fix. After this, any time a user logs weight or toggles completion in the weekly plan, the scorecard data will automatically re-fetch.

