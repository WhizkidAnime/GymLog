import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Workout, WorkoutTemplate, WorkoutExerciseWithSets } from '../types/database.types';
import { ExerciseCard } from '../components/ExerciseCard';
import { formatDateForDisplay } from '../utils/date-helpers';

const WorkoutPage = () => {
  const { date } = useParams<{ date: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExerciseWithSets[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchWorkoutData = useCallback(async () => {
    if (!user || !date) return;
    setLoading(true);

    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .eq('workout_date', date)
      .single();

    if (workoutError && workoutError.code !== 'PGRST116') {
      console.error('Error fetching workout:', workoutError);
    } else if (workoutData) {
      setWorkout(workoutData);
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('*, workout_sets (*)')
        .eq('workout_id', workoutData.id)
        .order('position');
        
      if (exercisesError) {
        console.error("Error fetching exercises:", exercisesError);
      } else {
        const exercisesWithSets = (exercisesData as unknown as WorkoutExerciseWithSets[]) || [];
        exercisesWithSets.forEach(exercise => {
          if (exercise.workout_sets) {
            exercise.workout_sets.sort((a, b) => a.set_index - b.set_index);
          }
        });
        setExercises(exercisesWithSets);
      }
    } else {
      setWorkout(null);
      setExercises([]); // Clear exercises if no workout is found
      const { data: templateData, error: templateError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', user.id);
      
      if (templateError) {
        console.error('Error fetching templates:', templateError.message);
      } else {
        setTemplates(templateData || []);
      }
    }
    
    setLoading(false);
  }, [date, user]);

  useEffect(() => {
    fetchWorkoutData();
  }, [fetchWorkoutData]);
  
  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUpdateExercise = (updatedExercise: WorkoutExerciseWithSets) => {
    setExercises(prevExercises =>
      prevExercises.map(ex => (ex.id === updatedExercise.id ? updatedExercise : ex))
    );
  };

  const handleCreateWorkout = async (template: WorkoutTemplate) => {
    if (!user || !date) return;
    setIsCreating(true);

    try {
      const { data: templateExercises } = await supabase
        .from('template_exercises')
        .select('*')
        .eq('template_id', template.id);

      const { data: newWorkout } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          workout_date: date,
          name: template.name,
          template_id: template.id,
        })
        .select()
        .single();
      
      if (!newWorkout) throw new Error("Failed to create workout entry.");

      const newWorkoutExercises = (templateExercises || []).map(ex => ({
        workout_id: newWorkout.id,
        name: ex.name, sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds, position: ex.position,
      }));

      const { data: insertedExercises } = await supabase
        .from('workout_exercises')
        .insert(newWorkoutExercises)
        .select();

      if (!insertedExercises) throw new Error("Failed to create workout exercises.");

      const newSets = insertedExercises.flatMap(ex => 
        Array.from({ length: ex.sets }, (_, i) => ({
          workout_exercise_id: ex.id, set_index: i + 1,
        }))
      );
      
      await supabase.from('workout_sets').insert(newSets);
      await fetchWorkoutData();

    } catch (error: any) {
      console.error('Failed to create workout from template:', error);
      alert(`Не удалось создать тренировку: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!workout) return;

    const isConfirmed = window.confirm('Вы уверены, что хотите удалить эту тренировку? Это действие необратимо.');
    if (isConfirmed) {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workout.id);
      
      if (error) {
        console.error('Error deleting workout:', error);
        alert('Не удалось удалить тренировку.');
      } else {
        alert('Тренировка удалена.');
        navigate('/calendar');
      }
    }
  };

  const handleDeleteClick = () => {
    setMenuOpen(false); // Close menu first
    handleDeleteWorkout(); // Then trigger action
  };
  
  const BackButton = () => (
    <button onClick={() => navigate(-1)} className="absolute -top-2 left-2 p-2 rounded-full hover:bg-gray-100 transition-colors z-10 bg-transparent">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    </button>
  );

  if (loading) {
    return <div className="p-4 text-center">Загрузка...</div>;
  }
  
  if (!workout) {
    return (
      <div className="relative p-4 max-w-lg mx-auto text-center">
        <BackButton />
        <h1 className="text-xl font-bold mt-12">Тренировка на {date ? formatDateForDisplay(date) : ''}</h1>
        <div className="mt-4 p-6 text-center border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">Тренировка не запланирована.</p>
          {templates.length > 0 ? (
            <>
              <h2 className="text-lg font-semibold mb-3">Выбрать шаблон</h2>
              <div className="space-y-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleCreateWorkout(t)}
                    disabled={isCreating}
                    className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isCreating ? 'Создание...' : t.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
             <div className="flex flex-col items-center space-y-3">
                <p className="text-gray-400">Сначала создайте шаблон.</p>
                <Link 
                    to="/templates/new"
                    className="flex items-center justify-center w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Создать шаблон
                </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-4 space-y-4">
      <BackButton />
      <div className="absolute top-4 right-4">
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-full hover:bg-gray-100 transition-colors z-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </button>
        {menuOpen && (
          <div ref={menuRef} className="absolute right-0 mt-2 w-48 card-dark rounded-md shadow-lg z-30 ring-1 ring-black ring-opacity-5">
            <button 
              onClick={handleDeleteClick}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Удалить тренировку
            </button>
          </div>
        )}
      </div>

      <div className="text-center pt-8 glass card-dark p-4">
        <h1 className="text-3xl font-bold capitalize">{workout.name}</h1>
        <p className="text-lg" style={{color:'#a1a1aa'}}>Дата: {date ? formatDateForDisplay(date) : ''}</p>
      </div>
      <div className="space-y-4">
        {exercises.map(exercise => (
          <ExerciseCard 
            key={exercise.id} 
            exercise={exercise}
            onUpdateExercise={handleUpdateExercise}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkoutPage;