import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Palette, User } from 'lucide-react';
import { UserManagementTab } from '@/components/settings/UserManagementTab';
import { PlatformCustomizationTab } from '@/components/settings/PlatformCustomizationTab';
import { ProfileEditTab } from '@/components/settings/ProfileEditTab';

export const Preferences: React.FC = () => {
  const { isMasterAdmin, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Determine which tabs are available based on role
  const showUserManagement = isMasterAdmin || isAdmin;
  const showPlatformCustomization = isMasterAdmin || isAdmin;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Configurações" 
        description="Gerencie usuários, personalize a plataforma e edite seu perfil"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${showUserManagement && showPlatformCustomization ? 'grid-cols-3' : showUserManagement || showPlatformCustomization ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {showUserManagement && (
            <TabsTrigger value="users" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Gestão de Usuários</span>
              <span className="sm:hidden">Usuários</span>
            </TabsTrigger>
          )}
          {showPlatformCustomization && (
            <TabsTrigger value="platform" className="flex items-center gap-1.5">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Personalização</span>
              <span className="sm:hidden">Tema</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Edição do Perfil</span>
            <span className="sm:hidden">Perfil</span>
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab - Admin only */}
        {showUserManagement && (
          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>
        )}

        {/* Platform Customization Tab - Admin only */}
        {showPlatformCustomization && (
          <TabsContent value="platform">
            <PlatformCustomizationTab />
          </TabsContent>
        )}

        {/* Profile Edit Tab - All users */}
        <TabsContent value="profile">
          <ProfileEditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
