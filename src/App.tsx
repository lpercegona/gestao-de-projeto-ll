import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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

import { ProjectRequests } from "@/pages/ProjectRequests";
import { ClientPortal } from "@/pages/ClientPortal";
import { SharedReport } from "@/pages/SharedReport";
import { Preferences } from "@/pages/Preferences";
import { ResetPassword } from "@/pages/ResetPassword";
import { Landing } from "@/pages/Landing";
import { Proposals } from "@/pages/Proposals";
import { PublicProposal } from "@/pages/PublicProposal";
import { Contracts } from "@/pages/Contracts";
import { PublicContract } from "@/pages/PublicContract";
import { EditRequests } from "@/pages/EditRequests";
import { CalendarPage } from "@/pages/CalendarPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
              <Route path="/home" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/portal/:token" element={<ClientPortal />} />
              <Route path="/report/:token" element={<SharedReport />} />
              <Route path="/proposal/:token" element={<PublicProposal />} />
              <Route path="/contract/:token" element={<PublicContract />} />
              
              {/* Dashboard - accessible by all authenticated roles */}
              <Route path="/" element={
                <ProtectedRoute requiredRole="client">
                  <Dashboard />
                </ProtectedRoute>
              } />
              
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
              
              {/* Project Requests - admin only */}
              <Route path="/requests" element={
                <ProtectedRoute requiredRole="admin">
                  <ProjectRequests />
                </ProtectedRoute>
              } />
              
              {/* Proposals - admin only */}
              <Route path="/proposals" element={
                <ProtectedRoute requiredRole="admin">
                  <Proposals />
                </ProtectedRoute>
              } />
              
              {/* Contracts - admin only */}
              <Route path="/contracts" element={
                <ProtectedRoute requiredRole="admin">
                  <Contracts />
                </ProtectedRoute>
              } />
              
              {/* Edit Requests - admin only */}
              <Route path="/edit-requests" element={
                <ProtectedRoute requiredRole="admin">
                  <EditRequests />
                </ProtectedRoute>
              } />
              
              {/* Calendar - accessible by all authenticated users */}
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
              
              {/* Preferences - accessible by all authenticated users */}
              <Route path="/preferences" element={
                <ProtectedRoute>
                  <Preferences />
                </ProtectedRoute>
              } />
              
              {/* Redirects for old routes */}
              <Route path="/profile" element={<Navigate to="/preferences" replace />} />
              <Route path="/settings" element={<Navigate to="/preferences" replace />} />
              
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
