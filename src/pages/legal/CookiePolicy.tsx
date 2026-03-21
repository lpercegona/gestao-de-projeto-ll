import React from "react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export const CookiePolicy: React.FC = () => {
  return (
    <LegalPageLayout title="Política de Cookies" lastUpdated="21 de março de 2026">
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">O que são Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">
          Cookies são pequenos arquivos de texto armazenados no dispositivo do usuário quando este acessa um site na internet. Esses arquivos permitem que o site reconheça o navegador do usuário em visitas subsequentes, armazene preferências e melhore a experiência de navegação. Os cookies podem ser temporários, sendo automaticamente apagados quando o navegador é fechado, ou persistentes, permanecendo no dispositivo por um período determinado até serem manualmente removidos ou expirarem.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Tipos de Cookies Utilizados</h2>

        <h3 className="text-base sm:text-lg font-medium text-foreground mt-4 mb-2">Cookies Essenciais</h3>
        <p className="text-muted-foreground leading-relaxed">
          Estes cookies são estritamente necessários para o funcionamento básico da plataforma e não podem ser desativados. Eles são responsáveis por manter a sessão do usuário ativa, garantir a segurança da navegação, armazenar preferências de autenticação e possibilitar funcionalidades fundamentais como o login e a navegação entre páginas protegidas. Sem esses cookies, a plataforma não consegue funcionar adequadamente. Eles não coletam informações pessoais para fins de marketing ou análise comportamental.
        </p>

        <h3 className="text-base sm:text-lg font-medium text-foreground mt-4 mb-2">Cookies Analíticos</h3>
        <p className="text-muted-foreground leading-relaxed">
          Os cookies analíticos são utilizados para compreender como os usuários interagem com a plataforma, permitindo identificar as páginas mais visitadas, os caminhos de navegação mais comuns e eventuais erros que os usuários encontram durante o uso. Essas informações são coletadas de forma agregada e anonimizada, sem possibilidade de identificação individual do usuário. Os dados obtidos através desses cookies são utilizados exclusivamente para melhorar o desempenho e a usabilidade da plataforma. A ativação desses cookies depende do consentimento do usuário e pode ser gerenciada a qualquer momento.
        </p>

        <h3 className="text-base sm:text-lg font-medium text-foreground mt-4 mb-2">Cookies de Marketing</h3>
        <p className="text-muted-foreground leading-relaxed">
          Os cookies de marketing são utilizados para exibir conteúdo relevante e personalizado ao usuário, com base em seus interesses e no histórico de navegação. Esses cookies podem ser definidos pela plataforma ou por parceiros terceiros cujos serviços foram integrados ao site. Eles permitem medir a eficácia de campanhas de comunicação e adaptar o conteúdo apresentado ao perfil do visitante. A ativação desses cookies depende do consentimento expresso do usuário e pode ser revogada a qualquer momento através das preferências de cookies disponíveis na plataforma.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Finalidade dos Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">
          Os cookies utilizados pela plataforma ORAS têm como finalidade garantir o funcionamento técnico adequado do site, preservar a segurança da sessão do usuário, armazenar preferências de navegação e de consentimento, analisar o comportamento de uso de forma agregada para aprimoramento contínuo da experiência e, quando autorizado pelo usuário, personalizar o conteúdo exibido e mensurar o alcance de comunicações. Cada tipo de cookie atende a uma finalidade específica e legítima, conforme detalhado nas seções acima.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Gestão e Desativação de Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">
          O usuário pode gerenciar suas preferências de cookies a qualquer momento através do banner de consentimento exibido no primeiro acesso à plataforma ou através do link "Preferências de Cookies" disponível no rodapé do site. Nesse painel, é possível ativar ou desativar individualmente os cookies analíticos e de marketing, sendo que os cookies essenciais permanecem sempre ativos por serem indispensáveis ao funcionamento da plataforma. Além disso, a maioria dos navegadores permite configurar o bloqueio de cookies de forma global através de suas configurações internas. É importante ressaltar que a desativação de determinados cookies pode afetar funcionalidades da plataforma e comprometer a experiência de navegação. Para mais informações sobre como gerenciar cookies em seu navegador, consulte a documentação oficial do navegador utilizado.
        </p>
      </section>
    </LegalPageLayout>
  );
};
