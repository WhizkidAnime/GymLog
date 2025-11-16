-- View для агрегированного прогресса по упражнениям
-- Возвращает по каждой тренировке и упражнению сет с максимальным весом

-- На всякий случай пересоздаём view идемпотентно
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
