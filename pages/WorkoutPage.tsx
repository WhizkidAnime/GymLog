import React, { useState } from 'react';
import { useI18n } from '../hooks/use-i18n';
import { ExerciseCard } from '../components/ExerciseCard';
import { WorkoutHeader } from '../components/workout-header';
import { WorkoutTemplateSelectModal } from '../components/workout-template-select-modal';
import { WorkoutLoadingOverlay } from '../components/workout-loading-overlay';
import { WorkoutEmptyState } from '../components/workout-empty-state';
import { WorkoutCardioToggle } from '../components/workout-cardio-toggle';
import { WorkoutNotesSection } from '../components/workout-notes-section';
import { WorkoutActionsPopover } from '../components/workout-actions-popover';
import { useWorkoutScrollAndFocus } from '../hooks/use-workout-scroll-and-focus';
import { useModalScrollLock } from '../hooks/use-modal-scroll-lock';
import { useWorkoutActionsMenu } from '../hooks/use-workout-actions-menu';
import { useWorkoutData } from '../hooks/use-workout-data';
import { useWorkoutOperations } from '../hooks/use-workout-operations';
import { useWorkoutNameEditor } from '../hooks/use-workout-name-editor';
import { useWorkoutCardio } from '../hooks/use-workout-cardio';
import { useWorkoutNotes } from '../hooks/use-workout-notes';
import { useWorkoutTime } from '../hooks/use-workout-time';
import { WorkoutTimeSection } from '../components/workout-time-section';
import { formatDateForDisplay } from '../utils/date-helpers';
import ConfirmDialog from '../components/confirm-dialog';
import ReorderExercisesModal from '../components/ReorderExercisesModal';
import WorkoutIconPickerModal from '../components/workout-icon-picker-modal';

