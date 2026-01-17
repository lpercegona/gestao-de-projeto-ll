import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Clients } from "@/pages/Clients";
import { Projects } from "@/pages/Projects";
import { ProjectDetail } from "@/pages/ProjectDetail";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";
import { Users } from "@/pages/Users";
import { ClientReports } from "@/pages/ClientReports";
import { ClientProjects } from "@/pages/ClientProjects";
import { ProjectRequests } from "@/pages/ProjectRequests";
import { ClientPortal } from "@/pages/ClientPortal";
import { SharedReport } from "@/pages/SharedReport";
import { Profile } from "@/pages/Profile";
import { ResetPassword } from "@/pages/ResetPassword";
import { Landing } from "@/pages/Landing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <DataProvider>
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
              
              {/* Dashboard - accessible by admin and master_admin only */}
              <Route path="/" element={
                <ProtectedRoute requiredRole="admin">
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              {/* Clients - admin only */}
              <Route path="/clients" element={
                <ProtectedRoute requiredRole="admin">
                  <Clients />
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
              
              {/* Users - admin only */}
              <Route path="/users" element={
                <ProtectedRoute requiredRole="admin">
                  <Users />
                </ProtectedRoute>
              } />
              
              {/* Settings - admin only */}
              <Route path="/settings" element={
                <ProtectedRoute requiredRole="admin">
                  <Settings />
                </ProtectedRoute>
              } />
              
              {/* Client routes */}
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
              
              {/* Profile - accessible by all authenticated users */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
);

export default App;
