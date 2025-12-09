-- Миграция: добавление поддержки дропсетов
-- Дата создания: 2024

-- 1. Добавляем колонку is_dropset в таблицу workout_sets
-- Значение по умолчанию false, чтобы существующие данные остались обычными подходами
alter table public.workout_sets
add column if not exists is_dropset boolean not null default false;

-- 2. Добавляем колонку parent_set_index для связи дропсета с родительским подходом
-- Для обычных подходов это null, для дропсетов — set_index родительского подхода
alter table public.workout_sets
add column if not exists parent_set_index integer default null;

-- 3. Пересоздаём view exercise_progress_view с исключением дропсетов из статистики
-- Дропсеты не должны влиять на "последний рабочий вес" и прогресс
drop view if exists public.exercise_progress_view;

create view public.exercise_progress_view as
with completed_sets as (
  select
    w.id            as workout_id,
    w.workout_date  as workout_date,
    w.name          as workout_name,
    we.id           as exercise_id,
    ws.weight       as weight,
    ws.reps         as reps,
    row_number() over (
      partition by w.id, we.id
      order by ws.weight desc, ws.id asc
    ) as rn
  from public.workouts w
  join public.workout_exercises we
    on we.workout_id = w.id
  join public.workout_sets ws
    on ws.workout_exercise_id = we.id
  where
    -- фильтрация «завершённых»/валидных сетов
    ws.weight is not null
    and ws.weight > 0
    and (
      ws.is_done
      or (
        ws.reps is not null
        and btrim(ws.reps) <> ''
      )
    )
    -- ВАЖНО: исключаем дропсеты из расчета прогресса
    and (ws.is_dropset is null or ws.is_dropset = false)
)
select
  workout_date,
  workout_name,
  workout_id,
  exercise_id,
  weight as max_weight,
  reps   as reps_at_max_weight
from completed_sets
where rn = 1;

-- Добавляем комментарии к колонкам для документации
comment on column public.workout_sets.is_dropset is 'Флаг дропсета. true = подход является частью дропсета (не влияет на статистику прогресса)';
comment on column public.workout_sets.parent_set_index is 'Индекс родительского подхода для дропсетов. null для обычных подходов, set_index родителя для дропсетов';
