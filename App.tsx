import React, { Suspense, useEffect } from 'react';
import { HashRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { I18nProvider, getTranslations } from './hooks/use-i18n';
import Layout from './components/Layout';
import { WorkoutLoadingOverlay } from './components/workout-loading-overlay';
import ProtectedRoute from './components/ProtectedRoute';

// Ленивая загрузка страниц для уменьшения начального бандла
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const WorkoutPage = React.lazy(() => import('./pages/WorkoutPage'));
const TemplatesPage = React.lazy(() => import('./pages/TemplatesPage'));
const TemplateEditorPage = React.lazy(() => import('./pages/TemplateEditorPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const TemplateImportPage = React.lazy(() => import('./pages/TemplateImportPage'));
const TemplatesArchivePage = React.lazy(() => import('./pages/TemplatesArchivePage'));
const ExerciseHistoryPage = React.lazy(() => import('./pages/ExerciseHistoryPage'));
const ProgressPage = React.lazy(() => import('./pages/ProgressPage'));

// Лоадеры для страниц - используют getTranslations() для определения языка
const LoginLoader = () => <WorkoutLoadingOverlay message={getTranslations().common.loading} />;
const CalendarLoader = () => <WorkoutLoadingOverlay message={getTranslations().calendar.loading} />;
const WorkoutLoader = () => <WorkoutLoadingOverlay message={getTranslations().workout.loading} />;
const TemplatesLoader = () => <WorkoutLoadingOverlay message={getTranslations().templates.loading} />;
const TemplateEditorLoader = () => <WorkoutLoadingOverlay message={getTranslations().templateEditor.loading} />;
const ProfileLoader = () => <WorkoutLoadingOverlay message={getTranslations().profile.loading} />;
const ProgressLoader = () => <WorkoutLoadingOverlay message={getTranslations().progress.loading} />;
const HistoryLoader = () => <WorkoutLoadingOverlay message={getTranslations().exerciseHistory.loading} />;

const LastWorkoutTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const path = location.pathname;

    if (!path.startsWith('/workout')) {
      try {
        window.localStorage.removeItem('lastWorkoutPath');
        window.localStorage.removeItem('lastWorkoutTimestamp');
      } catch {
      }
    }
  }, [location.pathname]);

  return null;
};

const DefaultRedirect = () => {

    if (typeof window !== 'undefined') {
        const search = window.location.search;
        if (search) {
            const params = new URLSearchParams(search);
            const shareCode = params.get('s');
            if (shareCode) {
                return <Navigate to={`/templates/import?s=${encodeURIComponent(shareCode)}`} replace />;
            }
        }

        const lastWorkoutPath = window.localStorage.getItem('lastWorkoutPath');
        const lastWorkoutTimestamp = window.localStorage.getItem('lastWorkoutTimestamp');

        if (typeof lastWorkoutPath === 'string') {
            const isValidWorkoutPath = /^\/workout\/\d{4}-\d{2}-\d{2}$/.test(lastWorkoutPath);

            if (isValidWorkoutPath && typeof lastWorkoutTimestamp === 'string') {
                const timestamp = Number.parseInt(lastWorkoutTimestamp, 10);
                if (Number.isFinite(timestamp)) {
                    const now = Date.now();
                    const diffMs = now - timestamp;
                    const maxAgeMs = 90 * 60 * 1000;

                    if (diffMs >= 0 && diffMs <= maxAgeMs) {
                        return <Navigate to={lastWorkoutPath} replace />;
                    }
                }
            }
        }
    }

    return <Navigate to="/calendar" replace />;
};

const AppRoutes = () => {
  return (
    <>
      <LastWorkoutTracker />
      <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<LoginLoader />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultRedirect />} />
        <Route
          path="calendar"
          element={
            <Suspense fallback={<CalendarLoader />}>
              <CalendarPage />
            </Suspense>
          }
        />
        <Route
          path="workout/:date"
          element={
            <Suspense fallback={<WorkoutLoader />}>
              <WorkoutPage />
            </Suspense>
          }
        />
        <Route
          path="templates"
          element={
            <Suspense fallback={<TemplatesLoader />}>
              <TemplatesPage />
            </Suspense>
          }
        />
        <Route
          path="templates/archive"
          element={
            <Suspense fallback={<TemplatesLoader />}>
              <TemplatesArchivePage />
            </Suspense>
          }
        />
        <Route
          path="templates/new"
          element={
            <Suspense fallback={<TemplateEditorLoader />}>
              <TemplateEditorPage />
            </Suspense>
          }
        />
        <Route
          path="templates/:id"
          element={
            <Suspense fallback={<TemplateEditorLoader />}>
              <TemplateEditorPage />
            </Suspense>
          }
        />
        <Route
          path="templates/import"
          element={
            <Suspense fallback={<TemplatesLoader />}>
              <TemplateImportPage />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<ProfileLoader />}>
              <ProfilePage />
            </Suspense>
          }
        />
        <Route
          path="exercise-history"
          element={
            <Suspense fallback={<HistoryLoader />}>
              <ExerciseHistoryPage />
            </Suspense>
          }
        />
        <Route
          path="profile/progress"
          element={
            <Suspense fallback={<ProgressLoader />}>
              <ProgressPage />
            </Suspense>
          }
        />
      </Route>
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <HashRouter>
      <I18nProvider>
        <AuthProvider>
          <div style={{ minHeight: '100svh' }}>
            <AppRoutes />
          </div>
        </AuthProvider>
      </I18nProvider>
    </HashRouter>
  );
};

export default App;