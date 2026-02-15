import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Palette, User, Bell } from 'lucide-react';
import { UserManagementTab } from '@/components/settings/UserManagementTab';
import { PlatformCustomizationTab } from '@/components/settings/PlatformCustomizationTab';
import { ProfileEditTab } from '@/components/settings/ProfileEditTab';
import { NotificationTemplatesTab } from '@/components/settings/NotificationTemplatesTab';

export const Preferences: React.FC = () => {
  const { isMasterAdmin, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const showUserManagement = isMasterAdmin || isAdmin;
  const showPlatformCustomization = isMasterAdmin || isAdmin;
  const showNotifications = isMasterAdmin || isAdmin;

  if (!showUserManagement && !showPlatformCustomization && !showNotifications) {
    return (
      <div className="space-y-6">
        <ProfileEditTab />
      </div>
    );
  }

  const tabCount = 1 + (showPlatformCustomization ? 1 : 0) + (showUserManagement ? 1 : 0) + (showNotifications ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Configurações" 
        description="Gerencie usuários, personalize a plataforma e edite seu perfil"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full grid-cols-${tabCount}`}>
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Edição do Perfil</span>
            <span className="sm:hidden">Perfil</span>
          </TabsTrigger>
          {showPlatformCustomization && (
            <TabsTrigger value="platform" className="flex items-center gap-1.5">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Personalização</span>
              <span className="sm:hidden">Tema</span>
            </TabsTrigger>
          )}
          {showUserManagement && (
            <TabsTrigger value="users" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Gestão de Usuários</span>
              <span className="sm:hidden">Usuários</span>
            </TabsTrigger>
          )}
          {showNotifications && (
            <TabsTrigger value="notifications" className="flex items-center gap-1.5">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notificações</span>
              <span className="sm:hidden">Emails</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileEditTab />
        </TabsContent>

        {showPlatformCustomization && (
          <TabsContent value="platform">
            <PlatformCustomizationTab />
          </TabsContent>
        )}

        {showUserManagement && (
          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>
        )}

        {showNotifications && (
          <TabsContent value="notifications">
            <NotificationTemplatesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
