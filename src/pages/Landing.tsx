import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Clock, 
  BarChart3, 
  Users, 
  FolderKanban, 
  CheckCircle, 
  ArrowRight,
  Zap,
  Shield,
  Globe
} from 'lucide-react';
import LogoOras from '@/assets/logo-oras.svg';
import SimboloOras from '@/assets/simbolo-oras.svg';

export const Landing: React.FC = () => {
  const features = [
    {
      icon: Clock,
      title: 'Controle de Horas',
      description: 'Registre e acompanhe o tempo dedicado a cada tarefa com precisão.'
    },
    {
      icon: FolderKanban,
      title: 'Gestão de Projetos',
      description: 'Organize projetos, tarefas e entregas em um só lugar.'
    },
    {
      icon: BarChart3,
      title: 'Relatórios Detalhados',
      description: 'Gere relatórios automáticos por projeto, cliente ou período.'
    },
    {
      icon: Users,
      title: 'Portal do Cliente',
      description: 'Seus clientes acompanham o progresso em tempo real.'
    },
    {
      icon: Shield,
      title: 'Controle de Acesso',
      description: 'Diferentes níveis de permissão para equipes e clientes.'
    },
    {
      icon: Zap,
      title: 'Timer Inteligente',
      description: 'Inicie e pause timers com registro automático de horas.'
    }
  ];

  const benefits = [
    'Reduza o tempo gasto em planilhas',
    'Aumente a transparência com clientes',
    'Melhore a previsibilidade de projetos',
    'Simplifique o faturamento mensal'
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <img src={LogoOras} alt="ORAS" className="h-8 w-auto" />
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link to="/login">
                <Button size="sm">
                  Começar Agora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              Controle de horas{' '}
              <span className="text-primary">simplificado</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Gerencie projetos, registre horas e compartilhe relatórios com seus clientes. 
              Tudo em uma plataforma simples e intuitiva.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Acessar Plataforma
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Fazer Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Tudo que você precisa
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Funcionalidades completas para gestão de tempo e projetos
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                  Por que escolher o ORAS?
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Desenvolvido para agências, freelancers e equipes que precisam 
                  de controle preciso sobre o tempo investido em cada projeto.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-muted/50 rounded-2xl p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Acesso de qualquer lugar</p>
                      <p className="text-sm text-muted-foreground">100% na nuvem, sem instalação</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Multiusuário</p>
                      <p className="text-sm text-muted-foreground">Equipe e clientes na mesma plataforma</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Dados seguros</p>
                      <p className="text-sm text-muted-foreground">Criptografia e backup automático</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-6">
              Pronto para começar?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8">
              Acesse agora e comece a gerenciar suas horas de forma profissional.
            </p>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                Acessar Plataforma
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={SimboloOras} alt="ORAS" className="h-6 w-auto" />
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ORAS. Gestão de Projetos e Horas.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};