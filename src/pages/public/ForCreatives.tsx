import LegalPageLayout from "@/components/legal/LegalPageLayout";

export const ForCreatives = () => {
  return (
    <LegalPageLayout title="Para Criativos" lastUpdated="">
      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Gerencie seu tempo com precisão</h2>
        <p>
          A ORAS oferece um timer integrado que permite registrar cada minuto dedicado aos seus projetos. Inicie, pause e finalize cronômetros diretamente na interface, com os registros vinculados automaticamente às tarefas correspondentes. Ao final do período, você terá um panorama completo das horas investidas em cada cliente e projeto, facilitando a cobrança e a análise de produtividade. Registros manuais também são suportados para situações em que o cronômetro não foi utilizado.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Projetos organizados com Kanban e tarefas</h2>
        <p>
          Cada projeto pode ser visualizado em formato Kanban, com colunas personalizáveis que refletem o fluxo de trabalho da sua equipe. Crie tarefas, defina prazos, adicione descrições e mova-as entre etapas conforme o progresso. A visão de lista e tabela também estão disponíveis para quem prefere uma abordagem mais detalhada. Campos personalizados permitem adaptar cada projeto às necessidades específicas do cliente, tornando a gestão flexível e completa.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Propostas e contratos digitais</h2>
        <p>
          Elabore propostas comerciais diretamente na plataforma, com itens detalhados, valores e horas estimadas. Envie o link ao cliente para que ele visualize, comente e aprove ou solicite ajustes sem a necessidade de trocas intermináveis de e-mail. Propostas aprovadas podem ser convertidas em contratos digitais com um clique, prontos para assinatura eletrônica. Todo o histórico de interações, alterações de status e comentários fica registrado, garantindo transparência em cada negociação.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Relatórios automáticos</h2>
        <p>
          Configure o envio automático de relatórios mensais para cada cliente, definindo o dia e horário de disparo. Os relatórios compilam projetos, tarefas concluídas, horas registradas e o saldo de horas contratadas, proporcionando ao cliente uma visão clara do trabalho realizado. Relatórios também podem ser compartilhados por meio de links públicos ou protegidos por senha, oferecendo flexibilidade na forma de comunicar resultados.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Portfólio público e perfil profissional</h2>
        <p>
          Monte um portfólio online vinculado ao seu perfil público na plataforma. Adicione projetos com imagens, descrições e serviços associados para demonstrar sua expertise a potenciais clientes. O perfil público exibe informações de contato, catálogo de serviços e trabalhos realizados em uma página elegante e responsiva, acessível a qualquer pessoa por meio de um link personalizado. Dessa forma, sua presença digital profissional está sempre atualizada e integrada à ferramenta que você já utiliza para gerenciar seus projetos.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-2xl font-semibold text-foreground mb-4">Portal exclusivo para cada cliente</h2>
        <p>
          Cada cliente recebe um acesso exclusivo ao seu portal, onde pode acompanhar o andamento dos projetos, visualizar tarefas, consultar horas consumidas e solicitar novos trabalhos. O portal funciona como um canal direto entre o criativo e o contratante, reduzindo a dependência de ferramentas externas de comunicação. O acesso é controlado por token seguro, garantindo que somente pessoas autorizadas possam visualizar as informações do projeto.
        </p>
      </section>
    </LegalPageLayout>
  );
};
