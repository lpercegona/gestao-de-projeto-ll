import React from "react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export const DataSubjectRights: React.FC = () => {
  return (
    <LegalPageLayout title="Direitos do Titular" lastUpdated="21 de março de 2026">
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Seus Direitos sob a LGPD</h2>
        <p className="text-muted-foreground leading-relaxed">
          A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) assegura ao titular de dados pessoais um conjunto de direitos que podem ser exercidos a qualquer momento perante a plataforma ORAS. Esses direitos visam garantir transparência, controle e autodeterminação sobre as informações pessoais tratadas. A ORAS está comprometida com o pleno respeito a esses direitos e disponibiliza os meios necessários para que o titular possa exercê-los de forma simples, gratuita e acessível.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Acesso aos Dados</h2>
        <p className="text-muted-foreground leading-relaxed">
          O titular tem o direito de solicitar e obter a confirmação da existência de tratamento de seus dados pessoais pela plataforma, bem como o acesso completo às informações pessoais mantidas em nossos registros. Ao exercer esse direito, o titular receberá uma cópia de todos os dados pessoais tratados, incluindo a finalidade do tratamento, as categorias de dados envolvidas, os destinatários com os quais os dados foram compartilhados e o período de retenção previsto.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Correção de Dados</h2>
        <p className="text-muted-foreground leading-relaxed">
          O titular pode solicitar a correção de dados pessoais incompletos, inexatos ou desatualizados mantidos pela plataforma. Parte dessas correções pode ser realizada diretamente pelo usuário através das configurações de perfil na plataforma. Para correções que não possam ser realizadas diretamente, o titular pode submeter uma solicitação formal através dos canais disponibilizados, e a ORAS providenciará a atualização dos dados no menor prazo possível.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Exclusão de Dados</h2>
        <p className="text-muted-foreground leading-relaxed">
          O titular tem o direito de solicitar a eliminação de seus dados pessoais tratados com base no consentimento, quando este for revogado, ou quando os dados forem considerados desnecessários, excessivos ou tratados em desconformidade com a LGPD. A exclusão será realizada de forma definitiva, ressalvados os casos em que a manutenção dos dados seja necessária para o cumprimento de obrigações legais ou regulatórias, para o exercício regular de direitos em processos judiciais ou administrativos, ou para fins de pesquisa, desde que garantida a anonimização dos dados.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Portabilidade de Dados</h2>
        <p className="text-muted-foreground leading-relaxed">
          O titular pode solicitar a portabilidade de seus dados pessoais a outro fornecedor de serviço ou produto. Nesse caso, a ORAS disponibilizará os dados pessoais do titular em formato estruturado, de uso comum e leitura automatizada, permitindo que sejam transferidos para outra plataforma. A portabilidade será realizada em conformidade com a regulamentação da Autoridade Nacional de Proteção de Dados (ANPD) e não inclui dados que já tenham sido anonimizados.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Como Exercer seus Direitos</h2>
        <p className="text-muted-foreground leading-relaxed">
          Para exercer qualquer um dos direitos previstos na LGPD, o titular pode entrar em contato com a plataforma através do endereço de e-mail disponibilizado nas configurações da conta ou através do formulário de solicitação disponível na plataforma. A solicitação deve conter a identificação do titular, uma descrição clara do direito que deseja exercer e, quando aplicável, informações adicionais que auxiliem na localização dos dados. Todas as solicitações serão registradas e confirmadas por e-mail no prazo de até dois dias úteis após o recebimento. A ORAS responderá às solicitações no prazo de até quinze dias úteis, podendo ser prorrogado em casos de maior complexidade, com justificativa ao titular. Não há cobrança de taxa para o exercício desses direitos.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Confirmação de Recebimento</h2>
        <p className="text-muted-foreground leading-relaxed">
          Ao submeter uma solicitação de exercício de direitos, o titular receberá uma confirmação automática por e-mail contendo o número de protocolo da solicitação, a data de recebimento e o prazo estimado para resposta. Essa confirmação garante ao titular a rastreabilidade de sua solicitação e permite acompanhar o andamento do processo. A ORAS mantém registro de todas as solicitações recebidas e das providências adotadas, em conformidade com o princípio de prestação de contas previsto na LGPD.
        </p>
      </section>
    </LegalPageLayout>
  );
};
