-- Index numbers are optional on public results. Keep existing numbers and retain the length limit.
-- 0026 uses CREATE TABLE IF NOT EXISTS, so re-running all migrations leaves this constraint in place.
alter table public.student_results drop constraint if exists student_results_exam_number_check;
alter table public.student_results alter column exam_number set default '';
alter table public.student_results add constraint student_results_exam_number_check check (char_length(exam_number) <= 40);
