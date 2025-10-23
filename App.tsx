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

const DefaultRedirect = () => {
    const lastPath = typeof window !== 'undefined' ? window.localStorage.getItem('lastPath') : null;
    const target = lastPath && lastPath.startsWith('/') ? lastPath : '/calendar';
    return <Navigate to={target} replace />;
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