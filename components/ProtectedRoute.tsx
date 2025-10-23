import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Fix: Changed props type from `{ children: JSX.Element }` to `{ children: React.ReactElement }`.
// This resolves the "Cannot find namespace 'JSX'" error by using the type from the imported React object
// instead of relying on a global JSX namespace. This likely resolves the cascading type errors in `App.tsx`.
// Fix: Made children optional and updated return to handle TS inference issue.
const ProtectedRoute = ({ children }: { children?: React.ReactElement }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen bg-background text-foreground">
            <p>Загрузка...</p>
        </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ?? null;
};

export default ProtectedRoute;