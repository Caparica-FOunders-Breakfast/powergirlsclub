

## Move Default Exercises to Database + Admin Editing

### What changes

Currently the default workout plan is hardcoded in `src/data/workoutPlan.ts`. We'll move it to a database table so you can edit both your personal plan and the global defaults from the UI.

### Database

**New table: `default_workout_plans`**
- `id` (uuid, PK)
- `day_index` (integer, 0-6, unique)
- `label` (text) — e.g. "Lower Body"
- `emoji` (text) — e.g. "🦵"
- `is_rest` (boolean)
- `is_recovery` (boolean)
- `rest_note` (text, nullable)
- `exercises` (jsonb) — array of exercise objects
- `created_at`, `updated_at` (timestamps)

RLS: SELECT for all authenticated users, INSERT/UPDATE/DELETE restricted to admin role via `has_role()`.

**Seed data**: Insert the current hardcoded plan from `workoutPlan.ts` as initial rows.

### Code changes

1. **New hook `useDefaultWorkoutPlan`** — fetches from `default_workout_plans`, falls back to the hardcoded plan if emptyirtually ensures backward compatibility).

2. **Update `usePersonalWorkoutPlan`** — merge user overrides on top of database defaults instead of hardcoded defaults.

3. **Admin UI on the "More" page or Profile** — if user has admin role, show an "Edit Default Plan" section that:
   - Lists all 7 days with their exercises
   - Reuses the existing `ExerciseEditor` component for editing exercises per day
   - Saves changes to `default_workout_plans` table

4. **Personal plan editing** — already works via `ExerciseEditor` in `CurrentWeek.tsx`. No changes needed beyond switching the fallback source.

5. **Keep `workoutPlan.ts`** as a hardcoded fallback only (in case the DB table is empty).

### Technical details

- The `exercises` JSONB column stores the same shape as the `Exercise` interface: `{ name, sets, reps, suggestedWeight, progression, isBodyweight?, isTimeBased?, isRoundsBased? }`.
- Unique constraint on `day_index` so there's exactly one row per day of the week.
- The existing `ExerciseEditor` component already handles add/remove/edit of exercises — it will be reused for the admin default editing flow.

