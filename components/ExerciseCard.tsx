import React from 'react';
import type { WorkoutExerciseWithSets } from '../types/database.types';
import { supabase } from '../lib/supabase';
import { SetRow } from './SetRow';
import { RestTimer } from './RestTimer';

interface ExerciseCardProps {
  exercise: WorkoutExerciseWithSets;
  onUpdateExercise: (updatedExercise: WorkoutExerciseWithSets) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onUpdateExercise }) => {
  const allSetsDone = exercise.workout_sets.every(set => set.is_done);

  const handleCompleteExercise = async () => {
    if (!exercise.workout_sets || exercise.workout_sets.length === 0) return;

    const setIds = exercise.workout_sets.map(set => set.id);
    
    const { error } = await supabase
      .from('workout_sets')
      .update({ is_done: true, updated_at: new Date().toISOString() })
      .in('id', setIds);
    
    if (error) {
      console.error("Error completing all sets:", error);
      alert("Не удалось завершить упражнение. Попробуйте снова.");
    } else {
      // Create a deep copy to avoid mutating the prop directly
      const updatedExercise = JSON.parse(JSON.stringify(exercise));
      updatedExercise.workout_sets.forEach((set: any) => {
        set.is_done = true;
      });
      onUpdateExercise(updatedExercise);
    }
  };

  return (
    <div className="glass card-dark p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-xl font-bold">{exercise.name}</h2>
          <p className="text-sm" style={{color:'#a1a1aa'}}>
            {exercise.sets} x {exercise.reps} reps
          </p>
        </div>
        <RestTimer restSeconds={exercise.rest_seconds} />
      </div>
      
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold px-2" style={{color:'#a1a1aa'}}>
          <div className="col-span-1">Подход</div>
          <div className="col-span-2">Вес (кг)</div>
          <div className="col-span-1">Повторы</div>
          <div className="col-span-1">Готово</div>
        </div>
        {exercise.workout_sets.map((set) => (
          <SetRow key={set.id} set={set} />
        ))}
      </div>
      <div className="mt-4">
        <button
          onClick={handleCompleteExercise}
          disabled={allSetsDone}
          className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:bg-green-600 transition-colors"
        >
          {allSetsDone ? 'Упражнение завершено' : 'Завершить упражнение'}
        </button>
      </div>
    </div>
  );
};