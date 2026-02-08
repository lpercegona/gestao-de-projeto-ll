import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  FolderKanban,
  FileBarChart,
  FileText,
  Users,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Share2,
  Eye,
  Search,
  FolderPlus,
  XCircle,
  FileSignature,
  Pencil,
  Plus,
  UserPlus,
  Mail,
  Trash2,
  CalendarIcon,
  MoreVertical,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { WysiwygEditor, WysiwygContent } from '@/components/ui/wysiwyg-editor';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { UserEditDialog } from '@/components/users/UserEditDialog';
import { UserCreateDialog } from '@/components/users/UserCreateDialog';
import { formatHours } from '@/lib/formatHours';
import { ReportShareDialog, ReportShare } from '@/components/reports/ReportShareDialog';
import { ClientLogoUpload } from '@/components/client/ClientLogoUpload';
import { ClientCustomFieldsSection } from '@/components/client/ClientCustomFieldsSection';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Project } from '@/types';

interface ProjectRequest {
  id: string;
  client_id: string;
  title: string;
  briefing: string;
  status: string;
  admin_notes: string | null;
  converted_project_id: string | null;
  created_at: string;
  updated_at: string;
}


interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  client_id?: string | null;
}

interface ClientUser {
  id: string;
  client_id: string;
  user_id: string;
  is_primary: boolean;
  profile?: UserProfile;
}

interface Contract {
  id: string;
  title: string;
  status: string;
  contractor_name: string;
  contractor_email: string;
  total_value: number | null;
  total_hours: number | null;
  created_at: string;
  signed_at: string | null;
  share_token: string;
}

