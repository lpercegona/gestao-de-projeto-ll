import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Globe, User, Lock, Users, Palette, Bell, Loader } from "lucide-react";
import { ProfileEditTab } from "@/components/settings/ProfileEditTab";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { PlatformCustomizationTab } from "@/components/settings/PlatformCustomizationTab";
import { UserManagementTab } from "@/components/settings/UserManagementTab";
import { NotificationTemplatesTab } from "@/components/settings/NotificationTemplatesTab";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { toast } from "sonner";

const WORLD_TIMEZONES = [
  {
    region: "América",
    zones: [
      { value: "America/Sao_Paulo", label: "São Paulo (UTC-3)" },
      { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
      { value: "America/Manaus", label: "Manaus (UTC-4)" },
      { value: "America/Rio_Branco", label: "Rio Branco (UTC-5)" },
      { value: "America/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
      { value: "America/New_York", label: "Nova York (UTC-5)" },
      { value: "America/Chicago", label: "Chicago (UTC-6)" },
      { value: "America/Denver", label: "Denver (UTC-7)" },
      { value: "America/Los_Angeles", label: "Los Angeles (UTC-8)" },
      { value: "America/Anchorage", label: "Anchorage (UTC-9)" },
      { value: "America/Mexico_City", label: "Cidade do México (UTC-6)" },
      { value: "America/Toronto", label: "Toronto (UTC-5)" },
      { value: "America/Vancouver", label: "Vancouver (UTC-8)" },
      { value: "America/Lima", label: "Lima (UTC-5)" },
      { value: "America/Bogota", label: "Bogotá (UTC-5)" },
      { value: "America/Santiago", label: "Santiago (UTC-4)" },
      { value: "America/Caracas", label: "Caracas (UTC-4)" },
    ],
  },
  {
    region: "Europa",
    zones: [
      { value: "Europe/London", label: "Londres (UTC+0)" },
      { value: "Europe/Lisbon", label: "Lisboa (UTC+0)" },
      { value: "Europe/Paris", label: "Paris (UTC+1)" },
      { value: "Europe/Berlin", label: "Berlim (UTC+1)" },
      { value: "Europe/Madrid", label: "Madrid (UTC+1)" },
      { value: "Europe/Rome", label: "Roma (UTC+1)" },
      { value: "Europe/Amsterdam", label: "Amsterdã (UTC+1)" },
      { value: "Europe/Brussels", label: "Bruxelas (UTC+1)" },
      { value: "Europe/Vienna", label: "Viena (UTC+1)" },
      { value: "Europe/Stockholm", label: "Estocolmo (UTC+1)" },
      { value: "Europe/Warsaw", label: "Varsóvia (UTC+1)" },
      { value: "Europe/Athens", label: "Atenas (UTC+2)" },
      { value: "Europe/Helsinki", label: "Helsinque (UTC+2)" },
      { value: "Europe/Kiev", label: "Kiev (UTC+2)" },
      { value: "Europe/Moscow", label: "Moscou (UTC+3)" },
      { value: "Europe/Istanbul", label: "Istambul (UTC+3)" },
    ],
  },
  {
    region: "Ásia",
    zones: [
      { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
      { value: "Asia/Karachi", label: "Karachi (UTC+5)" },
      { value: "Asia/Kolkata", label: "Mumbai/Nova Délhi (UTC+5:30)" },
      { value: "Asia/Dhaka", label: "Daca (UTC+6)" },
      { value: "Asia/Bangkok", label: "Bangkok (UTC+7)" },
      { value: "Asia/Jakarta", label: "Jacarta (UTC+7)" },
      { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh (UTC+7)" },
      { value: "Asia/Singapore", label: "Singapura (UTC+8)" },
      { value: "Asia/Hong_Kong", label: "Hong Kong (UTC+8)" },
      { value: "Asia/Shanghai", label: "Xangai/Pequim (UTC+8)" },
      { value: "Asia/Taipei", label: "Taipei (UTC+8)" },
      { value: "Asia/Seoul", label: "Seul (UTC+9)" },
      { value: "Asia/Tokyo", label: "Tóquio (UTC+9)" },
      { value: "Asia/Jerusalem", label: "Jerusalém (UTC+2)" },
      { value: "Asia/Riyadh", label: "Riade (UTC+3)" },
      { value: "Asia/Tehran", label: "Teerã (UTC+3:30)" },
    ],
  },
  {
    region: "Oceania",
    zones: [
      { value: "Australia/Perth", label: "Perth (UTC+8)" },
      { value: "Australia/Adelaide", label: "Adelaide (UTC+9:30)" },
      { value: "Australia/Brisbane", label: "Brisbane (UTC+10)" },
      { value: "Australia/Sydney", label: "Sydney (UTC+10)" },
      { value: "Australia/Melbourne", label: "Melbourne (UTC+10)" },
      { value: "Pacific/Auckland", label: "Auckland (UTC+12)" },
      { value: "Pacific/Fiji", label: "Fiji (UTC+12)" },
      { value: "Pacific/Honolulu", label: "Honolulu (UTC-10)" },
    ],
  },
  {
    region: "África",
    zones: [
      { value: "Africa/Casablanca", label: "Casablanca (UTC+0)" },
      { value: "Africa/Lagos", label: "Lagos (UTC+1)" },
      { value: "Africa/Cairo", label: "Cairo (UTC+2)" },
      { value: "Africa/Johannesburg", label: "Joanesburgo (UTC+2)" },
      { value: "Africa/Nairobi", label: "Nairóbi (UTC+3)" },
    ],
  },
];

type NavSection = {
  id: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
};

const GeneralSection: React.FC = () => {
  const { user } = useAuth();
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [loading, setLoading] = useState(true);
  const [savingTimezone, setSavingTimezone] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) { setLoading(false); return; }
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("timezone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (prefs?.timezone) setTimezone(prefs.timezone);
      setLoading(false);
    };
    fetchPreferences();
  }, [user]);

  const handleSaveTimezone = async (newTimezone: string) => {
    if (!user) return;
    setSavingTimezone(true);
    setTimezone(newTimezone);
    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, timezone: newTimezone }, { onConflict: "user_id" });
    if (error) toast.error("Erro ao salvar fuso horário.");
    else toast.success("Fuso horário atualizado!");
    setSavingTimezone(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-foreground">Fuso Horário</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Configure seu fuso horário para registro de horas</p>
      </div>
      <div className="max-w-xs">
        <Label htmlFor="timezone" className="text-xs">Fuso Horário</Label>
        <Select value={timezone} onValueChange={handleSaveTimezone} disabled={savingTimezone}>
          <SelectTrigger id="timezone" className="mt-1 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {WORLD_TIMEZONES.map((group) => (
              <SelectGroup key={group.region}>
                <SelectLabel className="text-xs">{group.region}</SelectLabel>
                {group.zones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value} className="text-xs">
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const { isMasterAdmin, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState("general");

  const showAdminSections = isMasterAdmin || isAdmin;

  const navSections: NavSection[] = [
    { id: "general", label: "Geral", icon: Globe },
    { id: "profile", label: "Perfil", icon: User },
    { id: "security", label: "Segurança", icon: Lock },
    ...(showAdminSections
      ? [
          { id: "users", label: "Usuários", icon: Users, adminOnly: true },
          { id: "platform", label: "Personalização", icon: Palette, adminOnly: true },
          { id: "notifications", label: "Notificações", icon: Bell, adminOnly: true },
        ]
      : []),
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return <GeneralSection />;
      case "profile":
        return <ProfileEditTab />;
      case "security":
        return <SecuritySection />;
      case "users":
        return showAdminSections ? <UserManagementTab /> : null;
      case "platform":
        return showAdminSections ? <ThemeSettings /> : null;
      case "notifications":
        return showAdminSections ? <NotificationTemplatesTab /> : null;
      default:
        return <GeneralSection />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] max-h-[95vh] max-w-[768px] m-2 p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Configurações</DialogTitle>
        <div className="flex flex-col sm:flex-row h-full overflow-hidden">
          {/* Mobile: horizontal scroll nav */}
          <nav className="flex sm:hidden flex-shrink-0 border-r border-border bg-muted/30 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 px-2 py-2 min-w-max">
              {navSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border border-transparent transition-colors whitespace-nowrap",
                    activeSection === section.id
                      ? "bg-background text-foreground border-border"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  )}
                >
                  <section.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {section.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Desktop: vertical sidebar */}
          <nav className="hidden sm:block w-[180px] flex-shrink-0 border-r border-border bg-muted/30 p-3 space-y-0.5 overflow-y-auto">
            <h2 className="text-xs font-semibold text-foreground mb-2 px-2">Configurações</h2>
            {navSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium border border-transparent transition-colors text-left",
                  activeSection === section.id
                    ? "bg-background text-foreground border-border"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                <section.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {section.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <header className="h-6 flex-shrink-0 hidden sm:block" />
            <main className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto">{renderContent()}</main>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
