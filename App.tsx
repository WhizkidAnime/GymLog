import React, { Suspense, useEffect } from 'react';
import { HashRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
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
const ExerciseHistoryPage = React.lazy(() => import('./pages/ExerciseHistoryPage'));
const ProgressPage = React.lazy(() => import('./pages/ProgressPage'));

// Минимальный fallback для загрузки страницы логина
const PageLoader = () => (
  <WorkoutLoadingOverlay message="Загрузка..." />
);

// Лоадер для маршрутов - центрирован с надписью
const RouteLoader = () => (
  <WorkoutLoadingOverlay message="Загрузка..." />
);

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
          <Suspense fallback={<PageLoader />}>
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
            <Suspense fallback={null}>
              <CalendarPage />
            </Suspense>
          }
        />
        <Route
          path="workout/:date"
          element={
            <Suspense fallback={<RouteLoader />}>
              <WorkoutPage />
            </Suspense>
          }
        />
        <Route
          path="templates"
          element={
            <Suspense fallback={<WorkoutLoadingOverlay message="Загрузка шаблонов..." />}>
              <TemplatesPage />
            </Suspense>
          }
        />
        <Route
          path="templates/new"
          element={
            <Suspense fallback={null}>
              <TemplateEditorPage />
            </Suspense>
          }
        />
        <Route
          path="templates/:id"
          element={
            <Suspense fallback={null}>
              <TemplateEditorPage />
            </Suspense>
          }
        />
        <Route
          path="templates/import"
          element={
            <Suspense fallback={<RouteLoader />}>
              <TemplateImportPage />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<RouteLoader />}>
              <ProfilePage />
            </Suspense>
          }
        />
        <Route
          path="exercise-history"
          element={
            <Suspense fallback={<RouteLoader />}>
              <ExerciseHistoryPage />
            </Suspense>
          }
        />
        <Route
          path="progress"
          element={
            <Suspense fallback={null}>
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
      <AuthProvider>
        <div style={{ minHeight: '100svh' }}>
          <AppRoutes />
        </div>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;