const WorkoutPage = () => {
  const { t } = useI18n();
  // Данные и состояние страницы
  const workoutData = useWorkoutData();
  const {
    user,
    normalizedDate,
    location,
    workout,
    exercises,
    templates,
    isCreating,
    isSelectTemplateOpen,
    hasInitialData,
    isAddingExercise,
    workoutName,
    isSavingWorkoutName,
    isCardio,
    isSavingCardio,
    workoutIcon,
    workoutNotes,
    isSavingNotes,
    setPageState,
    setWorkout,
    setExercises,
    setIsCreating,
    setIsSelectTemplateOpen,
    setIsAddingExercise,
    setWorkoutName,
    setIsSavingWorkoutName,
    setIsCardio,
    setIsSavingCardio,
    setWorkoutNotes,
    setIsSavingNotes,
    fetchWorkoutData,
  } = workoutData;

  // Меню действий
  const {
    isActionsOpen,
    menuPos,
    actionsRef,
    actionsBtnRef,
    toggleActions,
    closeActions,
  } = useWorkoutActionsMenu();

  // Операции с тренировкой
  const {
    handleUpdateExercise,
    handleDeleteExercise,
    handleAddExercise,
    handleCreateCustomWorkout,
    handleCreateWorkout,
    handleReplaceWithTemplate,
    handleDeleteWorkout,
    handleSaveNewOrder,
  } = useWorkoutOperations({
    user,
    normalizedDate,
    workout,
    exercises,
    setPageState,
    setWorkout,
    setExercises,
    setIsCreating,
    setIsAddingExercise,
    setWorkoutName,
    setIsSelectTemplateOpen,
    fetchWorkoutData,
    isAddingExercise,
  });

  // Редактирование имени и иконки
  const {
    inputRef,
    isEditingName,
    editNameValue,
    editIconValue,
    isIconPickerOpen,
    setIsIconPickerOpen,
    setEditNameValue,
    handleStartEditName,
    handleSaveEditName,
    handleCancelEditName,
    handleOpenIconPicker,
    handleIconChange,
  } = useWorkoutNameEditor({
    user,
    normalizedDate,
    workout,
    exercises,
    workoutName,
    workoutIcon,
    setWorkout,
    setWorkoutName,
    setIsSavingWorkoutName,
  });

  // Кардио
  const { handleToggleCardio } = useWorkoutCardio({
    user,
    normalizedDate,
    workout,
    exercises,
    isCardio,
    setIsCardio,
    setIsSavingCardio,
    setWorkout,
  });

  // Заметки
  useWorkoutNotes({
    user,
    normalizedDate,
    workout,
    workoutNotes,
    setIsSavingNotes,
  });

  // Время тренировки
  const {
    startTime,
    endTime,
    handleStartWorkout,
    handleEndWorkout,
    handleUpdateStartTime,
    handleUpdateEndTime,
    handleClearWorkoutTime,
  } = useWorkoutTime({
    user,
    workout,
    setWorkout,
  });

  // Локальные состояния для модальных окон
  const [isDeleteWorkoutOpen, setIsDeleteWorkoutOpen] = useState(false);
  const [isReorderOpen, setIsReorderOpen] = useState(false);

  // Скролл и фокус
  const scrollKey = `scroll:workout:${normalizedDate ?? ''}`;
  const { isScrolling } = useWorkoutScrollAndFocus({
    normalizedDate,
    exercisesLength: exercises.length,
    scrollKey,
    location,
  });

  useModalScrollLock(isSelectTemplateOpen);

  // Рендеринг
  if (!hasInitialData) {
    return <WorkoutLoadingOverlay message={t.workout.loading} />;
  }
  
  if (!normalizedDate) {
    return null;
  }

  if (!workout) {
    return (
      <WorkoutEmptyState
        normalizedDate={normalizedDate}
        templates={templates}
        isCreating={isCreating}
        onCreateWorkout={handleCreateWorkout}
        onCreateCustomWorkout={handleCreateCustomWorkout}
      />
    );
  }

  return (
    <div className="relative px-4 space-y-4 pt-4 pb-10">
      {/* CSS стили вынесены в styles/header-scroll.css */}
      <div className={`status-bar-blur ${isScrolling ? 'visible' : ''}`} />
      
      <WorkoutHeader
        normalizedDate={normalizedDate}
        workoutName={workoutName}
        isEditingName={isEditingName}
        editNameValue={editNameValue}
        isSavingWorkoutName={isSavingWorkoutName}
        isScrolling={isScrolling}
        inputRef={inputRef}
        onStartEditName={handleStartEditName}
        onChangeEditName={setEditNameValue}
        onSaveEditName={handleSaveEditName}
        onCancelEditName={handleCancelEditName}
        actionsRef={actionsRef}
        actionsBtnRef={actionsBtnRef}
        onToggleActions={toggleActions}
        workoutIcon={workoutIcon}
        editIconValue={editIconValue}
        onOpenIconPicker={handleOpenIconPicker}
      />

      {!startTime && (
        <button
          type="button"
          onClick={handleStartWorkout}
          className="btn-glass btn-glass-full btn-glass-md btn-glass-primary"
        >
          {t.workoutTime.startWorkout}
        </button>
      )}

      <div className="space-y-4">
        {exercises.map(exercise => (
          <ExerciseCard 
            key={exercise.id} 
            exercise={exercise}
            workoutDate={normalizedDate}
            onUpdateExercise={handleUpdateExercise}
            onDeleteExercise={handleDeleteExercise}
          />
        ))}
      </div>

      {startTime && !endTime && (
        <button
          type="button"
          onClick={handleEndWorkout}
          className="btn-glass btn-glass-full btn-glass-md bg-red-600 hover:bg-red-700 text-white font-semibold"
        >
          {t.workoutTime.endWorkout}
        </button>
      )}

      <div>
        <button
          type="button"
          onClick={handleAddExercise}
          disabled={isAddingExercise}
          className="btn-glass btn-glass-full btn-glass-md btn-glass-primary text-white disabled:opacity-50"
        >
          {isAddingExercise ? t.workout.adding : t.workout.addExercise}
        </button>
      </div>

      <WorkoutCardioToggle
        isCardio={isCardio}
        isSaving={isSavingCardio}
        onToggle={handleToggleCardio}
      />

      <WorkoutNotesSection
        notes={workoutNotes}
        isSaving={isSavingNotes}
        onChange={setWorkoutNotes}
      />

      <WorkoutTimeSection
        startTime={startTime}
        endTime={endTime}
        onUpdateStartTime={handleUpdateStartTime}
        onUpdateEndTime={handleUpdateEndTime}
        onClear={handleClearWorkoutTime}
      />

      <WorkoutTemplateSelectModal
        open={isSelectTemplateOpen}
        templates={templates}
        isCreating={isCreating}
        onClose={() => setIsSelectTemplateOpen(false)}
        onReplaceWithTemplate={handleReplaceWithTemplate}
      />

      <ReorderExercisesModal
        open={isReorderOpen}
        onClose={() => setIsReorderOpen(false)}
        items={exercises.map(exercise => ({
          id: exercise.id,
          name: exercise.name,
          position: exercise.position ?? 0,
        }))}
        onSave={handleSaveNewOrder}
      />

      <ConfirmDialog
        open={isDeleteWorkoutOpen}
        onOpenChange={setIsDeleteWorkoutOpen}
        title={t.workout.deleteWorkout}
        description={t.workout.deleteWorkoutDesc.replace('{date}', formatDateForDisplay(normalizedDate!))}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
        onConfirm={handleDeleteWorkout}
      />

      <WorkoutIconPickerModal
        open={isIconPickerOpen}
        value={editIconValue}
        onClose={() => setIsIconPickerOpen(false)}
        onChange={handleIconChange}
      />

      <WorkoutActionsPopover
        isOpen={isActionsOpen}
        menuPos={menuPos}
        onReorder={() => setIsReorderOpen(true)}
        onChangeTemplate={() => setIsSelectTemplateOpen(true)}
        onDelete={() => setIsDeleteWorkoutOpen(true)}
        onClose={closeActions}
      />
    </div>
  );
};

export default WorkoutPage;
