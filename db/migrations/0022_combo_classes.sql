-- 0022_combo_classes.sql
-- Dedicated 'Combo' class type, combo_items bundling table, and cascaded RLS access

-- 1. Update allowed class_type check constraint to include 'Combo'
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_class_type_check;
ALTER TABLE public.classes ADD CONSTRAINT classes_class_type_check 
  CHECK (class_type = ANY (ARRAY['Theory'::text, 'Revision'::text, 'Paper Class'::text, 'Combo'::text, 'Extra Class'::text, 'Free Seminar'::text]));

-- 2. Create combo_items link table
CREATE TABLE IF NOT EXISTS public.combo_items (
    combo_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (combo_id, class_id)
);

ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "combo_items_select" ON public.combo_items;
CREATE POLICY "combo_items_select" ON public.combo_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "combo_items_all_admin" ON public.combo_items;
CREATE POLICY "combo_items_all_admin" ON public.combo_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Update public.has_class_access so combo enrollments automatically confer access to child classes
CREATE OR REPLACE FUNCTION public.has_class_access(p_class uuid, p_month text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = p_class AND c.is_free AND c.is_active)
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = auth.uid() AND e.class_id = p_class AND e.status = 'approved'
        AND (p_month IS NULL OR e.month = p_month)
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.combo_items ci ON ci.combo_id = e.class_id
      WHERE e.student_id = auth.uid() AND ci.class_id = p_class AND e.status = 'approved'
        AND (p_month IS NULL OR e.month = p_month)
    )
  );
$$;

-- 4. Update existing combo classes to class_type = 'Combo' and seed combo_items
UPDATE public.classes SET class_type = 'Combo', schedule_days = '{}', start_time = NULL WHERE id = 'cee372b5-e898-4703-8265-2fdd2bdfd1e8';
UPDATE public.classes SET class_type = 'Combo', schedule_days = '{}', start_time = NULL WHERE id = '5520ef8d-7019-445e-ab3a-5970f391bd30';
UPDATE public.classes SET class_type = 'Combo', schedule_days = '{}', start_time = NULL WHERE id = 'cf87be3c-4c21-4d11-87fe-96e39888d8b7';

-- 2028 Theory + Paper Class (cee372b5...) -> 2028 Theory (3dc18520...) + 2028 Paper (82566b86...)
INSERT INTO public.combo_items (combo_id, class_id)
VALUES 
  ('cee372b5-e898-4703-8265-2fdd2bdfd1e8', '3dc18520-ebb2-49f2-8efd-e74ff688e82b'),
  ('cee372b5-e898-4703-8265-2fdd2bdfd1e8', '82566b86-a2b3-4202-aa17-49a057a4e3ce')
ON CONFLICT DO NOTHING;

-- 2027 Revision + Paper Class (5520ef8d...) -> 2027 Revision (63c4d864...) + 2027 Paper (6e630bbd...)
INSERT INTO public.combo_items (combo_id, class_id)
VALUES 
  ('5520ef8d-7019-445e-ab3a-5970f391bd30', '63c4d864-e393-41e5-b1a8-21276d25a366'),
  ('5520ef8d-7019-445e-ab3a-5970f391bd30', '6e630bbd-080a-4c9b-8566-a1e5702e8685')
ON CONFLICT DO NOTHING;

-- 2027 Full Pack (cf87be3c...) -> 2027 Theory (874143e4...) + 2027 Revision (63c4d864...) + 2027 Paper (6e630bbd...)
INSERT INTO public.combo_items (combo_id, class_id)
VALUES 
  ('cf87be3c-4c21-4d11-87fe-96e39888d8b7', '874143e4-0e17-4462-a755-e051bf9db22e'),
  ('cf87be3c-4c21-4d11-87fe-96e39888d8b7', '63c4d864-e393-41e5-b1a8-21276d25a366'),
  ('cf87be3c-4c21-4d11-87fe-96e39888d8b7', '6e630bbd-080a-4c9b-8566-a1e5702e8685')
ON CONFLICT DO NOTHING;
