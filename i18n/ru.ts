export const ru = {
  // Common
  common: {
    loading: 'Загрузка...',
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    back: 'Назад',
    close: 'Закрыть',
    clear: 'Очистить',
    edit: 'Редактировать',
    search: 'Поиск',
    copy: 'Копировать',
    copying: 'Копирование...',
    or: 'ИЛИ',
    yes: 'Да',
    no: 'Нет',
    confirm: 'Подтвердить',
    error: 'Ошибка',
    success: 'Успешно',
    kg: 'кг',
    sec: 'сек',
    max: 'макс.',
  },

  // Navigation
  nav: {
    calendar: 'Календарь',
    search: 'Поиск',
    templates: 'Шаблоны',
    profile: 'Профиль',
    bottomNavLabel: 'Нижняя навигация',
  },

  // Login page
  login: {
    title: 'GymLog',
    createAccount: 'Создайте аккаунт',
    signIn: 'Войдите в свой аккаунт',
    nickname: 'Никнейм',
    loginPlaceholder: 'Логин',
    yourLoginPlaceholder: 'Ваш логин',
    password: 'Пароль',
    enterPassword: 'Введите пароль',
    confirmPassword: 'Повторите пароль',
    signUp: 'Зарегистрироваться',
    signInBtn: 'Войти',
    alreadyHaveAccount: 'Уже есть аккаунт?',
    noAccount: 'Нет аккаунта?',
    signInWithGoogle: 'Войти через Google',
    registrationSuccess: 'Регистрация успешна! Вы вошли в аккаунт.',
    errors: {
      enterNickname: 'Введите никнейм',
      passwordMinLength: 'Пароль должен быть не короче 6 символов',
      passwordsMismatch: 'Пароли не совпадают',
      invalidCredentials: 'Неверный никнейм или пароль',
      userExists: 'Пользователь с таким никнеймом уже существует',
      generic: 'Произошла ошибка. Попробуйте ещё раз.',
    },
    theme: {
      auto: 'Авто',
      dark: 'Тёмная',
      light: 'Светлая',
    },
  },

  // Calendar page
  calendar: {
    loading: 'Загрузка календаря...',
    daysOfWeek: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  },

  // Workout page
  workout: {
    loading: 'Загрузка...',
    addExercise: 'Добавить упражнение',
    adding: 'Добавление...',
    deleteWorkout: 'Удалить тренировку?',
    deleteWorkoutDesc: 'Вы собираетесь удалить тренировку на {date}. Действие необратимо.',
    emptyState: {
      title: 'Нет тренировки',
      subtitle: 'Выберите шаблон или создайте свою тренировку',
      createCustom: 'Создать свою тренировку',
      creating: 'Создание...',
    },
    cardio: {
      label: 'Это была кардио-тренировка',
      question: 'Было кардио?',
    },
    notes: {
      title: 'Заметки',
      placeholder: 'Заметки к тренировке...',
      saving: 'Сохранение...',
      detailedPlaceholder: 'Как себя чувствовали, что получилось, над чем надо поработать',
    },
  },

  // Exercise card
  exercise: {
    lastWeight: 'Последний рабочий вес',
    enterNameToSeeResult: 'Введите название, чтобы увидеть прошлый результат',
    searchingLastResult: 'Поиск последнего результата…',
    loadError: 'Не удалось загрузить данные',
    noDataBeforeDate: 'До этой даты нет данных по этому упражнению',
    sets: 'Подходы',
    set: 'Подход',
    reps: 'Повторы',
    weight: 'Вес (кг)',
    toFailure: 'В отказ',
    deleteExercise: 'Удалить упражнение?',
    deleteExerciseDesc: 'Вы собираетесь удалить упражнение "{name}". Действие необратимо.',
    deleteExerciseDescNoName: 'Вы собираетесь удалить упражнение. Действие необратимо.',
    errors: {
      failedToChangeSets: 'Не удалось изменить количество подходов',
      failedToDeleteSets: 'Не удалось удалить подходы упражнения. Попробуйте снова.',
      failedToDeleteExercise: 'Не удалось удалить упражнение. Попробуйте снова.',
      failedToAddDropset: 'Не удалось добавить дропсет',
      failedToDeleteDropset: 'Не удалось удалить дропсет',
    },
  },

  // Templates page
  templates: {
    title: 'Шаблоны',
    loading: 'Загрузка шаблонов...',
    empty: 'У вас еще нет шаблонов. Создайте первый!',
    share: 'Поделиться',
    delete: 'Удалить',
    deleting: 'Удаление...',
    deleteConfirm: 'Удалить шаблон?',
    deleteConfirmDesc: 'Шаблон и все его упражнения будут удалены. Действие необратимо.',
    shareTitle: 'Скопировать ссылку, чтобы поделиться шаблоном',
    generatingLink: 'Генерация ссылки...',
    emptyTemplateError: 'Этот шаблон пуст. Добавьте упражнения перед тем, как делиться.',
    shareError: 'Не удалось сгенерировать ссылку: ',
    deleteError: 'Не удалось удалить шаблон.',
    copyError: 'Автокопирование не сработало. Скопируйте ссылку вручную: долгий тап → Копировать.',
    importTemplate: 'Импортировать шаблон',
    menuLabel: 'Меню шаблона',
  },

  // Template editor page
  templateEditor: {
    newTemplate: 'Новый шаблон',
    editTemplate: 'Редактировать шаблон',
    dayName: 'Название дня',
    dayNamePlaceholder: 'Например, Push Day',
    exercises: 'Упражнения',
    exercisePlaceholder: 'Название упражнения',
    setsLabel: 'Подходы',
    repsLabel: 'Повторы',
    restLabel: 'Отдых (сек)',
    addExercise: '+ Добавить упражнение',
    saveTemplate: 'Сохранить шаблон',
    saving: 'Сохранение...',
    loading: 'Загрузка редактора...',
    backToTemplates: 'Назад к шаблонам',
    deleteExercise: 'Удалить упражнение?',
    deleteExerciseDesc: 'Это упражнение будет удалено из шаблона. Действие необратимо.',
    errors: {
      mustBeLoggedIn: 'You must be logged in to save a template.',
      repsFormatError: 'Не удалось сохранить диапазон повторений (например, "10-12"). Пожалуйста, убедитесь, что схема вашей базы данных обновлена.',
      saveError: 'Ошибка сохранения: ',
    },
  },

  // Profile page
  profile: {
    title: 'Профиль',
    loggedInAs: 'Вы вошли как:',
    viewProgress: 'Узнать прогресс',
    bodyWeightTracker: 'Трекер веса тела',
    settings: 'Настройки',
    logout: 'Выйти',
    menu: 'Меню',
    import: 'Импорт',
    export: 'Экспорт',
    dataAndAccount: 'Данные и аккаунт',
    workouts: 'Тренировки',
    importingWorkouts: 'Импорт тренировок...',
    importingTemplates: 'Импорт шаблонов...',
    exportingWorkouts: 'Экспорт тренировок...',
    exportingTemplates: 'Экспорт шаблонов...',
    cleanData: 'Очистить данные',
    deleteAccount: 'Удалить аккаунт',
    deletingAccount: 'Удаление...',
    deleteAccountConfirm: 'Удалить аккаунт и все данные?',
    deleteAccountDesc: 'Это действие необратимо и удалит все ваши данные.',
    deleteAccountBtn: 'Удалить аккаунт',
    emailConfirmation: 'Для подтверждения введите ваш e-mail: ',
    emailPlaceholder: 'Введите ваш e-mail',
    emailMismatch: 'Введённый e-mail не совпадает с вашим.',
    accountDeleted: 'Ваш аккаунт и все данные были успешно удалены.',
    deleteAccountError: 'Не удалось удалить аккаунт: ',
    importSuccess: 'Импорт тренировок завершён. Откройте календарь, чтобы посмотреть тренировки.',
  },

  // Settings
  settings: {
    title: 'Настройки',
    timerStep: 'Шаг таймера отдыха (секунды)',
    timerStepDesc: 'Значение, на которое изменяется таймер при нажатии +/-',
    theme: 'Тема оформления',
    themeDark: 'Тёмная',
    themeLight: 'Светлая',
    themeAuto: 'Авто',
    language: 'Язык',
    languageRu: 'Русский',
    languageEn: 'English',
    saving: 'Сохранение...',
    saved: 'Сохранено',
  },

  // Progress page
  progress: {
    title: 'Прогресс',
    loading: 'Загрузка упражнений...',
    cardio: 'Кардио',
    exercises: 'Упражнения',
    search: 'Поиск',
    noData: 'Нет данных для отображения',
    noDataHint: 'Выполните несколько тренировок с записанным весом',
    notFound: 'Упражнения не найдены',
    notFoundHint: 'Попробуйте изменить запрос',
    totalSets: 'Выполнено подходов: ',
    period: {
      all: 'Все данные',
      threeMonths: 'Последние 3 мес',
      sixMonths: 'Последние 6 мес',
      oneYear: 'Последний год',
      custom: 'Произвольный период',
    },
    stats: {
      sessions: 'Тренировок',
      maxWeight: 'Макс. вес',
      minWeight: 'Мин. вес',
      growth: 'Рост веса',
    },
    from: 'От',
    to: 'До',
    history: 'История',
  },

  // Cardio progress
  cardio: {
    loading: 'Загрузка кардио...',
    weeklyGoal: 'Цель на неделю',
    workoutsPerWeek: '{count} в неделю',
    monthlyStats: 'Статистика по месяцам',
    thisMonth: 'В этом месяце',
    totalCardio: 'Всего кардио',
    weeklyProgress: 'Прогресс по неделям',
    selectMonth: 'Выберите месяц',
    noDataForMonth: 'Нет данных за этот месяц',
    infoTitle: 'Как это работает?',
    infoDesc: 'Отметьте тренировку как кардио на странице тренировки, чтобы она учитывалась в статистике.',
    months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    monthsShort: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    // Cardio info modal
    aboutCardio: 'О кардио тренировках',
    whatIsCardio: 'Что такое кардио?',
    whatIsCardioDesc: 'Аэробные нагрузки, укрепляющие сердечно-сосудистую систему и улучшающие выносливость.',
    howOften: 'Сколько делать?',
    howOftenItems: [
      '2-3 раза в неделю — минимум для здоровья',
      '3-5 раз — оптимально для похудения',
      '20-40 минут за сессию',
    ],
    targetHeartRate: 'Целевой пульс',
    targetHeartRateDesc: '130-140 уд/мин — зона жиросжигания. Вы должны мочь говорить, но с усилием.',
    cardioTypes: 'Виды кардио',
    cardioTypesItems: [
      { name: 'Stair Master', desc: 'имитация подъёма по лестнице' },
      { name: 'Эллипсоид', desc: 'щадящая нагрузка на суставы' },
      { name: 'Велотренажёр', desc: 'подходит для начинающих' },
      { name: 'Беговая дорожка', desc: 'быстрая ходьба' },
    ],
    benefits: 'Плюсы',
    benefitsItems: [
      'Укрепляет сердце и сосуды',
      'Ускоряет метаболизм',
      'Снижает уровень стресса',
      'Улучшает качество сна',
    ],
    whenToDo: 'Когда делать?',
    whenToDoItems: [
      'После силовой тренировки (20-30 мин)',
      'В отдельный день (40-60 мин)',
      'Утром натощак — для продвинутых',
    ],
    warning: 'Предупреждение',
    warningText: 'При проблемах с сердцем, суставами или давлением — проконсультируйтесь с врачом перед началом кардио тренировок.',
  },

  // Body weight tracker
  bodyWeight: {
    title: 'Трекер веса тела',
    addWeight: 'Добавить вес',
    date: 'Дата',
    weight: 'Вес (кг)',
    save: 'Сохранить',
    saving: 'Сохранение...',
    delete: 'Удалить',
    deleting: 'Удаление...',
    noData: 'Нет записей о весе',
    addFirstWeight: 'Добавьте первую запись',
    stats: {
      current: 'Текущий',
      min: 'Минимум',
      max: 'Максимум',
      change: 'Изменение',
    },
    deleteConfirm: 'Удалить запись?',
    deleteConfirmDesc: 'Запись о весе будет удалена.',
    chart: 'График',
    history: 'История',
  },

  // Data cleanup
  cleanup: {
    title: 'Очистка данных',
    selectWorkouts: 'Выберите тренировки для удаления',
    selectTemplates: 'Выберите шаблоны для удаления',
    deleteWorkouts: 'Удалить тренировки',
    deleteTemplates: 'Удалить шаблоны',
    loading: 'Загрузка...',
    selectAll: 'Выбрать все',
    clearSelection: 'Снять выбор',
    selected: 'Выбрано: ',
    deleteSelected: 'Удалить выбранное',
    noWorkouts: 'Нет тренировок для удаления',
    noTemplates: 'Нет шаблонов для удаления',
  },

  // Dialogs & confirmations
  dialogs: {
    templateSaved: 'Шаблон сохранён',
    linkCopied: 'Ссылка скопирована',
  },

  // Pluralization
  pluralize: {
    workouts: ['тренировка', 'тренировки', 'тренировок'],
    exercises: ['упражнение', 'упражнения', 'упражнений'],
    sets: ['подход', 'подхода', 'подходов'],
    reps: ['повторение', 'повторения', 'повторений'],
  },

  // Rest timer
  timer: {
    title: 'Отдых',
    start: 'Старт',
    stop: 'Стоп',
    pause: 'Пауза',
    reset: 'Сброс',
  },

  // Workout actions menu
  workoutActions: {
    reorderExercises: 'Поменять порядок упражнений',
    changeWorkout: 'Изменить тренировку',
    delete: 'Удалить',
  },

  // Icon picker
  iconPicker: {
    title: 'Иконка дня',
    none: 'Нет',
    icons: {
      upper: 'Верх',
      lower: 'Низ',
      push: 'Push',
      pull: 'Pull',
      legs: 'Ноги',
      arms: 'Руки',
      shoulders: 'Плечи',
      chest: 'Грудь',
      back: 'Спина',
      core: 'Пресс',
      cardio: 'Кардио',
      full: 'Всё тело',
    },
  },

  // Months
  months: {
    long: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    short: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  },

  // Workout header
  workoutHeader: {
    date: 'Дата',
  },

  // Exercise history page
  exerciseHistory: {
    title: 'История упражнений',
    searchPlaceholder: 'Поиск',
    searchAriaLabel: 'Поиск упражнений',
    searching: 'Поиск...',
    notFound: 'Упражнения не найдены',
    notFoundHint: 'Попробуйте изменить запрос',
    emptyTitle: 'Начните вводить название упражнения',
    emptyHint: 'Вы увидите историю всех тренировок с этим упражнением',
    set: 'Подход',
    drop: 'Дроп',
    weight: 'Вес',
    reps: 'Повторы',
    noSetsData: 'Нет данных о подходах',
  },

  // Template import page
  templateImport: {
    title: 'Импорт шаблона',
    loginRequired: 'Войдите, чтобы импортировать шаблоны',
    login: 'Войти',
    checkingClipboard: 'Проверка буфера обмена...',
    invalidLink: 'Неверный формат ссылки на шаблон',
    loadError: 'Не удалось загрузить шаблон из ссылки',
    clipboardNoAccess: 'Clipboard API недоступен в этом окружении',
    clipboardInvalidLink: 'В буфере обмена ссылка неверного формата',
    clipboardNoLink: 'В буфере обмена нет ссылки на шаблон. Скопируйте ссылку и попробуйте снова.',
    clipboardPermissionDenied: 'Нет доступа к буферу обмена. Вставьте ссылку вручную.',
    clipboardReadError: 'Не удалось прочитать буфер обмена: ',
    checkExistingError: 'Не удалось проверить существующие шаблоны перед импортом. Попробуйте ещё раз.',
    duplicateExists: 'Такой шаблон уже есть в списке. Импорт по ссылке отменён.',
    createError: 'Не удалось создать шаблон',
    importSuccess: 'Шаблон "{name}" успешно импортирован!',
    importError: 'Не удалось импортировать шаблон: ',
    replaceError: 'Не удалось заменить существующий шаблон. Попробуйте ещё раз.',
    createNewError: 'Не удалось создать новый шаблон. Попробуйте ещё раз.',
    pastePrompt: 'Вставьте ссылку на шаблон из буфера обмена',
    invalidPastedLink: 'Вставленный текст не является валидной ссылкой на шаблон',
    extractError: 'Не удалось извлечь шаблон из ссылки',
    exercisesCount: 'Упражнений',
    exercisesList: 'Упражнения:',
    setsReps: '{sets} подходов × {reps} повторов • Отдых: {rest}с',
    importing: 'Импорт...',
    addTemplate: 'Добавить шаблон',
    cancel: 'Отменить',
    copyLinkHint: 'Скопируйте ссылку на шаблон и нажмите кнопку ниже',
    importFromClipboard: 'Импортировать из буфера',
    pasteManually: 'Вставить ссылку вручную',
    checkClipboardAgain: 'Проверить буфер снова',
    conflictTitle: 'Шаблон с таким названием уже существует',
    conflictDesc: 'Текущий шаблон «{name}» отличается от шаблона из ссылки. Проверьте различия и выберите действие.',
    existing: 'Существующий',
    fromLink: 'Из ссылки',
    noName: 'Без названия',
    replacing: 'Замена...',
    replaceExisting: 'Заменить существующий шаблон',
    createNew: 'Создать новый шаблон',
    newTemplateName: 'Новый шаблон',
  },

  // Workout cardio toggle
  workoutCardio: {
    question: 'Было кардио?',
    yes: 'Да',
    no: 'Нет',
  },

  // Workout notes
  workoutNotes: {
    title: 'Заметки',
    saving: 'Сохранение...',
    placeholder: 'Как себя чувствовали, что получилось, над чем надо поработать',
  },

  // Set row
  setRow: {
    dropset: 'ДС',
    addDropset: 'Добавить дропсет',
    deleteDropset: 'Удалить дропсет',
    copyWeight: 'Скопировать вес из предыдущего подхода',
    toFailure: 'Подход в отказ (макс.)',
  },

  // Reorder exercises modal
  reorderExercises: {
    title: 'Порядок упражнений',
    drag: 'Перетащить',
    noName: 'Без названия',
    saving: 'Сохранение…',
  },

  // Workout empty state
  workoutEmptyState: {
    workoutOn: 'Тренировка на {date}',
    selectTemplate: 'Выбрать шаблон',
    createTemplateFirst: 'Сначала создайте шаблон.',
    createTemplate: 'Создать шаблон',
    createCustomDay: 'Создать свой день',
    creating: 'Создание...',
  },

  // Workout template select modal
  workoutTemplateSelect: {
    title: 'Выберите шаблон',
    noTemplates: 'Нет доступных шаблонов.',
    applying: 'Применение...',
  },

  // Workout icon picker modal
  workoutIconPicker: {
    title: 'Выберите иконку',
    none: 'Нет',
  },

  // Template saved dialog
  templateSavedDialog: {
    linkCopied: 'Ссылка на "{name}" скопирована в буфер обмена',
    templateSaved: 'Шаблон сохранен!',
  },

  // Confirm dialog
  confirmDialog: {
    title: 'Подтвердите действие',
    confirm: 'Подтвердить',
    executing: 'Выполнение...',
  },

  // Workouts import dialog
  workoutsImport: {
    title: 'Импорт тренировок',
    description: 'Будут импортированы тренировки из файла "{fileName}".',
    warning: 'Тренировки на даты, которые уже есть в календаре и присутствуют в файле, будут удалены и перезаписаны данными из файла. На другие даты тренировки останутся без изменений.',
    importOnlyNewHint: '«Импортировать только новые тренировки» — добавит тренировки только на новые даты, без изменения существующих.',
    importOverwriteHint: '«Импортировать с перезаписью дат» — заменит тренировки на совпадающие даты и добавит новые.',
    exportThenImportHint: '«Экспортировать текущие тренировки и импортировать с перезаписью» — сначала сохранит текущие тренировки в файл, затем выполнит импорт с перезаписью дат.',
    newWorkoutsTitle: 'Новые тренировки из файла (даты, которых ещё нет в календаре):',
    exportingAndImporting: 'Экспортируем текущие тренировки и импортируем новые...',
    importingOnlyNew: 'Импортируем только новые тренировки...',
    importingWorkouts: 'Импортируем тренировки...',
    importOnlyNew: 'Импортировать только новые тренировки (без изменения существующих)',
    importOverwrite: 'Импортировать с перезаписью дат из файла',
    exportThenImport: 'Экспортировать текущие тренировки и импортировать с перезаписью дат',
  },

  // Templates import dialog
  templatesImport: {
    title: 'Импорт шаблонов',
    duplicatesFound: 'В файле найдены шаблоны с именами, которые уже есть в вашем аккаунте.',
    importOnlyNewHint: '«Импортировать только новые шаблоны» — добавит только те, которых ещё нет.',
    overwriteHint: '«Перезаписать существующие шаблоны» — удалит совпадающие и создаст их заново из файла.',
    noName: 'Без названия',
    existsAs: 'Уже есть как: «{name}»',
    noDuplicates: 'Совпадающих шаблонов не найдено.',
    overwriting: 'Перезаписываем существующие шаблоны и импортируем данные...',
    importingOnlyNew: 'Импортируем только новые шаблоны...',
    importOnlyNew: 'Импортировать только новые шаблоны (без изменения существующих)',
    overwriteAndAdd: 'Перезаписать существующие шаблоны и добавить новые',
  },

  // Delete workouts dialog
  deleteWorkouts: {
    title: 'Удалить тренировки',
    description: 'Выберите даты тренировок, которые хотите удалить. Это действие необратимо.',
    selectAll: 'Выбрать все',
    clearSelection: 'Отменить выбранное',
    workout: '1 тренировка',
    workouts: '{count} тренировок',
    noWorkouts: 'Тренировки для удаления не найдены.',
    deleting: 'Удаляем выбранные...',
    deleteSelected: 'Удалить выбранные',
  },

  // Delete templates dialog
  deleteTemplates: {
    title: 'Удалить шаблоны тренировок',
    description: 'Выберите шаблоны тренировок, которые хотите удалить. Это действие необратимо.',
    noTemplates: 'Шаблоны для удаления не найдены.',
    deleting: 'Удаляем выбранные...',
    deleteSelected: 'Удалить выбранные',
  },

  // Clean data dialog
  cleanData: {
    title: 'Очистить данные',
    description: 'Выберите, какие данные вы хотите удалить.',
    loading: 'Загружаем данные...',
    deleteWorkouts: 'Удалить тренировки',
    deleteTemplates: 'Удалить шаблоны тренировок',
  },

  // Hooks messages
  hooks: {
    // Workouts import/export
    noWorkoutsToImport: 'В файле нет тренировок для импорта.',
    importedWorkout: 'Импортированная тренировка',
    failedToCreateWorkout: 'Не удалось создать тренировку при импорте.',
    failedToCreateExercises: 'Не удалось создать упражнения при импорте.',
    failedToLoadWorkouts: 'Не удалось загрузить данные тренировок для экспорта.',
    unexpectedExportError: 'Произошла непредвиденная ошибка при экспорте данных.',
    invalidJsonFile: 'Файл не является корректным JSON.',
    notGymLogExport: 'Файл не похож на экспорт тренировок из GymLog.',
    failedToCheckExisting: 'Не удалось проверить существующие тренировки перед импортом.',
    allWorkoutsExist: 'Все тренировки из файла уже есть в вашем календаре. Новых тренировок нет.',
    importComplete: 'Импорт тренировок завершён. Откройте календарь, чтобы посмотреть тренировки.',
    failedToImport: 'Не удалось импортировать тренировки: ',
    failedToReadFile: 'Не удалось прочитать файл тренировок.',
    newWorkoutsImportComplete: 'Импорт новых тренировок завершён. Откройте календарь, чтобы посмотреть тренировки.',
    failedToImportNew: 'Не удалось импортировать новые тренировки. Попробуйте ещё раз.',
    noNewWorkoutsInFile: 'В файле нет новых тренировок с датами, которых ещё нет в вашем календаре.',
    failedToDetermineNew: 'Не удалось определить новые тренировки для импорта. Проверьте файл.',
    exportThenImportComplete: 'Текущие тренировки сохранены, импорт завершён. Откройте календарь, чтобы посмотреть тренировки.',
    failedExportThenImport: 'Не удалось выполнить экспорт и импорт тренировок. Попробуйте ещё раз.',

    // Templates import/export
    noTemplatesToImport: 'В файле нет шаблонов для импорта.',
    importedTemplate: 'Импортированный шаблон',
    failedToCreateTemplate: 'Не удалось создать шаблон при импорте.',
    failedToLoadTemplates: 'Не удалось загрузить шаблоны для экспорта.',
    unexpectedTemplatesExportError: 'Произошла непредвиденная ошибка при экспорте шаблонов.',
    notGymLogTemplatesExport: 'Файл не похож на экспорт шаблонов из GymLog.',
    failedToCheckExistingTemplates: 'Не удалось проверить существующие шаблоны перед импортом.',
    allTemplatesExist: 'Все шаблоны из файла уже есть в вашем аккаунте. Новых шаблонов нет.',
    templatesImportComplete: 'Импорт шаблонов завершён. Откройте страницу «Шаблоны», чтобы посмотреть их.',
    failedToImportTemplates: 'Не удалось импортировать шаблоны. Попробуйте ещё раз.',
    newTemplatesImportComplete: 'Импорт новых шаблонов завершён. Откройте страницу «Шаблоны», чтобы посмотреть их.',
    failedToImportNewTemplates: 'Не удалось импортировать новые шаблоны. Попробуйте ещё раз.',
    templatesOverwriteComplete: 'Шаблоны успешно импортированы. Совпадающие шаблоны были перезаписаны.',
    failedToOverwriteTemplates: 'Не удалось импортировать шаблоны с перезаписью: ',

    // Data cleanup
    failedToLoadWorkoutsForDeletion: 'Не удалось загрузить список тренировок для удаления.',
    errorLoadingWorkoutsForDeletion: 'Произошла ошибка при загрузке тренировок для удаления.',
    noWorkoutsToDelete: 'У вас нет тренировок для удаления.',
    failedToLoadTemplatesForDeletion: 'Не удалось загрузить список шаблонов для удаления.',
    errorLoadingTemplatesForDeletion: 'Произошла ошибка при загрузке шаблонов для удаления.',
    noTemplatesToDelete: 'У вас нет шаблонов для удаления.',
    noName: 'Без названия',
    workoutsDeletedSuccess: 'Выбранные тренировки успешно удалены.',
    failedToDeleteWorkouts: 'Не удалось удалить выбранные тренировки.',
    templatesDeletedSuccess: 'Выбранные шаблоны тренировок успешно удалены.',
    failedToDeleteTemplates: 'Не удалось удалить выбранные шаблоны тренировок.',

    // Workout operations
    failedToCreateExercise: 'Не удалось создать упражнение',
    failedToCreateSet: 'Не удалось создать подход',
    failedToAddExercise: 'Не удалось добавить упражнение. Попробуйте снова.',
    newWorkout: 'Новая тренировка',
    failedToCreateWorkoutEntry: 'Не удалось создать тренировку',
    failedToCreateWorkoutTryAgain: 'Не удалось создать тренировку. Попробуйте снова.',
    failedToCreateFromTemplate: 'Не удалось создать тренировку: ',
    failedToChangeWorkout: 'Не удалось изменить тренировку: ',
    failedToDeleteWorkout: 'Не удалось удалить тренировку.',
    failedToSaveOrder: 'Не удалось сохранить порядок. Я вернул предыдущие данные.',

    // Workout name editor
    failedToUpdateWorkout: 'Не удалось обновить тренировку',
    failedToSaveChanges: 'Не удалось сохранить изменения. Попробуйте снова.',
    failedToUpdateWorkoutName: 'Не удалось обновить название тренировки',
    failedToSaveName: 'Не удалось сохранить название. Попробуйте снова.',

    // Workout cardio
    failedToUpdateCardio: 'Не удалось обновить статус кардио',
    failedToSaveCardio: 'Не удалось сохранить статус кардио.',

    // Body weight tracker
    enterValidWeight: 'Введите корректный вес (от 0.1 до 500 кг)',
    enterValidDate: 'Введите корректную дату в формате д.мм.гггг (не в будущем)',
    failedToSaveWeight: 'Не удалось сохранить вес',
    failedToDeleteWeight: 'Не удалось удалить запись',

    // Progress
    failedToLoadExercises: 'Не удалось загрузить список упражнений',
    failedToLoadProgress: 'Не удалось загрузить данные прогресса',
  },
};
