import React from "react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export const TermsOfUse: React.FC = () => {
  return (
    <LegalPageLayout title="Termos de Uso" lastUpdated="21 de março de 2026">
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Papel da Plataforma como Intermediadora</h2>
        <p className="text-muted-foreground leading-relaxed">
          A ORAS é uma plataforma digital que atua como intermediadora de serviços entre profissionais criativos e seus clientes. A plataforma disponibiliza ferramentas de gestão de projetos, controle de horas, emissão de propostas, contratos e relatórios, facilitando a organização e a comunicação entre as partes. A ORAS não é parte nos contratos firmados entre profissionais e clientes, não se responsabiliza pela qualidade, prazo ou entrega dos serviços contratados através da plataforma, e não exerce controle sobre a relação comercial estabelecida entre as partes. A plataforma funciona exclusivamente como um meio tecnológico para facilitar a gestão e a transparência dessas relações.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Responsabilidades dos Usuários</h2>
        <p className="text-muted-foreground leading-relaxed">
          O usuário é responsável por fornecer informações verdadeiras, completas e atualizadas no momento do cadastro e durante todo o uso da plataforma. É de responsabilidade exclusiva do usuário manter a confidencialidade de suas credenciais de acesso, não sendo permitido o compartilhamento de login e senha com terceiros. O usuário responde por todas as atividades realizadas em sua conta e deve notificar a ORAS imediatamente em caso de uso não autorizado. O profissional que utiliza a plataforma é integralmente responsável pela relação com seus clientes, incluindo a qualidade dos serviços prestados, o cumprimento de prazos e obrigações contratuais, e a conformidade com a legislação trabalhista, tributária e de proteção ao consumidor aplicável.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Regras de Uso</h2>
        <p className="text-muted-foreground leading-relaxed">
          O uso da plataforma deve observar a legislação vigente, a boa-fé e os presentes Termos de Uso. É vedado ao usuário utilizar a plataforma para fins ilícitos, fraudulentos ou que violem direitos de terceiros. Não é permitido publicar conteúdo ofensivo, discriminatório, que infrinja direitos autorais ou de propriedade intelectual de terceiros, ou que contenha vírus, malware ou qualquer código malicioso. O usuário não deve tentar acessar áreas restritas da plataforma, realizar engenharia reversa, ou utilizar meios automatizados para extrair dados sem autorização expressa. A ORAS reserva-se o direito de suspender ou encerrar contas que violem estas regras, sem aviso prévio e sem direito a indenização.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Limitação de Responsabilidade</h2>
        <p className="text-muted-foreground leading-relaxed">
          A ORAS empenha-se em manter a plataforma disponível e funcional, porém não garante que o serviço será ininterrupto, livre de erros ou completamente seguro. A plataforma é disponibilizada no estado em que se encontra, e a ORAS não se responsabiliza por danos diretos, indiretos, incidentais, consequenciais ou punitivos decorrentes do uso ou da impossibilidade de uso da plataforma. A ORAS não se responsabiliza por perdas de dados, lucros cessantes, interrupção de negócios ou quaisquer outros prejuízos decorrentes de falhas técnicas, ataques cibernéticos, atualizações do sistema ou circunstâncias fora de seu controle razoável. A responsabilidade total da ORAS, em qualquer hipótese, limita-se ao valor pago pelo usuário nos últimos doze meses pelo uso da plataforma.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Condições de Pagamento</h2>
        <p className="text-muted-foreground leading-relaxed">
          A plataforma ORAS oferece planos gratuitos e pagos, cujos preços, funcionalidades e condições estão descritos na página de planos disponível no site. Os pagamentos são processados por intermediadores financeiros terceirizados e podem ser realizados por meio de cartão de crédito, boleto bancário ou outros meios disponibilizados. A contratação de planos pagos implica em cobrança recorrente conforme a periodicidade escolhida pelo usuário. O cancelamento pode ser realizado a qualquer momento, com efeito a partir do término do período já pago. Não há reembolso proporcional para períodos parcialmente utilizados, salvo disposição legal em contrário. A ORAS reserva-se o direito de alterar os preços e as condições dos planos mediante aviso prévio de trinta dias aos usuários ativos.
        </p>
      </section>
    </LegalPageLayout>
  );
};
