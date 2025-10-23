import React from 'react';
import { HashRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import CalendarPage from './pages/CalendarPage';
import WorkoutPage from './pages/WorkoutPage';
import TemplatesPage from './pages/TemplatesPage';
import TemplateEditorPage from './pages/TemplateEditorPage';
import ProfilePage from './pages/ProfilePage';

const DefaultRedirect = () => {
  const lastWorkout = localStorage.getItem('lastWorkoutPath');
  const last = localStorage.getItem('lastPath');
  const target = lastWorkout?.startsWith('/workout')
    ? lastWorkout
    : last && (last.startsWith('/calendar') || last.startsWith('/workout'))
      ? last
      : '/calendar';
  return <Navigate to={target} replace />;
};

const AppRoutes = () => {
    const { session } = useAuth();
    
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
                <Route path="profile" element={<ProfilePage />} />
            </Route>
        </Routes>
    );
};

const App = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <div className="min-h-screen">
          <AppRoutes />
        </div>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;