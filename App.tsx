import React from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import CalendarPage from './pages/CalendarPage';
import WorkoutPage from './pages/WorkoutPage';
import TemplatesPage from './pages/TemplatesPage';
import TemplateEditorPage from './pages/TemplateEditorPage';
import ProfilePage from './pages/ProfilePage';
import TemplateImportPage from './pages/TemplateImportPage';
import ExerciseHistoryPage from './pages/ExerciseHistoryPage';
import ProgressPage from './pages/ProgressPage';

// const DefaultRedirect = () => {
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
    }
    return <Navigate to="/calendar" replace />;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<DefaultRedirect />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="workout/:date" element={<WorkoutPage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="templates/new" element={<TemplateEditorPage />} />
                <Route path="templates/:id" element={<TemplateEditorPage />} />
                <Route path="templates/import" element={<TemplateImportPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="exercise-history" element={<ExerciseHistoryPage />} />
                <Route path="progress" element={<ProgressPage />} />
            </Route>
        </Routes>
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