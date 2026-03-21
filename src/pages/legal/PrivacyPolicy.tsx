import React from "react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export const PrivacyPolicy: React.FC = () => {
  return (
    <LegalPageLayout title="Política de Privacidade" lastUpdated="21 de março de 2026">
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Dados Coletados</h2>
        <p className="text-muted-foreground leading-relaxed">
          A plataforma ORAS coleta dados pessoais fornecidos diretamente pelo usuário durante o cadastro e uso dos serviços, como nome completo, endereço de e-mail, telefone, dados da empresa e informações profissionais. Além disso, são coletados dados de navegação de forma automática, incluindo endereço IP, tipo de navegador, sistema operacional, páginas acessadas e tempo de permanência no site. Dados de pagamento, quando aplicáveis, são processados por intermediadores financeiros e não são armazenados diretamente em nossos servidores.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Finalidade do Tratamento</h2>
        <p className="text-muted-foreground leading-relaxed">
          Os dados pessoais coletados são utilizados para viabilizar a prestação dos serviços oferecidos pela plataforma, incluindo a gestão de projetos, controle de horas, emissão de propostas e contratos, geração de relatórios e comunicação com clientes. Os dados também são utilizados para personalizar a experiência do usuário, enviar notificações relevantes sobre o andamento dos projetos, melhorar a qualidade e a segurança da plataforma e cumprir obrigações legais e regulatórias. Dados de navegação são utilizados para fins analíticos, permitindo entender como os usuários interagem com a plataforma e identificar oportunidades de melhoria.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Base Legal</h2>
        <p className="text-muted-foreground leading-relaxed">
          O tratamento de dados pessoais pela ORAS fundamenta-se nas bases legais previstas na Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Para a execução dos serviços contratados, utilizamos a base legal de execução de contrato. Para o envio de comunicações sobre novos recursos e atualizações, utilizamos o legítimo interesse, sempre respeitando os direitos do titular. Quando necessário, solicitamos o consentimento expresso do usuário, especialmente para o uso de cookies não essenciais e para o compartilhamento de dados com terceiros para finalidades específicas. Para o cumprimento de obrigações fiscais, contábeis e regulatórias, utilizamos a base legal de obrigação legal.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Compartilhamento de Dados</h2>
        <p className="text-muted-foreground leading-relaxed">
          A ORAS atua como intermediadora de serviços entre profissionais criativos e seus clientes. Nesse contexto, dados pessoais podem ser compartilhados entre as partes envolvidas na relação contratual, sempre limitados ao necessário para a execução do serviço. Dados também podem ser compartilhados com prestadores de serviços essenciais ao funcionamento da plataforma, como provedores de infraestrutura em nuvem, serviços de e-mail e processadores de pagamento, sempre mediante contratos que garantam a proteção adequada dos dados. A ORAS não comercializa, aluga ou cede dados pessoais para terceiros com finalidades comerciais próprias. Dados poderão ser compartilhados com autoridades competentes quando houver obrigação legal ou determinação judicial.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Retenção de Dados</h2>
        <p className="text-muted-foreground leading-relaxed">
          Os dados pessoais são mantidos pelo tempo necessário para cumprir as finalidades para as quais foram coletados, incluindo o período de vigência da conta do usuário e a prestação dos serviços contratados. Após o encerramento da conta, os dados pessoais são mantidos pelo prazo legalmente exigido para fins fiscais, contábeis e de defesa em eventuais disputas judiciais, conforme a legislação aplicável. Transcorrido o prazo de retenção legal, os dados são excluídos ou anonimizados de forma irreversível. Dados de navegação e analytics são mantidos de forma agregada e anonimizada, sem possibilidade de identificação do usuário.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Direitos do Titular</h2>
        <p className="text-muted-foreground leading-relaxed">
          Em conformidade com a LGPD, o titular dos dados pessoais tem direito a solicitar, a qualquer momento, o acesso aos seus dados pessoais tratados pela plataforma, a correção de dados incompletos, inexatos ou desatualizados, a anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei, a portabilidade dos dados a outro fornecedor de serviço, a eliminação dos dados tratados com base no consentimento, a obtenção de informações sobre as entidades públicas e privadas com as quais os dados foram compartilhados e a revogação do consentimento. Para exercer esses direitos, o titular pode acessar a página de Direitos do Titular em nossa plataforma ou entrar em contato através dos canais de atendimento disponibilizados.
        </p>
      </section>
    </LegalPageLayout>
  );
};
