import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'client';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading, userRole, isAdmin, isClient } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If no specific role is required, allow access for any authenticated user
  if (!requiredRole) {
    return <>{children}</>;
  }

  // Check for specific role requirement
  if (requiredRole === 'admin' && !isAdmin) {
    // Redirect clients to their reports page
    if (isClient) {
      return <Navigate to="/my-reports" replace />;
    }
    // Users without role go to login
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'client' && !isClient && !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
