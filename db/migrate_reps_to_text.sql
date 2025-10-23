-- 1) Снимаем CHECK-ограничения, которые сравнивают reps как число (например, reps > 0),
--    иначе ALTER TYPE может упасть с ошибкой "operator does not exist: text > integer".
do $$
declare r record;
begin
  for r in (
    select n.nspname as schema_name, t.relname as table_name, c.conname as constraint_name
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname in ('template_exercises','workout_exercises','workout_sets')
      and c.contype = 'c' -- CHECK
      and pg_get_constraintdef(c.oid) ilike '%reps%'
  ) loop
    execute format('alter table %I.%I drop constraint %I', r.schema_name, r.table_name, r.constraint_name);
  end loop;
end $$;

-- 2) Удаляем DEFAULT у reps (если был числовым), чтобы не мешал смене типа
alter table if exists public.template_exercises alter column reps drop default;
alter table if exists public.workout_exercises alter column reps drop default;
alter table if exists public.workout_sets alter column reps drop default;

-- 3) Меняем тип reps на TEXT
alter table if exists public.template_exercises alter column reps type text using reps::text;
alter table if exists public.workout_exercises alter column reps type text using reps::text;
alter table if exists public.workout_sets alter column reps type text using reps::text;

-- 4) (опционально) можно добавить более мягкое ограничение, если нужно,
--     например запрещать пустую строку: CHECK (trim(reps) <> '')
-- alter table public.template_exercises add constraint template_exercises_reps_not_empty check (trim(reps) <> '');
-- alter table public.workout_exercises add constraint workout_exercises_reps_not_empty check (trim(reps) <> '');
-- для workout_sets обычно null разрешен, поэтому constraint не добавляем.

-- Проверка (необязательно): покажет текущие типы колонок reps
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and column_name = 'reps';


