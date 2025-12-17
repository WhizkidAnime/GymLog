import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/use-i18n';
import { deleteUserAccount } from '../lib/user';
import ConfirmDialog from '../components/confirm-dialog';
import TemplateSavedDialog from '../components/template-saved-dialog';

// Custom hooks
import { useBodyWeightTracker } from '../hooks/use-body-weight-tracker';
import { useProfileSettings } from '../hooks/use-profile-settings';
import { useWorkoutsImportExport } from '../hooks/use-workouts-import-export';
import { useTemplatesImportExport } from '../hooks/use-templates-import-export';
import { useDataCleanup } from '../hooks/use-data-cleanup';

// Profile components
import {
  BodyWeightTrackerModal,
  CleanDataDialog,
  DeleteWorkoutsDialog,
  DeleteTemplatesDialog,
  ProfileMenu,
  SettingsSection,
  TemplatesImportDialog,
  WorkoutsImportDialog,
} from '../components/profile';

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  // Local state for delete account
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [deleteAccountEmail, setDeleteAccountEmail] = useState('');
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isEmailSpoilerRevealed, setIsEmailSpoilerRevealed] = useState(false);

  // Workouts import/export hook
  const workoutsImportExport = useWorkoutsImportExport({
    userId: user?.id,
    userEmail: user?.email,
  });

  // Templates import/export hook
  const templatesImportExport = useTemplatesImportExport({
    userId: user?.id,
    userEmail: user?.email,
    setToastVariant: workoutsImportExport.setToastVariant,
    setImportSuccessMessage: workoutsImportExport.setImportSuccessMessage,
    setIsImportSuccessOpen: workoutsImportExport.setIsImportSuccessOpen,
  });

  // Data cleanup hook
  const dataCleanup = useDataCleanup({
    userId: user?.id,
    setToastVariant: workoutsImportExport.setToastVariant,
    setImportSuccessMessage: workoutsImportExport.setImportSuccessMessage,
    setIsImportSuccessOpen: workoutsImportExport.setIsImportSuccessOpen,
  });

  // Body weight tracker hook
  const bodyWeightTracker = useBodyWeightTracker({
    userId: user?.id,
  });

  // Profile settings hook
  const profileSettings = useProfileSettings();

  // Load body weights when modal opens
  useEffect(() => {
    if (bodyWeightTracker.isWeightTrackerOpen && user) {
      bodyWeightTracker.loadBodyWeights();
    }
  }, [bodyWeightTracker.isWeightTrackerOpen, user]);

  // Computed display name
  const displayName = useMemo(() => {
    if (!user) return '';

    const metaNickname = (user.user_metadata as any)?.nickname;
    if (typeof metaNickname === 'string' && metaNickname.trim().length > 0) {
      return metaNickname.trim();
    }

    const email = user.email || '';
    if (email.endsWith('@gymlog.app')) {
      return email.replace(/@gymlog\.app$/, '');
    }

    return email;
  }, [user]);

  // Email parts for spoiler
  const emailParts = useMemo(() => {
    const email = user?.email || '';
    if (!email || typeof email !== 'string') {
      return null;
    }

    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return null;
    }

    const visibleLength = Math.max(1, Math.ceil(localPart.length / 2));
    const visiblePart = localPart.slice(0, visibleLength);
    const hiddenPart = localPart.slice(visibleLength);

    return { email, localPart, domain, visiblePart, hiddenPart };
  }, [user?.email]);

  // Handlers
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const startDeleteAccountFlow = () => {
    if (!user || !user.email) return;
    setDeleteAccountEmail('');
    setDeleteAccountError(null);
    setIsDeleteAccountDialogOpen(true);
  };

  const startCleanDataFlow = () => {
    if (!user) return;
    dataCleanup.setIsCleanDataDialogOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email) return;

    if (deleteAccountEmail.trim() !== user.email) {
      setDeleteAccountError(t.profile.emailMismatch);
      throw new Error('EMAIL_MISMATCH');
    }

    setDeleteAccountError(null);
    setIsDeleting(true);
    try {
      await deleteUserAccount();

      alert(t.profile.accountDeleted);
      await signOut();
      navigate('/login', { replace: true });

    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(`${t.profile.deleteAccountError}${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pt-safe relative profile-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.profile.title}</h1>
        <ProfileMenu
          isImportingWorkouts={workoutsImportExport.isImportingWorkouts}
          isImportingTemplates={templatesImportExport.isImportingTemplates}
          handleStartImportWorkouts={workoutsImportExport.handleStartImportWorkouts}
          handleStartImportTemplates={templatesImportExport.handleStartImportTemplates}
          isExporting={workoutsImportExport.isExporting}
          isExportingTemplates={templatesImportExport.isExportingTemplates}
          handleExportWorkouts={workoutsImportExport.handleExportWorkouts}
          handleExportTemplates={templatesImportExport.handleExportTemplates}
          isDeleting={isDeleting}
          startCleanDataFlow={startCleanDataFlow}
          startDeleteAccountFlow={startDeleteAccountFlow}
        />
      </div>

      {/* User info card */}
      <div className="p-4 glass card-dark rounded-lg shadow-sm">
        {user && (
          <p className="flex flex-wrap items-center gap-1">
            <span>{t.profile.loggedInAs}</span>
            {emailParts ? (
              <span className="font-semibold">
                {emailParts.visiblePart}
                {emailParts.hiddenPart && (
                  <button
                    type="button"
                    onClick={() => setIsEmailSpoilerRevealed(true)}
                    className="inline px-0 py-0 border-b border-dashed border-white/40 hover:border-white/80 transition-colors cursor-pointer select-none bg-transparent rounded-none align-baseline"
                  >
                    {isEmailSpoilerRevealed ? (
                      <span>{emailParts.hiddenPart}</span>
                    ) : (
                      <span>
                        {'•'.repeat(Math.max(3, emailParts.hiddenPart.length))}
                      </span>
                    )}
                  </button>
                )}
                @{emailParts.domain}
              </span>
            ) : (
              <span className="font-semibold">{displayName}</span>
            )}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          onClick={() => navigate('/profile/progress')}
          className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          {t.profile.viewProgress}
        </button>

        <button
          onClick={() => bodyWeightTracker.setIsWeightTrackerOpen(true)}
          className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
          {t.profile.bodyWeightTracker}
        </button>

        <button
          onClick={() => profileSettings.setIsSettingsOpen(!profileSettings.isSettingsOpen)}
          className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t.profile.settings}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${profileSettings.isSettingsOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          onClick={handleLogout}
          className="btn-glass btn-glass-logout btn-glass-full btn-glass-md"
        >
          {t.profile.logout}
        </button>
      </div>

      {/* Settings section */}
      <SettingsSection
        isOpen={profileSettings.isSettingsOpen}
        timerStepInput={profileSettings.timerStepInput}
        setTimerStepInput={profileSettings.setTimerStepInput}
        saveStatus={profileSettings.saveStatus}
        saveTimerStep={profileSettings.saveTimerStep}
        theme={profileSettings.theme}
        handleThemeChange={profileSettings.handleThemeChange}
      />

      {/* Hidden file inputs */}
      <input
        ref={workoutsImportExport.workoutsFileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={workoutsImportExport.handleWorkoutsFileChange}
      />
      <input
        ref={templatesImportExport.templatesFileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={templatesImportExport.handleTemplatesFileChange}
      />

      {/* Delete account dialog */}
      <ConfirmDialog
        open={isDeleteAccountDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteAccountDialogOpen(open);
          if (!open) {
            setDeleteAccountEmail('');
            setDeleteAccountError(null);
          }
        }}
        title={t.profile.deleteAccountConfirm}
        description={t.profile.deleteAccountDesc}
        confirmText={t.profile.deleteAccountBtn}
        cancelText={t.common.cancel}
        variant="danger"
        confirmDisabled={deleteAccountEmail.trim().length === 0}
        onConfirm={handleDeleteAccount}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            {t.profile.emailConfirmation}<span className="font-semibold">{user?.email}</span>
          </p>
          <input
            type="email"
            value={deleteAccountEmail}
            onChange={(e) => {
              setDeleteAccountEmail(e.target.value);
              if (deleteAccountError) {
                setDeleteAccountError(null);
              }
            }}
            placeholder={user?.email || t.profile.emailPlaceholder}
            className="mt-1 block w-full px-3 py-2 rounded-md shadow-xs focus:outline-hidden focus:ring-red-500 focus:border-red-500"
            style={{ background: '#18181b', color: '#fafafa', border: '1px solid #3f3f46' }}
          />
          {deleteAccountError && (
            <p className="text-xs text-red-400">
              {deleteAccountError}
            </p>
          )}
        </div>
      </ConfirmDialog>

      {/* Clean data dialog */}
      <CleanDataDialog
        isOpen={dataCleanup.isCleanDataDialogOpen}
        onClose={() => dataCleanup.setIsCleanDataDialogOpen(false)}
        isLoadingWorkoutsForDeletion={dataCleanup.isLoadingWorkoutsForDeletion}
        isLoadingTemplatesForDeletion={dataCleanup.isLoadingTemplatesForDeletion}
        openDeleteWorkoutsDialog={dataCleanup.openDeleteWorkoutsDialog}
        openDeleteTemplatesDialog={dataCleanup.openDeleteTemplatesDialog}
      />

      {/* Delete workouts dialog */}
      <DeleteWorkoutsDialog
        isOpen={dataCleanup.isDeleteWorkoutsDialogOpen}
        onClose={dataCleanup.closeDeleteWorkoutsDialog}
        workoutDateGroups={dataCleanup.workoutDateGroups}
        selectedWorkoutDates={dataCleanup.selectedWorkoutDates}
        isDeletingWorkouts={dataCleanup.isDeletingWorkouts}
        areAllWorkoutDatesSelected={dataCleanup.areAllWorkoutDatesSelected}
        toggleWorkoutDateSelection={dataCleanup.toggleWorkoutDateSelection}
        selectAllWorkoutDates={dataCleanup.selectAllWorkoutDates}
        clearWorkoutSelection={dataCleanup.clearWorkoutSelection}
        handleDeleteSelectedWorkouts={dataCleanup.handleDeleteSelectedWorkouts}
      />

      {/* Delete templates dialog */}
      <DeleteTemplatesDialog
        isOpen={dataCleanup.isDeleteTemplatesDialogOpen}
        onClose={dataCleanup.closeDeleteTemplatesDialog}
        templatesForDeletion={dataCleanup.templatesForDeletion}
        selectedTemplateIds={dataCleanup.selectedTemplateIds}
        isDeletingTemplates={dataCleanup.isDeletingTemplates}
        areAllTemplatesSelected={dataCleanup.areAllTemplatesSelected}
        toggleTemplateSelection={dataCleanup.toggleTemplateSelection}
        selectAllTemplates={dataCleanup.selectAllTemplates}
        clearTemplateSelection={dataCleanup.clearTemplateSelection}
        handleDeleteSelectedTemplates={dataCleanup.handleDeleteSelectedTemplates}
      />

      {/* Import success toast */}
      <TemplateSavedDialog
        open={workoutsImportExport.isImportSuccessOpen}
        onOpenChange={(open) => {
          if (!open) {
            workoutsImportExport.closeImportSuccessToast();
          }
        }}
        onClose={workoutsImportExport.closeImportSuccessToast}
        message={
          workoutsImportExport.importSuccessMessage ||
          'Импорт тренировок завершён. Откройте календарь, чтобы посмотреть тренировки.'
        }
        variant={workoutsImportExport.toastVariant}
      />

      {/* Templates import dialog */}
      <TemplatesImportDialog
        isOpen={templatesImportExport.isTemplatesImportDialogOpen}
        pendingTemplatesDuplicates={templatesImportExport.pendingTemplatesDuplicates}
        isImportingTemplates={templatesImportExport.isImportingTemplates}
        templatesImportAction={templatesImportExport.templatesImportAction}
        onClose={templatesImportExport.closeTemplatesImportDialog}
        handleImportTemplatesOnlyNew={templatesImportExport.handleImportTemplatesOnlyNew}
        handleImportTemplatesOverwrite={templatesImportExport.handleImportTemplatesOverwrite}
      />

      {/* Workouts import dialog */}
      <WorkoutsImportDialog
        isOpen={workoutsImportExport.isWorkoutsImportDialogOpen}
        pendingWorkoutsImport={workoutsImportExport.pendingWorkoutsImport}
        pendingWorkoutsFileName={workoutsImportExport.pendingWorkoutsFileName}
        pendingWorkoutsNewDatesSummary={workoutsImportExport.pendingWorkoutsNewDatesSummary}
        isImportingWorkouts={workoutsImportExport.isImportingWorkouts}
        importAction={workoutsImportExport.importAction}
        onClose={workoutsImportExport.closeWorkoutsImportDialog}
        handleConfirmImportWorkoutsOnly={workoutsImportExport.handleConfirmImportWorkoutsOnly}
        handleImportOnlyNewWorkouts={workoutsImportExport.handleImportOnlyNewWorkouts}
        handleExportThenImportWorkouts={workoutsImportExport.handleExportThenImportWorkouts}
      />

      {/* Body weight tracker modal */}
      <BodyWeightTrackerModal
        isOpen={bodyWeightTracker.isWeightTrackerOpen}
        onClose={() => bodyWeightTracker.setIsWeightTrackerOpen(false)}
        bodyWeights={bodyWeightTracker.bodyWeights}
        loadingWeights={bodyWeightTracker.loadingWeights}
        weightChartData={bodyWeightTracker.weightChartData}
        weightStats={bodyWeightTracker.weightStats}
        newWeight={bodyWeightTracker.newWeight}
        newWeightDate={bodyWeightTracker.newWeightDate}
        savingWeight={bodyWeightTracker.savingWeight}
        deletingWeightId={bodyWeightTracker.deletingWeightId}
                isDeleteWeightConfirmOpen={bodyWeightTracker.isDeleteWeightConfirmOpen}
        weightToDelete={bodyWeightTracker.weightToDelete}
        setNewWeight={bodyWeightTracker.setNewWeight}
        setNewWeightDate={bodyWeightTracker.setNewWeightDate}
        setIsDeleteWeightConfirmOpen={bodyWeightTracker.setIsDeleteWeightConfirmOpen}
        handleAddWeight={bodyWeightTracker.handleAddWeight}
        handleDeleteWeight={bodyWeightTracker.handleDeleteWeight}
        handleOpenDeleteWeightConfirm={bodyWeightTracker.handleOpenDeleteWeightConfirm}
      />
    </div>
  );
};

export default ProfilePage;
