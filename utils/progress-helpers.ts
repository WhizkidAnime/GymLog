import type { WorkoutSet } from '../types/database.types';

export type ProgressDataPoint = {
  date: string; // YYYY-MM-DD
  displayDate: string; // для отображения
  weight: number;
  reps: string;
  workoutName: string;
  workoutId: string;
  exerciseId: string;
};

export type ExerciseProgress = {
  exerciseName: string;
  dataPoints: ProgressDataPoint[];
  totalSessions: number;
  maxWeight: number;
  minWeight: number;
};

/**
 * Группирует сеты по дате тренировки и берет максимальный вес за каждую дату
 */
export function processProgressData(
  exerciseName: string,
  rawData: Array<{
    workout_date: string;
    workout_name: string;
    workout_id: string;
    exercise_id: string;
    sets: WorkoutSet[];
  }>
): ExerciseProgress {
  // Группируем по дате
  const dateMap = new Map<string, ProgressDataPoint>();

  rawData.forEach(({ workout_date, workout_name, workout_id, exercise_id, sets }) => {
    const completedSets = sets.filter((s) => {
      const hasWeight = s.weight !== null && s.weight > 0;
      const hasReps = s.reps !== null && String(s.reps).trim() !== '';
      return (s.is_done || (hasWeight && hasReps)) && hasWeight;
    });

    if (completedSets.length === 0) return;

    // Находим максимальный вес в этой тренировке
    const maxSet = completedSets.reduce((max, current) =>
      (current.weight || 0) > (max.weight || 0) ? current : max
    );

    const existing = dateMap.get(workout_date);
    
    // Если уже есть данные за эту дату, берем максимум
    if (!existing || (maxSet.weight || 0) > existing.weight) {
      dateMap.set(workout_date, {
        date: workout_date,
        displayDate: formatDateForChart(workout_date),
        weight: maxSet.weight || 0,
        reps: maxSet.reps || '',
        workoutName: workout_name,
        workoutId: workout_id,
        exerciseId: exercise_id,
      });
    }
  });

  const dataPoints = Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const weights = dataPoints.map((d) => d.weight);

  return {
    exerciseName,
    dataPoints,
    totalSessions: dataPoints.length,
    maxWeight: Math.max(...weights, 0),
    minWeight: Math.min(...weights, Infinity),
  };
}

function formatDateForChart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${day}.${month}`;
}
