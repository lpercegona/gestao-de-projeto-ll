import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import simboloOras from '@/assets/simbolo-oras.svg';
import { AppLayout } from './AppLayout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'master_admin' | 'admin' | 'collaborator' | 'client';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading, roleLoading, isMasterAdmin, isAdmin, isCollaborator, isClient } = useAuth();

  // Show loading while checking authentication
  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <img
          src={simboloOras}
          alt="Carregando ORAS"
          className="w-12 h-12 animate-spin [animation-duration:3s]"
        />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role access
  if (requiredRole) {
    let hasAccess = false;

    switch (requiredRole) {
      case 'master_admin':
        hasAccess = isMasterAdmin;
        break;
      case 'admin':
        // Admin routes accessible by master_admin and admin
        hasAccess = isMasterAdmin || isAdmin;
        break;
      case 'collaborator':
        // Collaborator routes accessible by master_admin, admin, and collaborator
        hasAccess = isMasterAdmin || isAdmin || isCollaborator;
        break;
      case 'client':
        // Client routes accessible by all roles
        hasAccess = isMasterAdmin || isAdmin || isCollaborator || isClient;
        break;
    }

    if (!hasAccess) {
      // Redirect based on role
      if (isClient) {
        return <Navigate to="/" replace />;
      }
      if (isCollaborator) {
        return <Navigate to="/projects" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return <AppLayout>{children}</AppLayout>;
};
