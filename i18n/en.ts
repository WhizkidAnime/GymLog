export const en = {
  // Common
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    back: 'Back',
    close: 'Close',
    clear: 'Clear',
    edit: 'Edit',
    search: 'Search',
    copy: 'Copy',
    copying: 'Copying...',
    or: 'OR',
    yes: 'Yes',
    no: 'No',
    confirm: 'Confirm',
    error: 'Error',
    success: 'Success',
    kg: 'kg',
    sec: 'sec',
    max: 'max',
  },

  // Navigation
  nav: {
    calendar: 'Calendar',
    search: 'Search',
    templates: 'Templates',
    profile: 'Profile',
    bottomNavLabel: 'Bottom navigation',
  },

  // Login page
  login: {
    title: 'GymLog',
    createAccount: 'Create an account',
    signIn: 'Sign in to your account',
    nickname: 'Nickname',
    loginPlaceholder: 'Login',
    yourLoginPlaceholder: 'Your login',
    password: 'Password',
    enterPassword: 'Enter password',
    confirmPassword: 'Confirm password',
    signUp: 'Sign up',
    signInBtn: 'Sign in',
    alreadyHaveAccount: 'Already have an account?',
    noAccount: "Don't have an account?",
    signInWithGoogle: 'Sign in with Google',
    registrationSuccess: 'Registration successful! You are now logged in.',
    errors: {
      enterNickname: 'Enter nickname',
      passwordMinLength: 'Password must be at least 6 characters',
      passwordsMismatch: 'Passwords do not match',
      invalidCredentials: 'Invalid nickname or password',
      userExists: 'User with this nickname already exists',
      generic: 'An error occurred. Please try again.',
    },
    theme: {
      auto: 'Auto',
      dark: 'Dark',
      light: 'Light',
    },
  },

  // Calendar page
  calendar: {
    loading: 'Loading calendar...',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },

  // Workout page
  workout: {
    loading: 'Loading...',
    addExercise: 'Add exercise',
    adding: 'Adding...',
    deleteWorkout: 'Delete workout?',
    deleteWorkoutDesc: 'You are about to delete the workout on {date}. This action cannot be undone.',
    emptyState: {
      title: 'No workout',
      subtitle: 'Choose a template or create your own workout',
      createCustom: 'Create custom workout',
      creating: 'Creating...',
    },
    cardio: {
      label: 'This was a cardio workout',
      question: 'Was there cardio?',
    },
    notes: {
      title: 'Notes',
      placeholder: 'Workout notes...',
      saving: 'Saving...',
      detailedPlaceholder: 'How you felt, what went well, what to work on',
    },
  },

  // Exercise card
  exercise: {
    lastWeight: 'Last working weight',
    enterNameToSeeResult: 'Enter name to see previous result',
    searchingLastResult: 'Searching for last result…',
    loadError: 'Failed to load data',
    noDataBeforeDate: 'No data for this exercise before this date',
    warmupSets: 'Warm-up sets',
    sets: 'Working sets',
    set: 'Set',
    reps: 'Reps',
    weight: 'Weight (kg)',
    toFailure: 'To failure',
    deleteExercise: 'Delete exercise?',
    deleteExerciseDesc: 'You are about to delete exercise "{name}". This action cannot be undone.',
    deleteExerciseDescNoName: 'You are about to delete exercise. This action cannot be undone.',
    errors: {
      failedToChangeSets: 'Failed to change sets count',
      failedToDeleteSets: 'Failed to delete exercise sets. Please try again.',
      failedToDeleteExercise: 'Failed to delete exercise. Please try again.',
      failedToAddDropset: 'Failed to add dropset',
      failedToDeleteDropset: 'Failed to delete dropset',
    },
  },

  // Templates page
  templates: {
    title: 'Templates',
    loading: 'Loading templates...',
    empty: "You don't have any templates yet. Create your first one!",
    share: 'Share',
    archive: 'Archive',
    addToArchive: 'Add to archive',
    archiving: 'Archiving...',
    archiveError: 'Failed to add to archive.',
    archiveLoading: 'Loading archive...',
    archiveEmpty: 'Archive is empty.',
    archiveLoadError: 'Failed to load archive.',
    restore: 'Restore',
    restoring: 'Restoring...',
    restoreSelected: 'Restore selected',
    restoreError: 'Failed to restore templates.',
    selectAll: 'Select all',
    clearSelection: 'Clear selection',
    delete: 'Delete',
    deleting: 'Deleting...',
    deleteSelected: 'Delete selected',
    deletingSelected: 'Deleting...',
    deleteConfirm: 'Delete template?',
    deleteConfirmDesc: 'Template and all its exercises will be deleted. This action cannot be undone.',
    shareTitle: 'Copy link to share template',
    generatingLink: 'Generating link...',
    emptyTemplateError: 'This template is empty. Add exercises before sharing.',
    shareError: 'Failed to generate link: ',
    deleteError: 'Failed to delete template.',
    copyError: 'Auto-copy failed. Copy the link manually: long press → Copy.',
    importTemplate: 'Import template',
    menuLabel: 'Template menu',
  },

  // Template editor page
  templateEditor: {
    newTemplate: 'New template',
    editTemplate: 'Edit template',
    dayName: 'Day name',
    dayNamePlaceholder: 'e.g., Push Day',
    exercises: 'Exercises',
    exercisePlaceholder: 'Exercise name',
    setsLabel: 'Sets',
    repsLabel: 'Reps',
    restLabel: 'Rest (sec)',
    addExercise: '+ Add exercise',
    saveTemplate: 'Save template',
    saving: 'Saving...',
    loading: 'Loading editor...',
    backToTemplates: 'Back to templates',
    deleteExercise: 'Delete exercise?',
    deleteExerciseDesc: 'This exercise will be removed from the template. This action cannot be undone.',
    errors: {
      mustBeLoggedIn: 'You must be logged in to save a template.',
      repsFormatError: 'Failed to save reps range (e.g., "10-12"). Please make sure your database schema is updated.',
      saveError: 'Save error: ',
    },
  },

  // Profile page
  profile: {
    title: 'Profile',
    loggedInAs: 'Logged in as:',
    viewProgress: 'View progress',
    bodyWeightTracker: 'Body weight tracker',
    settings: 'Settings',
    logout: 'Log out',
    menu: 'Menu',
    import: 'Import',
    export: 'Export',
    dataAndAccount: 'Data & account',
    workouts: 'Workouts',
    importingWorkouts: 'Importing workouts...',
    importingTemplates: 'Importing templates...',
    exportingWorkouts: 'Exporting workouts...',
    exportingTemplates: 'Exporting templates...',
    cleanData: 'Clean data',
    deleteAccount: 'Delete account',
    deletingAccount: 'Deleting...',
    deleteAccountConfirm: 'Delete account and all data?',
    deleteAccountDesc: 'This action is irreversible and will delete all your data.',
    deleteAccountBtn: 'Delete account',
    emailConfirmation: 'To confirm, enter your email: ',
    emailPlaceholder: 'Enter your email',
    emailMismatch: 'Entered email does not match yours.',
    accountDeleted: 'Your account and all data have been successfully deleted.',
    deleteAccountError: 'Failed to delete account: ',
    importSuccess: 'Import completed. Open calendar to see your workouts.',
  },

  // Settings
  settings: {
    title: 'Settings',
    timerStep: 'Rest timer step (seconds)',
    timerStepDesc: 'Value by which timer changes when pressing +/-',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeAuto: 'Auto',
    language: 'Language',
    languageRu: 'Русский',
    languageEn: 'English',
    saving: 'Saving...',
    saved: 'Saved',
  },

  // Progress page
  progress: {
    title: 'Progress',
    loading: 'Loading exercises...',
    cardio: 'Cardio',
    exercises: 'Exercises',
    search: 'Search',
    noData: 'No data to display',
    noDataHint: 'Complete some workouts with recorded weight',
    notFound: 'No exercises found',
    notFoundHint: 'Try changing your query',
    totalSets: 'Total sets: ',
    sort: {
      label: 'Sort',
      alphabetical: 'Alphabetical',
      lastAdded: 'Last set added',
      mostFrequent: 'Most frequent',
    },
    period: {
      all: 'All data',
      threeMonths: 'Last 3 months',
      sixMonths: 'Last 6 months',
      oneYear: 'Last year',
      custom: 'Custom period',
    },
    stats: {
      sessions: 'Sessions',
      maxWeight: 'Max weight',
      minWeight: 'Min weight',
      growth: 'Weight growth',
    },
    from: 'From',
    to: 'To',
    history: 'History',
  },

  // Cardio progress
  cardio: {
    loading: 'Loading cardio...',
    weeklyGoal: 'Weekly goal',
    workoutsPerWeek: '{count} per week',
    monthlyStats: 'Monthly statistics',
    thisMonth: 'This month',
    totalCardio: 'Total cardio',
    weeklyProgress: 'Weekly progress',
    selectMonth: 'Select month',
    noDataForMonth: 'No data for this month',
    infoTitle: 'How does it work?',
    infoDesc: 'Mark a workout as cardio on the workout page to include it in statistics.',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    // Cardio info modal
    aboutCardio: 'About cardio',
    whatIsCardio: 'What is cardio?',
    whatIsCardioDesc: 'Aerobic exercises that strengthen the cardiovascular system and improve endurance.',
    howOften: 'How often?',
    howOftenItems: [
      '2-3 times per week — minimum for health',
      '3-5 times — optimal for weight loss',
      '20-40 minutes per session',
    ],
    targetHeartRate: 'Target heart rate',
    targetHeartRateDesc: '130-140 bpm — fat burning zone. You should be able to talk, but with effort.',
    cardioTypes: 'Types of cardio',
    cardioTypesItems: [
      { name: 'Stair Master', desc: 'simulates climbing stairs' },
      { name: 'Elliptical', desc: 'low impact on joints' },
      { name: 'Stationary bike', desc: 'great for beginners' },
      { name: 'Treadmill', desc: 'brisk walking' },
    ],
    benefits: 'Benefits',
    benefitsItems: [
      'Strengthens heart and blood vessels',
      'Speeds up metabolism',
      'Reduces stress levels',
      'Improves sleep quality',
    ],
    whenToDo: 'When to do?',
    whenToDoItems: [
      'After strength training (20-30 min)',
      'On a separate day (40-60 min)',
      'Morning fasted — for advanced',
    ],
    warning: 'Warning',
    warningText: 'If you have heart, joint, or blood pressure issues — consult a doctor before starting cardio workouts.',
  },

  // Body weight tracker
  bodyWeight: {
    title: 'Body weight tracker',
    addWeight: 'Add weight',
    date: 'Date',
    datePlaceholder: '8.12.2025',
    weight: 'Weight (kg)',
    weightPlaceholder: '70.25',
    save: 'Save',
    saving: 'Saving...',
    delete: 'Delete',
    deleting: 'Deleting...',
    noData: 'No weight records',
    addFirstWeight: 'Add your first record',
    tooltipWeight: 'Weight',
    stats: {
      current: 'Current',
      min: 'Minimum',
      max: 'Maximum',
      change: 'Change',
    },
    deleteConfirm: 'Delete record?',
    deleteConfirmDesc: 'Weight record will be deleted.',
    chart: 'Chart',
    history: 'History',
  },

  // Data cleanup
  cleanup: {
    title: 'Data cleanup',
    selectWorkouts: 'Select workouts to delete',
    selectTemplates: 'Select templates to delete',
    deleteWorkouts: 'Delete workouts',
    deleteTemplates: 'Delete templates',
    loading: 'Loading...',
    selectAll: 'Select all',
    clearSelection: 'Clear selection',
    selected: 'Selected: ',
    deleteSelected: 'Delete selected',
    noWorkouts: 'No workouts to delete',
    noTemplates: 'No templates to delete',
  },

  // Dialogs & confirmations
  dialogs: {
    templateSaved: 'Template saved',
    linkCopied: 'Link copied',
  },

  // Pluralization
  pluralize: {
    workouts: ['workout', 'workouts', 'workouts'],
    exercises: ['exercise', 'exercises', 'exercises'],
    sets: ['set', 'sets', 'sets'],
    reps: ['rep', 'reps', 'reps'],
  },

  // Rest timer
  timer: {
    title: 'Rest',
    start: 'Start',
    stop: 'Stop',
    pause: 'Pause',
    reset: 'Reset',
  },

  // Workout actions menu
  workoutActions: {
    reorderExercises: 'Reorder exercises',
    changeWorkout: 'Change workout',
    delete: 'Delete',
  },

  // Icon picker
  iconPicker: {
    title: 'Day icon',
    none: 'None',
    icons: {
      upper: 'Upper',
      lower: 'Lower',
      push: 'Push',
      pull: 'Pull',
      legs: 'Legs',
      arms: 'Arms',
      shoulders: 'Shoulders',
      chest: 'Chest',
      back: 'Back',
      core: 'Core',
      cardio: 'Cardio',
      full: 'Full body',
    },
  },

  // Months
  months: {
    long: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },

  // Workout header
  workoutHeader: {
    date: 'Date',
  },

  // Exercise history page
  exerciseHistory: {
    title: 'Exercise history',
    searchPlaceholder: 'Search',
    searchAriaLabel: 'Search exercises',
    searching: 'Searching...',
    notFound: 'No exercises found',
    notFoundHint: 'Try changing your query',
    emptyTitle: 'Start typing exercise name',
    emptyHint: 'You will see the history of all workouts with this exercise',
    set: 'Set',
    drop: 'Drop',
    weight: 'Weight',
    reps: 'Reps',
    noSetsData: 'No sets data',
  },

  // Template import page
  templateImport: {
    title: 'Import template',
    loginRequired: 'Log in to import templates',
    login: 'Log in',
    checkingClipboard: 'Checking clipboard...',
    invalidLink: 'Invalid template link format',
    loadError: 'Failed to load template from link',
    clipboardNoAccess: 'Clipboard API not available in this environment',
    clipboardInvalidLink: 'Invalid link format in clipboard',
    clipboardNoLink: 'No template link in clipboard. Copy a link and try again.',
    clipboardPermissionDenied: 'No clipboard access. Paste the link manually.',
    clipboardReadError: 'Failed to read clipboard: ',
    checkExistingError: 'Failed to check existing templates before import. Please try again.',
    duplicateExists: 'This template already exists. Import cancelled.',
    createError: 'Failed to create template',
    importSuccess: 'Template "{name}" imported successfully!',
    importError: 'Failed to import template: ',
    replaceError: 'Failed to replace existing template. Please try again.',
    createNewError: 'Failed to create new template. Please try again.',
    pastePrompt: 'Paste the template link from clipboard',
    invalidPastedLink: 'Pasted text is not a valid template link',
    extractError: 'Failed to extract template from link',
    exercisesCount: 'Exercises',
    exercisesList: 'Exercises:',
    setsReps: '{sets} sets × {reps} reps • Rest: {rest}s',
    importing: 'Importing...',
    addTemplate: 'Add template',
    cancel: 'Cancel',
    copyLinkHint: 'Copy a template link and press the button below',
    importFromClipboard: 'Import from clipboard',
    pasteManually: 'Paste link manually',
    checkClipboardAgain: 'Check clipboard again',
    conflictTitle: 'Template with this name already exists',
    conflictDesc: 'Current template "{name}" differs from the template in the link. Check the differences and choose an action.',
    existing: 'Existing',
    fromLink: 'From link',
    noName: 'No name',
    replacing: 'Replacing...',
    replaceExisting: 'Replace existing template',
    createNew: 'Create new template',
    newTemplateName: 'New template',
  },

  // Workout cardio toggle
  workoutCardio: {
    question: 'Was there cardio?',
    yes: 'Yes',
    no: 'No',
  },

  // Workout notes
  workoutNotes: {
    title: 'Notes',
    saving: 'Saving...',
    placeholder: 'How you felt, what went well, what to work on',
  },

  // Set row
  setRow: {
    dropset: 'DS',
    addDropset: 'Add dropset',
    deleteDropset: 'Delete dropset',
    copyWeight: 'Copy weight from previous set',
    toFailure: 'Set to failure (max)',
  },

  // Reorder exercises modal
  reorderExercises: {
    title: 'Exercise order',
    drag: 'Drag',
    noName: 'No name',
    saving: 'Saving...',
  },

  // Workout empty state
  workoutEmptyState: {
    workoutOn: 'Workout on {date}',
    selectTemplate: 'Select template',
    createTemplateFirst: 'Create a template first.',
    createTemplate: 'Create template',
    createCustomDay: 'Create custom day',
    creating: 'Creating...',
  },

  // Workout template select modal
  workoutTemplateSelect: {
    title: 'Select template',
    noTemplates: 'No templates available.',
    applying: 'Applying...',
  },

  // Workout icon picker modal
  workoutIconPicker: {
    title: 'Select icon',
    none: 'None',
  },

  // Template saved dialog
  templateSavedDialog: {
    linkCopied: 'Link to "{name}" copied to clipboard',
    templateSaved: 'Template saved!',
  },

  // Confirm dialog
  confirmDialog: {
    title: 'Confirm action',
    confirm: 'Confirm',
    executing: 'Executing...',
  },

  // Workouts import dialog
  workoutsImport: {
    title: 'Import workouts',
    description: 'Workouts will be imported from file "{fileName}".',
    warning: 'Workouts on dates that already exist in the calendar and are present in the file will be deleted and overwritten with data from the file. Workouts on other dates will remain unchanged.',
    importOnlyNewHint: '"Import only new workouts" — will add workouts only for new dates, without changing existing ones.',
    importOverwriteHint: '"Import with date overwrite" — will replace workouts on matching dates and add new ones.',
    exportThenImportHint: '"Export current workouts and import with overwrite" — will first save current workouts to a file, then import with date overwrite.',
    newWorkoutsTitle: 'New workouts from file (dates not yet in calendar):',
    exportingAndImporting: 'Exporting current workouts and importing new ones...',
    importingOnlyNew: 'Importing only new workouts...',
    importingWorkouts: 'Importing workouts...',
    importOnlyNew: 'Import only new workouts (without changing existing)',
    importOverwrite: 'Import with date overwrite from file',
    exportThenImport: 'Export current workouts and import with date overwrite',
  },

  // Templates import dialog
  templatesImport: {
    title: 'Import templates',
    duplicatesFound: 'The file contains templates with names that already exist in your account.',
    importOnlyNewHint: '"Import only new templates" — will add only those that don\'t exist yet.',
    overwriteHint: '"Overwrite existing templates" — will delete matching ones and recreate them from the file.',
    noName: 'No name',
    existsAs: 'Already exists as: "{name}"',
    noDuplicates: 'No matching templates found.',
    overwriting: 'Overwriting existing templates and importing data...',
    importingOnlyNew: 'Importing only new templates...',
    importOnlyNew: 'Import only new templates (without changing existing)',
    overwriteAndAdd: 'Overwrite existing templates and add new ones',
  },

  // Delete workouts dialog
  deleteWorkouts: {
    title: 'Delete workouts',
    description: 'Select workout dates you want to delete. This action is irreversible.',
    selectAll: 'Select all',
    clearSelection: 'Clear selection',
    workout: '1 workout',
    workouts: '{count} workouts',
    noWorkouts: 'No workouts found for deletion.',
    deleting: 'Deleting selected...',
    deleteSelected: 'Delete selected',
  },

  // Delete templates dialog
  deleteTemplates: {
    title: 'Delete workout templates',
    description: 'Select workout templates you want to delete. This action is irreversible.',
    noTemplates: 'No templates found for deletion.',
    deleting: 'Deleting selected...',
    deleteSelected: 'Delete selected',
  },

  // Clean data dialog
  cleanData: {
    title: 'Clean data',
    description: 'Select which data you want to delete.',
    loading: 'Loading data...',
    deleteWorkouts: 'Delete workouts',
    deleteTemplates: 'Delete workout templates',
  },

  // Hooks messages
  hooks: {
    // Workouts import/export
    noWorkoutsToImport: 'No workouts to import in the file.',
    importedWorkout: 'Imported workout',
    failedToCreateWorkout: 'Failed to create workout during import.',
    failedToCreateExercises: 'Failed to create exercises during import.',
    failedToLoadWorkouts: 'Failed to load workout data for export.',
    unexpectedExportError: 'An unexpected error occurred while exporting data.',
    invalidJsonFile: 'The file is not a valid JSON.',
    notGymLogExport: 'The file does not look like a GymLog workout export.',
    failedToCheckExisting: 'Failed to check existing workouts before import.',
    allWorkoutsExist: 'All workouts from the file already exist in your calendar. No new workouts.',
    importComplete: 'Workout import complete. Open the calendar to view workouts.',
    failedToImport: 'Failed to import workouts: ',
    failedToReadFile: 'Failed to read workout file.',
    newWorkoutsImportComplete: 'New workouts import complete. Open the calendar to view workouts.',
    failedToImportNew: 'Failed to import new workouts. Please try again.',
    noNewWorkoutsInFile: 'No new workouts with dates not yet in your calendar.',
    failedToDetermineNew: 'Failed to determine new workouts for import. Check the file.',
    exportThenImportComplete: 'Current workouts saved, import complete. Open the calendar to view workouts.',
    failedExportThenImport: 'Failed to export and import workouts. Please try again.',

    // Templates import/export
    noTemplatesToImport: 'No templates to import in the file.',
    importedTemplate: 'Imported template',
    failedToCreateTemplate: 'Failed to create template during import.',
    failedToLoadTemplates: 'Failed to load templates for export.',
    unexpectedTemplatesExportError: 'An unexpected error occurred while exporting templates.',
    notGymLogTemplatesExport: 'The file does not look like a GymLog templates export.',
    failedToCheckExistingTemplates: 'Failed to check existing templates before import.',
    allTemplatesExist: 'All templates from the file already exist in your account. No new templates.',
    templatesImportComplete: 'Templates import complete. Open the "Templates" page to view them.',
    failedToImportTemplates: 'Failed to import templates. Please try again.',
    newTemplatesImportComplete: 'New templates import complete. Open the "Templates" page to view them.',
    failedToImportNewTemplates: 'Failed to import new templates. Please try again.',
    templatesOverwriteComplete: 'Templates imported successfully. Matching templates were overwritten.',
    failedToOverwriteTemplates: 'Failed to import templates with overwrite: ',

    // Data cleanup
    failedToLoadWorkoutsForDeletion: 'Failed to load workout list for deletion.',
    errorLoadingWorkoutsForDeletion: 'An error occurred while loading workouts for deletion.',
    noWorkoutsToDelete: 'You have no workouts to delete.',
    failedToLoadTemplatesForDeletion: 'Failed to load template list for deletion.',
    errorLoadingTemplatesForDeletion: 'An error occurred while loading templates for deletion.',
    noTemplatesToDelete: 'You have no templates to delete.',
    noName: 'No name',
    workoutsDeletedSuccess: 'Selected workouts deleted successfully.',
    failedToDeleteWorkouts: 'Failed to delete selected workouts.',
    templatesDeletedSuccess: 'Selected workout templates deleted successfully.',
    failedToDeleteTemplates: 'Failed to delete selected workout templates.',

    // Workout operations
    failedToCreateExercise: 'Failed to create exercise',
    failedToCreateSet: 'Failed to create set',
    failedToAddExercise: 'Failed to add exercise. Please try again.',
    newWorkout: 'New workout',
    failedToCreateWorkoutEntry: 'Failed to create workout',
    failedToCreateWorkoutTryAgain: 'Failed to create workout. Please try again.',
    failedToCreateFromTemplate: 'Failed to create workout: ',
    failedToChangeWorkout: 'Failed to change workout: ',
    failedToDeleteWorkout: 'Failed to delete workout.',
    failedToSaveOrder: 'Failed to save order. Previous data restored.',

    // Workout name editor
    failedToUpdateWorkout: 'Failed to update workout',
    failedToSaveChanges: 'Failed to save changes. Please try again.',
    failedToUpdateWorkoutName: 'Failed to update workout name',
    failedToSaveName: 'Failed to save name. Please try again.',

    // Workout cardio
    failedToUpdateCardio: 'Failed to update cardio status',
    failedToSaveCardio: 'Failed to save cardio status.',

    // Body weight tracker
    enterValidWeight: 'Enter a valid weight (0.1 to 500 kg)',
    enterValidDate: 'Enter a valid date in d.mm.yyyy format (not in future)',
    failedToSaveWeight: 'Failed to save weight',
    failedToDeleteWeight: 'Failed to delete entry',

    // Progress
    failedToLoadExercises: 'Failed to load exercise list',
    failedToLoadProgress: 'Failed to load progress data',
  },
};