export const ClientDetail: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user, isAdminOrMaster } = useAuth();
  const { data, loading, getClientHours, getClientMonthlyHours, getClientPreviousMonthOverflow, getProjectHours, getTaskHours, updateClient, updateProject, deleteProject } = useData();

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [inlineNotes, setInlineNotes] = useState('');
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  
  // Reports state
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [reportShare, setReportShare] = useState<ReportShare | null>(null);

  // Project management state
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    description: '',
    status: 'active',
  });
  
  // Contracts state
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  
  // Edit client state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    contracted_hours: 0,
    pipeline_status: 'lead',
    source: '',
    notes: '',
    logo_url: '',
    contract_type: 'one_time' as 'one_time' | 'monthly',
    contract_start_date: null as string | null,
    contract_end_date: null as string | null,
    contract_months: 1 as number | null,
  });

  // Client user management state
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUserData, setEditingUserData] = useState<UserProfile | null>(null);
  const [newClientUserEmail, setNewClientUserEmail] = useState('');
  const [newClientUserName, setNewClientUserName] = useState('');
  
  // Collaborator management
  const [allCollaborators, setAllCollaborators] = useState<UserProfile[]>([]);
  const [isAddCollaboratorDialogOpen, setIsAddCollaboratorDialogOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>('');
  const [isCreateCollaboratorDialogOpen, setIsCreateCollaboratorDialogOpen] = useState(false);

  const client = data.clients.find(c => c.id === clientId);
  const clientProjects = data.projects.filter(p => p.client_id === clientId);
  const usedHours = clientId ? getClientHours(clientId) : 0;
  const monthlyUsedHours = clientId ? getClientMonthlyHours(clientId) : 0;
  const isMonthly = client?.contract_type === 'monthly';
  const previousOverflow = clientId && isMonthly ? getClientPreviousMonthOverflow(clientId) : 0;
  const availableHours = isMonthly ? Math.max(0, (client?.contracted_hours || 0) - previousOverflow) : (client?.contracted_hours || 0);
  const displayedHours = isMonthly ? monthlyUsedHours : usedHours;

  // Fetch client requests
  useEffect(() => {
    const fetchRequests = async () => {
      if (!clientId) return;
      setRequestsLoading(true);
      try {
        const { data: requestsData } = await supabase
          .from('project_requests')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        setRequests(requestsData || []);
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setRequestsLoading(false);
      }
    };

    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [clientId, activeTab]);

  // Fetch contracts
  useEffect(() => {
    const fetchContracts = async () => {
      if (!clientId) return;
      setContractsLoading(true);
      try {
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        setContracts(contractsData || []);
      } catch (error) {
        console.error('Error fetching contracts:', error);
      } finally {
        setContractsLoading(false);
      }
    };

    if (activeTab === 'contracts') {
      fetchContracts();
    }
  }, [clientId, activeTab]);

  // Fetch team members (collaborators assigned to client's projects + client users)
  useEffect(() => {
    const fetchTeam = async () => {
      if (!clientId || !client) return;
      setTeamLoading(true);
      try {
        // Get project IDs for this client
        const projectIds = clientProjects.map(p => p.id);
        
        let userIds: string[] = [];
        
        // Only fetch user_project_access if there are projects
        if (projectIds.length > 0) {
          const { data: accessData } = await supabase
            .from('user_project_access')
            .select('user_id')
            .in('project_id', projectIds);
          
          userIds = [...new Set((accessData || []).map(a => a.user_id))];
        }
        
        // Fetch profiles for all users
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email');
        
        // Fetch roles for all users
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role');
        
        // Fetch client users from client_users table
        const { data: clientUsersData } = await supabase
          .from('client_users')
          .select('*')
          .eq('client_id', clientId)
          .order('is_primary', { ascending: false });
        
        // Map client users with their profiles
        const mappedClientUsers: ClientUser[] = (clientUsersData || []).map(cu => {
          const profile = (profilesData || []).find(p => p.user_id === cu.user_id);
          const role = (rolesData || []).find(r => r.user_id === cu.user_id);
          return {
            ...cu,
            profile: {
              user_id: cu.user_id,
              full_name: profile?.full_name || null,
              email: profile?.email || null,
              role: role?.role || null,
              client_id: cu.client_id,
            }
          };
        });
        setClientUsers(mappedClientUsers);
        
        // Get user IDs that are client users
        const clientUserIds = mappedClientUsers.map(cu => cu.user_id);
        
        // Filter collaborators (exclude client users from team members)
        const collaboratorUserIds = userIds.filter(id => !clientUserIds.includes(id));
        
        const members = collaboratorUserIds.map(userId => {
          const profile = (profilesData || []).find(p => p.user_id === userId);
          const role = (rolesData || []).find(r => r.user_id === userId);
          return {
            user_id: userId,
            full_name: profile?.full_name || null,
            email: profile?.email || null,
            role: role?.role || null,
          };
        });
        
        setTeamMembers(members);
        
        // Get all collaborators for adding to projects
        const collaboratorUsers = (profilesData || []).filter(p => {
          const role = (rolesData || []).find(r => r.user_id === p.user_id);
          return role?.role === 'collaborator' && !userIds.includes(p.user_id);
        }).map(p => {
          const role = (rolesData || []).find(r => r.user_id === p.user_id);
          return {
            user_id: p.user_id,
            full_name: p.full_name,
            email: p.email,
            role: role?.role || null,
          };
        });
        setAllCollaborators(collaboratorUsers);
        
      } catch (error) {
        console.error('Error fetching team:', error);
      } finally {
        setTeamLoading(false);
      }
    };

    if (activeTab === 'team' && client) {
      fetchTeam();
    }
  }, [clientId, activeTab, clientProjects.length, client?.email]);

  // Fetch report share
  useEffect(() => {
    const fetchShare = async () => {
      if (!clientId) return;
      const { data: shareData } = await supabase
        .from('report_shares')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      setReportShare(shareData);
    };
    
    if (activeTab === 'reports') {
      fetchShare();
    }
  }, [clientId, activeTab]);

  // Generate month options
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
    return options;
  }, []);

  // Calculate hours for a specific month
  const getMonthHours = (taskId: string, monthStart: Date, monthEnd: Date, entryType?: 'task' | 'meeting') => {
    return data.timeEntries
      .filter(te => {
        if (te.task_id !== taskId) return false;
        if (entryType && te.entry_type !== entryType) return false;
        const entryDate = parseISO(te.date);
        return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, te) => sum + Number(te.hours), 0);
  };

  // Report data for selected month
  const reportData = useMemo(() => {
    if (!clientId) return { projects: [], totalHours: 0, taskHours: 0, meetingHours: 0 };
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const projectsWithData = clientProjects.map(project => {
      const projectTasks = data.tasks.filter(t => t.project_id === project.id);
      
      const tasksWithHours = projectTasks.map(task => {
        const monthHours = getMonthHours(task.id, monthStart, monthEnd);
        const taskHours = getMonthHours(task.id, monthStart, monthEnd, 'task');
        const meetingHours = getMonthHours(task.id, monthStart, monthEnd, 'meeting');
        const totalHours = getTaskHours(task.id);
        
        return {
          ...task,
          monthHours,
          monthTaskHours: taskHours,
          monthMeetingHours: meetingHours,
          totalHours,
        };
      }).filter(t => t.monthHours > 0);

      const projectMonthHours = tasksWithHours.reduce((sum, t) => sum + t.monthHours, 0);
      const projectTaskHours = tasksWithHours.reduce((sum, t) => sum + t.monthTaskHours, 0);
      const projectMeetingHours = tasksWithHours.reduce((sum, t) => sum + t.monthMeetingHours, 0);

      return {
        ...project,
        tasks: tasksWithHours,
        monthHours: projectMonthHours,
        taskHours: projectTaskHours,
        meetingHours: projectMeetingHours,
        totalHours: getProjectHours(project.id),
      };
    }).filter(p => p.monthHours > 0);

    return {
      projects: projectsWithData,
      totalHours: projectsWithData.reduce((sum, p) => sum + p.monthHours, 0),
      taskHours: projectsWithData.reduce((sum, p) => sum + p.taskHours, 0),
      meetingHours: projectsWithData.reduce((sum, p) => sum + p.meetingHours, 0),
    };
  }, [clientId, selectedMonth, clientProjects, data.tasks, data.timeEntries, getTaskHours, getProjectHours]);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleOpenProjectEdit = (project: Project) => {
    setEditingProject(project);
    setProjectFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
    });
    setIsProjectDialogOpen(true);
  };

  const handleSaveProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProject) return;

    setProjectSubmitting(true);
    const updated = await updateProject(editingProject.id, {
      name: projectFormData.name.trim(),
      description: projectFormData.description.trim() || null,
      status: projectFormData.status,
    });

    if (updated) {
      toast.success('Projeto atualizado com sucesso.');
      setIsProjectDialogOpen(false);
      setEditingProject(null);
    } else {
      toast.error('Não foi possível atualizar o projeto.');
    }

    setProjectSubmitting(false);
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;

    setProjectSubmitting(true);
    const deleted = await deleteProject(deletingProject.id);

    if (deleted) {
      toast.success('Projeto excluído com sucesso.');
      setIsDeleteProjectDialogOpen(false);
      setDeletingProject(null);
    } else {
      toast.error('Não foi possível excluir o projeto.');
    }

    setProjectSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Aguardando</Badge>;
      case 'in_review':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Em análise</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      case 'converted':
        return <Badge variant="default">Convertido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProjectStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'paused':
        return 'Pausado';
      case 'completed':
        return 'Concluído';
      case 'archived':
        return 'Arquivado';
      default:
        return status;
    }
  };

  const getProjectStatusClasses = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'archived':
        return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTaskStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'in_progress':
        return 'Em andamento';
      case 'completed':
        return 'Concluída';
      case 'paused':
        return 'Pausada';
      default:
        return status;
    }
  };

  const getTaskStatusClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'master_admin':
        return <Badge variant="default">Master Admin</Badge>;
      case 'admin':
        return <Badge variant="secondary">Admin</Badge>;
      case 'collaborator':
        return <Badge variant="outline">Colaborador</Badge>;
      case 'client':
        return <Badge variant="outline">Cliente</Badge>;
      default:
        return <Badge variant="outline">Sem função</Badge>;
    }
  };

  const progressPercentage = client && availableHours > 0 
    ? Math.min((displayedHours / availableHours) * 100, 100) 
    : 0;

  // Initialize edit form when client data is available
  useEffect(() => {
    if (client) {
      setEditFormData({
        name: client.name || '',
        email: client.email || '',
        company: client.company || '',
        phone: client.phone || '',
        contracted_hours: client.contracted_hours || 0,
        pipeline_status: client.pipeline_status || 'lead',
        source: client.source || '',
        notes: client.notes || '',
        logo_url: (client as any).logo_url || '',
        contract_type: client.contract_type || 'one_time',
        contract_start_date: client.contract_start_date || null,
        contract_end_date: client.contract_end_date || null,
        contract_months: client.contract_months || 1,
      });
    }
  }, [client]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="link" onClick={() => navigate('/clients')}>
          Voltar para clientes
        </Button>
      </div>
    );
  }

  const handleSaveInlineNotes = async () => {
    if (!clientId) return;
    setEditSubmitting(true);
    try {
      await updateClient(clientId, { notes: inlineNotes });
      toast.success('Descrição atualizada!');
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Erro ao atualizar descrição');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setEditSubmitting(true);
    try {
      await updateClient(clientId, editFormData);
      toast.success('Cliente atualizado com sucesso!');
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erro ao atualizar cliente');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Create client user account
  const handleCreateClientUser = async () => {
    if (!clientId || !newClientUserEmail) return;
    setCreatingUser(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('create-client-user', {
        body: { 
          clientId, 
          email: newClientUserEmail.trim(), 
          fullName: newClientUserName.trim() || null,
          isPrimary: clientUsers.length === 0 // First user is primary
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (result.success) {
        if (result.isExisting) {
          toast.success('Usuário existente vinculado ao cliente!');
        } else if (result.temporaryPassword) {
          toast.success(`Usuário criado! Senha temporária: ${result.temporaryPassword}`, {
            duration: 10000,
          });
        } else {
          toast.success('Usuário cliente criado com sucesso!');
        }
        setIsCreateUserDialogOpen(false);
        setNewClientUserEmail('');
        setNewClientUserName('');
        // Refresh team data
        setActiveTab('overview');
        setTimeout(() => setActiveTab('team'), 100);
      } else {
        throw new Error(result.error || 'Erro ao criar usuário');
      }
    } catch (error: any) {
      console.error('Error creating client user:', error);
      toast.error(error?.message || 'Erro ao criar usuário cliente');
    } finally {
      setCreatingUser(false);
    }
  };

  // Remove client user access
  const handleRemoveClientUser = async (clientUserId: string) => {
    try {
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('id', clientUserId);

      if (error) throw error;
      toast.success('Acesso removido com sucesso!');
      // Refresh team data
      setActiveTab('overview');
      setTimeout(() => setActiveTab('team'), 100);
    } catch (error) {
      console.error('Error removing client user:', error);
      toast.error('Erro ao remover acesso');
    }
  };

  // Edit client user profile
  const handleOpenEditUser = (member: UserProfile) => {
    setEditingUserData(member);
    setIsEditUserDialogOpen(true);
  };

  const handleUserSaved = () => {
    // Refresh team data
    setActiveTab('overview');
    setTimeout(() => setActiveTab('team'), 100);
  };

  const handleCollaboratorCreated = () => {
    // Refresh collaborators list
    setActiveTab('overview');
    setTimeout(() => setActiveTab('team'), 100);
  };

  // Add collaborator to client projects
  const handleAddCollaborator = async () => {
    if (!selectedCollaborator || clientProjects.length === 0) return;
    try {
      // Grant access to all client projects
      const insertData = clientProjects.map(project => ({
        user_id: selectedCollaborator,
        project_id: project.id,
        granted_by: user?.id || '',
        can_edit: true,
      }));

      const { error } = await supabase
        .from('user_project_access')
        .upsert(insertData, { onConflict: 'user_id,project_id' });

      if (error) throw error;
      toast.success('Colaborador adicionado aos projetos do cliente!');
      setIsAddCollaboratorDialogOpen(false);
      setSelectedCollaborator('');
      // Refresh team data
      setActiveTab('overview');
      setTimeout(() => setActiveTab('team'), 100);
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast.error('Erro ao adicionar colaborador');
    }
  };

  // Remove collaborator from client projects
  const handleRemoveCollaborator = async (userId: string) => {
    if (clientProjects.length === 0) return;
    try {
      const projectIds = clientProjects.map(p => p.id);
      const { error } = await supabase
        .from('user_project_access')
        .delete()
        .eq('user_id', userId)
        .in('project_id', projectIds);

      if (error) throw error;
      toast.success('Colaborador removido dos projetos do cliente!');
      // Refresh team data
      setActiveTab('overview');
      setTimeout(() => setActiveTab('team'), 100);
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Erro ao remover colaborador');
    }
  };

  const getContractStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Rascunho</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800">Enviado</Badge>;
      case 'viewed':
        return <Badge className="bg-yellow-100 text-yellow-800">Visualizado</Badge>;
      case 'signed':
        return <Badge className="bg-green-100 text-green-800">Assinado</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="link" onClick={() => navigate('/clients')}>
          Voltar para clientes
        </Button>
      </div>
    );
  }

  const getPipelineStatusLabel = (status: string) => {
    switch (status) {
      case 'lead':
        return 'Lead';
      case 'proposal':
        return 'Em Negociação';
      case 'active':
        return 'Ativo';
      case 'churned':
        return 'Inativo';
      default:
        return status;
    }
  };

  const getPipelineStatusBadge = (status: string) => {
    switch (status) {
      case 'lead':
        return <Badge variant="secondary">Lead</Badge>;
      case 'proposal':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Em Negociação</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'churned':
        return <Badge variant="destructive">Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com título e botão de editar */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {client.company || client.name}
            </h1>
            <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Descrição do cliente - modo visualização ou edição */}
        {isEditingNotes ? (
          <div className="space-y-2">
            <WysiwygEditor
              value={inlineNotes}
              onChange={setInlineNotes}
              placeholder="Adicione uma descrição para o cliente..."
              minHeight="80px"
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleSaveInlineNotes}
                disabled={editSubmitting}
              >
                {editSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setIsEditingNotes(false);
                  setInlineNotes(client.notes || '');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="cursor-pointer group"
            onClick={() => {
              setInlineNotes(client.notes || '');
              setIsEditingNotes(true);
            }}
          >
            {client.notes ? (
              <WysiwygContent 
                content={client.notes} 
                className="text-muted-foreground"
              />
            ) : (
              <p className="text-muted-foreground italic text-sm hover:text-foreground transition-colors">
                Clique para adicionar uma descrição...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Seção fixa com informações gerais e dados do cliente */}
      <div className="space-y-4">
        {/* Grid de métricas + barra de progresso */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FolderKanban className="w-4 h-4" />
                <span className="text-sm">Projetos</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{clientProjects.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{isMonthly ? 'Horas do Mês' : 'Horas Usadas'}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatHours(displayedHours)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{isMonthly ? 'Disponível' : 'Horas Contratadas'}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatHours(availableHours)}</p>
              {isMonthly && previousOverflow > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatHours(client.contracted_hours)} - {formatHours(previousOverflow)} saldo
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{isMonthly ? 'Restante do Mês' : 'Disponível'}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatHours(Math.max(availableHours - displayedHours, 0))}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {isMonthly ? `Utilização - ${format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}` : 'Utilização de Horas'}
                </span>
                {isMonthly && (
                  <Badge variant="outline" className="text-xs">Plano Mensal</Badge>
                )}
              </div>
              <span className="font-medium text-foreground">
                {formatHours(displayedHours)} de {formatHours(availableHours)} ({progressPercentage.toFixed(1)}%)
              </span>
            </div>
            
            {/* Saldo Anterior indicator */}
            {isMonthly && previousOverflow > 0 && (
              <div className="mb-3 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  Saldo Anterior: {formatHours(previousOverflow)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Horas excedentes do mês anterior descontadas do limite deste mês ({formatHours(client.contracted_hours)} - {formatHours(previousOverflow)} = {formatHours(availableHours)} disponíveis)
                </p>
              </div>
            )}
            
            <Progress value={progressPercentage} className="h-2" />
            
            <div className="flex items-center justify-between mt-2">
              {isMonthly && (
                <p className="text-xs text-muted-foreground">
                  Total acumulado: {formatHours(usedHours)} desde o início do contrato
                </p>
              )}
              {isMonthly && displayedHours > availableHours && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ {formatHours(displayedHours - availableHours)} serão descontadas do próximo mês
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dados básicos do cliente */}
        <Card>
          <CardContent className="py-4">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
              <div>
                <span className="text-xs text-muted-foreground">Responsável</span>
                <p className="text-sm font-medium text-foreground">{client.name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">E-mail</span>
                <p className="text-sm font-medium text-foreground truncate">{client.email}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Telefone</span>
                <p className="text-sm font-medium text-foreground">{client.phone || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Origem</span>
                <p className="text-sm font-medium text-foreground">{client.source || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="mt-0.5">
                  {getPipelineStatusBadge(client.pipeline_status)}
                </div>
              </div>
              {isMonthly && (
                <div>
                  <span className="text-xs text-muted-foreground">Modelo</span>
                  <p className="text-sm font-medium text-foreground">Plano Mensal</p>
                </div>
              )}
              {client.contract_end_date && (
                <div>
                  <span className="text-xs text-muted-foreground">Contrato vai até</span>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(client.contract_end_date), "MMM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="projects" className="flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4" />
            <span className="hidden sm:inline">Projetos</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-1.5">
            <FileSignature className="w-4 h-4" />
            <span className="hidden sm:inline">Contratos</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5">
            <FileBarChart className="w-4 h-4" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Solicitações</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Equipe</span>
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {clientProjects.length} {clientProjects.length === 1 ? 'projeto' : 'projetos'}
            </h2>
            <Button size="sm" onClick={() => navigate('/projects')}>
              Ver todos os projetos
            </Button>
          </div>

          {clientProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum projeto cadastrado para este cliente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {clientProjects.map((project) => {
                const projectTasks = data.tasks.filter(t => t.project_id === project.id);
                const isExpanded = expandedProjects.has(project.id);

                return (
                  <Card key={project.id} className="relative overflow-hidden">
                    {isAdminOrMaster && (
                      <div className="absolute top-3 right-3 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenProjectEdit(project);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeletingProject(project);
                                setIsDeleteProjectDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    <Collapsible open={isExpanded} onOpenChange={() => toggleProject(project.id)}>
                      <CollapsibleTrigger asChild>
                        <CardContent className="p-4 sm:p-6 pr-14 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <ChevronDown
                              className={`w-5 h-5 mt-0.5 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                <h3 className="font-semibold text-lg text-foreground">{project.name}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full ${getProjectStatusClasses(project.status)}`}>
                                  {getProjectStatusLabel(project.status)}
                                </span>
                              </div>

                              {project.description && (
                                <WysiwygContent
                                  content={project.description}
                                  className="text-sm text-muted-foreground mb-2 line-clamp-1"
                                />
                              )}

                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Tarefas: </span>
                                  <span className="font-medium text-foreground">{projectTasks.length}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Horas: </span>
                                  <span className="font-medium text-foreground">{formatHours(getProjectHours(project.id))}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t px-4 sm:px-6 py-4 bg-muted/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-foreground">Tarefas ({projectTasks.length})</h4>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${project.id}`)}>
                              Ver projeto
                            </Button>
                          </div>

                          {projectTasks.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-3">Nenhuma tarefa neste projeto.</p>
                          ) : (
                            <div className="space-y-3">
                              {projectTasks.map((task) => {
                                const taskEntries = data.timeEntries
                                  .filter((entry) => entry.task_id === task.id)
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                return (
                                  <div key={task.id} className="rounded-md border bg-background p-3 space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">{task.name}</p>
                                        {task.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                                        )}
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className={`text-[10px] px-2 py-1 rounded-full ${getTaskStatusClasses(task.status)}`}>
                                          {getTaskStatusLabel(task.status)}
                                        </span>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {formatHours(getTaskHours(task.id))}
                                        </p>
                                      </div>
                                    </div>

                                    {taskEntries.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">Sem registros de horas.</p>
                                    ) : (
                                      <div className="space-y-1.5 pt-1 border-t">
                                        {taskEntries.map((entry) => (
                                          <div key={entry.id} className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="min-w-0 pr-3">
                                              <p className="truncate">
                                                {format(new Date(entry.date), 'dd/MM/yyyy', { locale: ptBR })}
                                                {entry.description ? ` • ${entry.description}` : ''}
                                              </p>
                                            </div>
                                            <span className="font-medium text-foreground whitespace-nowrap">{formatHours(entry.hours)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {contracts.length} {contracts.length === 1 ? 'contrato' : 'contratos'}
            </h2>
            <Button size="sm" onClick={() => navigate('/contracts')}>
              Ver todos os contratos
            </Button>
          </div>

          {contractsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : contracts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileSignature className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum contrato para este cliente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <Card key={contract.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-foreground">{contract.title}</h3>
                          {getContractStatusBadge(contract.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {contract.contractor_name} ({contract.contractor_email})
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {contract.total_value && (
                            <span>R$ {contract.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          )}
                          {contract.total_hours && (
                            <span>{formatHours(contract.total_hours)}</span>
                          )}
                          <span>Criado em {format(new Date(contract.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                          {contract.signed_at && (
                            <span className="text-green-600">Assinado em {format(new Date(contract.signed_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => window.open(`/contract/${contract.share_token}`, '_blank')}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-64">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {user && clientId && (
              <ReportShareDialog
                clientId={clientId}
                clientName={client.company || client.name}
                userId={user.id}
                share={reportShare}
                onShareChange={setReportShare}
                triggerButton={
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                  </Button>
                }
              />
            )}
          </div>

          {/* Report Summary */}
          <div className="grid gap-4 grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total do Mês</p>
                <p className="text-2xl font-bold text-foreground">{formatHours(reportData.totalHours)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Tarefas</p>
                <p className="text-2xl font-bold text-foreground">{formatHours(reportData.taskHours)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Reuniões</p>
                <p className="text-2xl font-bold text-foreground">{formatHours(reportData.meetingHours)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Projects breakdown */}
          {reportData.projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileBarChart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma hora registrada neste período.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reportData.projects.map((project) => (
                <Card key={project.id}>
                  <Collapsible open={expandedProjects.has(project.id)} onOpenChange={() => toggleProject(project.id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedProjects.has(project.id) ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                            <CardTitle className="text-base">{project.name}</CardTitle>
                          </div>
                          <span className="font-bold text-foreground">{formatHours(project.monthHours)}</span>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4">
                        <div className="space-y-2 pl-8">
                          {project.tasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                              <span className="text-sm text-foreground">{task.name}</span>
                              <span className="text-sm font-medium text-muted-foreground">{formatHours(task.monthHours)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {requestsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma solicitação recebida deste cliente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-foreground">{request.title}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {request.briefing}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Enviado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <Button variant="outline" onClick={() => navigate('/requests')}>
            Ver todas as solicitações
          </Button>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          {teamLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Client Users Section */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Acesso do Cliente ({clientUsers.length})
                    </CardTitle>
                    <Button size="sm" onClick={() => {
                      // Pre-fill with client email if no users yet
                      if (clientUsers.length === 0 && client?.email) {
                        setNewClientUserEmail(client.email);
                        setNewClientUserName(client.name);
                      }
                      setIsCreateUserDialogOpen(true);
                    }}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar Acesso
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Show client's main email as pending if no linked user yet */}
                  {clientUsers.length === 0 && client?.email && (
                    <div className="mb-4 p-3 border border-dashed border-muted-foreground/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-sm font-medium text-muted-foreground">
                              {client.name?.charAt(0)?.toUpperCase() || client.email?.charAt(0)?.toUpperCase() || 'C'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{client.name}</p>
                              <Badge variant="secondary" className="text-xs">Responsável</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setNewClientUserEmail(client.email);
                            setNewClientUserName(client.name);
                            setIsCreateUserDialogOpen(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Criar Acesso
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Este email ainda não possui acesso ao portal. Clique em "Criar Acesso" para gerar as credenciais.
                      </p>
                    </div>
                  )}
                  
                  {clientUsers.length > 0 ? (
                    <div className="space-y-2">
                      {clientUsers.map((clientUser) => {
                        const isMainEmail = clientUser.profile?.email?.toLowerCase() === client?.email?.toLowerCase();
                        return (
                          <div key={clientUser.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {clientUser.profile?.full_name?.charAt(0)?.toUpperCase() || clientUser.profile?.email?.charAt(0)?.toUpperCase() || 'C'}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-foreground">{clientUser.profile?.full_name || 'Sem nome'}</p>
                                  {isMainEmail && (
                                    <Badge variant="secondary" className="text-xs">Responsável</Badge>
                                  )}
                                  {clientUser.is_primary && !isMainEmail && (
                                    <Badge variant="outline" className="text-xs">Principal</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{clientUser.profile?.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {clientUser.profile && getRoleBadge(clientUser.profile.role)}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => clientUser.profile && handleOpenEditUser(clientUser.profile)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {!isMainEmail && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveClientUser(clientUser.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Collaborators Section */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Colaboradores ({teamMembers.filter(m => m.role === 'collaborator').length})
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setIsAddCollaboratorDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {teamMembers.filter(m => m.role === 'collaborator').length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-3">
                        Nenhum colaborador vinculado aos projetos deste cliente.
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setIsCreateCollaboratorDialogOpen(true)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Criar Colaborador
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {teamMembers.filter(m => m.role === 'collaborator').map((member) => (
                        <div key={member.user_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center">
                              <span className="text-xs font-medium text-secondary-foreground">
                                {member.full_name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || 'C'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{member.full_name || 'Sem nome'}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleOpenEditUser(member)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveCollaborator(member.user_id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Admins Section */}
              {teamMembers.filter(m => m.role === 'admin' || m.role === 'master_admin').length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Administradores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {teamMembers.filter(m => m.role === 'admin' || m.role === 'master_admin').map((member) => (
                        <div key={member.user_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {member.full_name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || 'A'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{member.full_name || 'Sem nome'}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          {getRoleBadge(member.role)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Dados Gerais</TabsTrigger>
              <TabsTrigger value="custom-fields">Campos Personalizados</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general">
              <form onSubmit={handleEditClient}>
                <div className="space-y-4 py-4">
                  {/* Logo Upload */}
                  <ClientLogoUpload
                    clientId={clientId || ''}
                    currentLogoUrl={editFormData.logo_url}
                    onLogoChange={(url) => setEditFormData({ ...editFormData, logo_url: url })}
                    disabled={editSubmitting}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Nome</Label>
                      <Input
                        id="edit-name"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        required
                        disabled={editSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-company">Empresa</Label>
                      <Input
                        id="edit-company"
                        value={editFormData.company}
                        onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                        disabled={editSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        required
                        disabled={editSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Telefone</Label>
                      <Input
                        id="edit-phone"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        disabled={editSubmitting}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-pipeline">Status do Pipeline</Label>
                      <Select 
                        value={editFormData.pipeline_status} 
                        onValueChange={(value) => setEditFormData({ ...editFormData, pipeline_status: value })}
                        disabled={editSubmitting}
                      >
                        <SelectTrigger id="edit-pipeline">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="proposal">Em Negociação</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="churned">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-source">Origem</Label>
                      <Input
                        id="edit-source"
                        placeholder="Ex: Indicação, Google, etc."
                        value={editFormData.source}
                        onChange={(e) => setEditFormData({ ...editFormData, source: e.target.value })}
                        disabled={editSubmitting}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-contracted-hours">Horas Contratadas</Label>
                      <Input
                        id="edit-contracted-hours"
                        type="number"
                        min="0"
                        value={editFormData.contracted_hours}
                        onChange={(e) => setEditFormData({ ...editFormData, contracted_hours: Number(e.target.value) })}
                        required
                        disabled={editSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-contract-type">Modelo de Contratação</Label>
                      <Select 
                        value={editFormData.contract_type} 
                        onValueChange={(value: 'one_time' | 'monthly') => setEditFormData({ ...editFormData, contract_type: value })}
                        disabled={editSubmitting}
                      >
                        <SelectTrigger id="edit-contract-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one_time">Serviço Único</SelectItem>
                          <SelectItem value="monthly">Plano Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {editFormData.contract_type === 'monthly' 
                          ? 'Horas renovam automaticamente a cada mês' 
                          : 'Horas acumulativas desde o início do contrato'}
                      </p>
                    </div>
                  </div>

                  {/* Período do contrato - apenas para planos mensais */}
                  {editFormData.contract_type === 'monthly' && (
                    <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                      <h4 className="text-sm font-medium">Período do Contrato</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Data de Início */}
                        <div className="space-y-2">
                          <Label>Data de Início</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={editSubmitting}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {editFormData.contract_start_date 
                                  ? format(new Date(editFormData.contract_start_date + 'T00:00:00'), "dd/MM/yyyy")
                                  : "Selecionar data"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editFormData.contract_start_date ? new Date(editFormData.contract_start_date + 'T00:00:00') : undefined}
                                onSelect={(date) => setEditFormData({...editFormData, contract_start_date: date?.toISOString().split('T')[0] || null})}
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        {/* Data de Término */}
                        <div className="space-y-2">
                          <Label>Data de Término</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={editSubmitting}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {editFormData.contract_end_date 
                                  ? format(new Date(editFormData.contract_end_date + 'T00:00:00'), "dd/MM/yyyy")
                                  : "Selecionar data"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editFormData.contract_end_date ? new Date(editFormData.contract_end_date + 'T00:00:00') : undefined}
                                onSelect={(date) => setEditFormData({...editFormData, contract_end_date: date?.toISOString().split('T')[0] || null})}
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      
                      {/* Duração em meses */}
                      <div className="space-y-2">
                        <Label>Duração (meses)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={editFormData.contract_months || 1}
                          onChange={(e) => setEditFormData({...editFormData, contract_months: Number(e.target.value)})}
                          disabled={editSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">
                          Total do contrato: {formatHours((editFormData.contracted_hours || 0) * (editFormData.contract_months || 1))} ({editFormData.contracted_hours}h × {editFormData.contract_months || 1} meses)
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Observações</Label>
                    <WysiwygEditor
                      value={editFormData.notes}
                      onChange={(value) => setEditFormData({ ...editFormData, notes: value })}
                      placeholder="Notas sobre o cliente..."
                      disabled={editSubmitting}
                      minHeight="100px"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={editSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={editSubmitting}>
                    {editSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Salvar
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="custom-fields" className="py-4">
              <ClientCustomFieldsSection clientId={clientId || ''} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create Client User Dialog */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={(open) => {
        setIsCreateUserDialogOpen(open);
        if (!open) {
          setNewClientUserEmail('');
          setNewClientUserName('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Acesso ao Portal</DialogTitle>
            <DialogDescription>
              Adicione um usuário com acesso ao portal do cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-client-user-name">Nome</Label>
              <Input
                id="new-client-user-name"
                placeholder="Nome do usuário"
                value={newClientUserName}
                onChange={(e) => setNewClientUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-client-user-email">Email</Label>
              <Input
                id="new-client-user-email"
                type="email"
                placeholder="email@exemplo.com"
                value={newClientUserEmail}
                onChange={(e) => setNewClientUserEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O usuário receberá uma senha temporária. Se já existir um usuário com esse email, ele será vinculado automaticamente.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateUserDialogOpen(false)} disabled={creatingUser}>
              Cancelar
            </Button>
            <Button onClick={handleCreateClientUser} disabled={creatingUser || !newClientUserEmail}>
              {creatingUser ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Criar Acesso
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog - using reusable component */}
      <UserEditDialog
        open={isEditUserDialogOpen}
        onOpenChange={setIsEditUserDialogOpen}
        user={editingUserData}
        onSaved={handleUserSaved}
        showRoleEdit={true}
        showPreferences={true}
      />

      {/* Add Collaborator Dialog */}
      <Dialog open={isAddCollaboratorDialogOpen} onOpenChange={setIsAddCollaboratorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Colaborador</DialogTitle>
            <DialogDescription>
              Selecione um colaborador existente ou crie um novo para vincular aos projetos deste cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Colaborador Existente</Label>
                <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um colaborador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCollaborators.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhum colaborador disponível
                      </SelectItem>
                    ) : (
                      allCollaborators.map((collab) => (
                        <SelectItem key={collab.user_id} value={collab.user_id}>
                          {collab.full_name || collab.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setIsAddCollaboratorDialogOpen(false);
                  setIsCreateCollaboratorDialogOpen(true);
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Criar Novo Colaborador
              </Button>
            </div>
            
            {clientProjects.length === 0 && (
              <p className="text-sm text-yellow-600 mt-4">
                Este cliente não possui projetos. Crie um projeto primeiro.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddCollaboratorDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCollaborator} disabled={!selectedCollaborator || clientProjects.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>



      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
            <DialogDescription>
              Atualize as informações do projeto selecionado.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSaveProject}>
            <div className="space-y-2">
              <Label htmlFor="project-name">Nome</Label>
              <Input
                id="project-name"
                value={projectFormData.name}
                onChange={(event) => setProjectFormData((previous) => ({ ...previous, name: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Descrição</Label>
              <Textarea
                id="project-description"
                value={projectFormData.description}
                onChange={(event) => setProjectFormData((previous) => ({ ...previous, description: event.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={projectFormData.status}
                onValueChange={(value) => setProjectFormData((previous) => ({ ...previous, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsProjectDialogOpen(false)} disabled={projectSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={projectSubmitting || !projectFormData.name.trim()}>
                {projectSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteProjectDialogOpen} onOpenChange={setIsDeleteProjectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto <strong>{deletingProject?.name}</strong> será removido definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={projectSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={projectSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProject}
            >
              {projectSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Collaborator Dialog */}
      <UserCreateDialog
        open={isCreateCollaboratorDialogOpen}
        onOpenChange={setIsCreateCollaboratorDialogOpen}
        onCreated={handleCollaboratorCreated}
        defaultRole="collaborator"
        title="Novo Colaborador"
        description="Crie um novo colaborador que será vinculado aos projetos deste cliente."
      />
    </div>
  );
};
