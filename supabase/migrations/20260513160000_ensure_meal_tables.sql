-- Idempotent re-creation of the three meal tables. The original migration
-- (20260404170841_*) was apparently never applied to the live database, so
-- PostgREST returns PGRST205 for public.meal_preferences. Re-creating with
-- IF NOT EXISTS lets `supabase db push` heal the schema without conflict.

CREATE TABLE IF NOT EXISTS public.meal_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  daily_protein_target integer NOT NULL DEFAULT 120,
  dietary_preference text NOT NULL DEFAULT 'omnivore',
  allergies text[] NOT NULL DEFAULT '{}',
  disliked_foods text[] NOT NULL DEFAULT '{}',
  favorite_foods text[] NOT NULL DEFAULT '{}',
  cooking_time text NOT NULL DEFAULT 'quick',
  budget text NOT NULL DEFAULT 'medium',
  num_people integer NOT NULL DEFAULT 1,
  ingredients_at_home text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.meal_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meal preferences" ON public.meal_preferences;
CREATE POLICY "Users can view own meal preferences"
  ON public.meal_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meal preferences" ON public.meal_preferences;
CREATE POLICY "Users can insert own meal preferences"
  ON public.meal_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meal preferences" ON public.meal_preferences;
CREATE POLICY "Users can update own meal preferences"
  ON public.meal_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.saved_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meal_type text NOT NULL,
  title text NOT NULL,
  ingredients jsonb NOT NULL DEFAULT '[]',
  steps jsonb NOT NULL DEFAULT '[]',
  protein integer NOT NULL DEFAULT 0,
  prep_time integer NOT NULL DEFAULT 10,
  is_favorite boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  variation_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved meals" ON public.saved_meals;
CREATE POLICY "Users can view own saved meals"
  ON public.saved_meals FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved meals" ON public.saved_meals;
CREATE POLICY "Users can insert own saved meals"
  ON public.saved_meals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved meals" ON public.saved_meals;
CREATE POLICY "Users can update own saved meals"
  ON public.saved_meals FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved meals" ON public.saved_meals;
CREATE POLICY "Users can delete own saved meals"
  ON public.saved_meals FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.generated_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meals jsonb NOT NULL DEFAULT '{}',
  grocery_list jsonb NOT NULL DEFAULT '{}',
  daily_protein_estimate integer NOT NULL DEFAULT 0,
  daily_protein_target integer NOT NULL DEFAULT 120,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.generated_meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meal plans" ON public.generated_meal_plans;
CREATE POLICY "Users can view own meal plans"
  ON public.generated_meal_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meal plans" ON public.generated_meal_plans;
CREATE POLICY "Users can insert own meal plans"
  ON public.generated_meal_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meal plans" ON public.generated_meal_plans;
CREATE POLICY "Users can update own meal plans"
  ON public.generated_meal_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meal plans" ON public.generated_meal_plans;
CREATE POLICY "Users can delete own meal plans"
  ON public.generated_meal_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);
