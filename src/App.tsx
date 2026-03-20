import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { GlobalTimerProvider } from "@/contexts/GlobalTimerContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { CollaboratorDashboard } from "@/pages/CollaboratorDashboard";
import { Clients } from "@/pages/Clients";
import { ClientDetail } from "@/pages/ClientDetail";
import { Projects } from "@/pages/Projects";
import { ProjectDetail } from "@/pages/ProjectDetail";
import { Reports } from "@/pages/Reports";
import { Users } from "@/pages/Users";
import { ClientReports } from "@/pages/ClientReports";
import { ClientProjects } from "@/pages/ClientProjects";
import { ClientServices } from "@/pages/ClientServices";

import { ClientPortal } from "@/pages/ClientPortal";
import { SharedReport } from "@/pages/SharedReport";

import { ResetPassword } from "@/pages/ResetPassword";
import { Landing } from "@/pages/Landing";
import { FirstAccess } from "@/pages/FirstAccess";
import { PublicProposal } from "@/pages/PublicProposal";
import { PublicContract } from "@/pages/PublicContract";
import { PublicProfile } from "@/pages/PublicProfile";
import { Services } from "@/pages/Services";
import { CalendarPage } from "@/pages/CalendarPage";
import { DatabaseQueries } from "@/pages/DatabaseQueries";
import { StyleClasses } from "@/pages/StyleClasses";
import { PageConstants } from "@/pages/PageConstants";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

const RootRoute = () => {
  const { user, loading, roleLoading } = useAuth();

  if (loading || (user && roleLoading)) {
    return <div className="min-h-screen bg-muted/40" />;
  }

  if (!user) {
    return <Landing />;
  }

  return (
    <ProtectedRoute requiredRole="client">
      <Dashboard />
    </ProtectedRoute>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <DataProvider>
            <GlobalTimerProvider>
              <Toaster />
              <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/landing" element={<Landing />} />
              <Route path="/home" element={<Navigate to="/landing" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/first-access" element={<FirstAccess />} />
              <Route path="/portal/:token" element={<ClientPortal />} />
              <Route path="/report/:token" element={<SharedReport />} />
              <Route path="/proposal/:token" element={<PublicProposal />} />
              <Route path="/contract/:token" element={<PublicContract />} />
              
              {/* Home: Landing for visitors, dashboard for authenticated users */}
              <Route path="/" element={<RootRoute />} />
              
              {/* Clients - admin only */}
              <Route path="/clients" element={
                <ProtectedRoute requiredRole="admin">
                  <Clients />
                </ProtectedRoute>
              } />
              <Route path="/clients/:clientId" element={
                <ProtectedRoute requiredRole="admin">
                  <ClientDetail />
                </ProtectedRoute>
              } />
              
              {/* Projects - accessible by collaborator and above */}
              <Route path="/projects" element={
                <ProtectedRoute requiredRole="collaborator">
                  <Projects />
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectId" element={
                <ProtectedRoute requiredRole="collaborator">
                  <ProjectDetail />
                </ProtectedRoute>
              } />
              
              {/* Collaborator Dashboard */}
              <Route path="/collaborator-dashboard" element={
                <ProtectedRoute requiredRole="collaborator">
                  <CollaboratorDashboard />
                </ProtectedRoute>
              } />
              
              {/* Reports - admin only */}
              <Route path="/reports" element={
                <ProtectedRoute requiredRole="admin">
                  <Reports />
                </ProtectedRoute>
              } />
              
              {/* Calendar - accessible by all authenticated users */}
              <Route path="/calendar" element={
                <ProtectedRoute requiredRole="client">
                  <CalendarPage />
                </ProtectedRoute>
              } />
              <Route path="/calendar" element={
                <ProtectedRoute requiredRole="client">
                  <CalendarPage />
                </ProtectedRoute>
              } />
              
              {/* Users - admin only */}
              <Route path="/users" element={
                <ProtectedRoute requiredRole="admin">
                  <Users />
                </ProtectedRoute>
              } />

              {/* Serviços, propostas e contratos - admin only */}
              <Route path="/services" element={
                <ProtectedRoute requiredRole="admin">
                  <Services />
                </ProtectedRoute>
              } />
              <Route path="/proposals" element={
                <ProtectedRoute requiredRole="admin">
                  <Services />
                </ProtectedRoute>
              } />
              <Route path="/contracts" element={
                <ProtectedRoute requiredRole="admin">
                  <Services />
                </ProtectedRoute>
              } />
              
              {/* Client routes */}
              <Route path="/client-dashboard" element={
                <Navigate to="/" replace />
              } />
              
              <Route path="/my-reports" element={
                <ProtectedRoute requiredRole="client">
                  <ClientReports />
                </ProtectedRoute>
              } />
              
              <Route path="/my-projects" element={
                <ProtectedRoute requiredRole="client">
                  <ClientProjects />
                </ProtectedRoute>
              } />
              
              <Route path="/my-services" element={
                <ProtectedRoute requiredRole="client">
                  <ClientServices />
                </ProtectedRoute>
              } />
              
              {/* Consultas de banco - master admin only */}
              <Route path="/database-queries" element={
                <ProtectedRoute requiredRole="master_admin">
                  <DatabaseQueries />
                </ProtectedRoute>
              } />
              
              <Route path="/style-classes" element={
                <ProtectedRoute requiredRole="master_admin">
                  <StyleClasses />
                </ProtectedRoute>
              } />

              <Route path="/page-constants" element={
                <ProtectedRoute requiredRole="master_admin">
                  <PageConstants />
                </ProtectedRoute>
              } />

              {/* Redirects for old routes */}
              <Route path="/preferences" element={<Navigate to="/" replace />} />
              <Route path="/profile" element={<Navigate to="/" replace />} />
              <Route path="/settings" element={<Navigate to="/" replace />} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
            </GlobalTimerProvider>
          </DataProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
