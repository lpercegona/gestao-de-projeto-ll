import LegalPageLayout from "@/components/legal/LegalPageLayout";

export const ForClients = () => {
  return (
    <LegalPageLayout title="Para Clientes" lastUpdated="">
      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Acompanhamento de projetos em tempo real</h2>
        <p>
          Através do painel do cliente, você visualiza todos os projetos em andamento, seus status atuais e as tarefas associadas a cada um. A interface apresenta de forma clara o progresso de cada entrega, permitindo que você acompanhe o trabalho do profissional contratado sem precisar solicitar atualizações manualmente. Cada projeto exibe campos personalizados definidos pelo criativo, adaptando a visualização às particularidades do serviço contratado.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Relatórios de horas consumidas e saldo</h2>
        <p>
          Consulte a qualquer momento o total de horas contratadas, as horas já consumidas e o saldo disponível. Os registros de tempo são detalhados por tarefa e projeto, garantindo total transparência sobre como cada hora foi investida. Relatórios periódicos são enviados automaticamente conforme configuração do profissional, mas você também pode acessar essas informações diretamente no seu painel sempre que desejar.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Solicitação de novos projetos e tarefas</h2>
        <p>
          Envie solicitações de novos projetos diretamente pela plataforma, descrevendo o briefing, o prazo desejado e as tarefas necessárias. O profissional recebe a solicitação, analisa e pode converter em um projeto formal com todas as etapas definidas. Esse fluxo elimina a necessidade de longas trocas de mensagens e centraliza todas as demandas em um único lugar, com histórico completo de cada solicitação e seu status de processamento.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Acesso a relatórios e entregas</h2>
        <p>
          Todos os relatórios gerados pelo profissional ficam acessíveis no seu painel, organizados por período. Você pode consultá-los a qualquer momento para verificar o que foi entregue, quantas horas foram dedicadas e quais tarefas foram concluídas. Links compartilhados de relatórios permitem que você encaminhe as informações para outros membros da sua equipe sem necessidade de criar novas contas na plataforma.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Calendário de prazos e entregas</h2>
        <p>
          Visualize no calendário integrado todos os prazos dos seus projetos e tarefas. A visão mensal facilita o planejamento e ajuda a identificar períodos de maior demanda ou possíveis conflitos de datas. Lembretes associados aos prazos garantem que nenhuma entrega importante passe despercebida, mantendo você informado sobre o andamento de cada compromisso assumido pelo profissional.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Aprovação de propostas e contratos</h2>
        <p>
          Receba propostas comerciais detalhadas diretamente na plataforma, com descrição dos serviços, valores e prazos estimados. Analise cada item, adicione comentários e aprove ou solicite alterações de forma simples e rastreável. Propostas aprovadas são convertidas em contratos digitais que podem ser assinados eletronicamente, formalizando o acordo entre as partes com segurança e praticidade. Todo o histórico de negociação permanece registrado para consulta futura.
        </p>
      </section>
    </LegalPageLayout>
  );
};
