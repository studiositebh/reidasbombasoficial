import React from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";

export default function PrivacyPolicy() {
  return (
    <Layout>
      <SEO 
        title="Política de Privacidade" 
        description="Política de privacidade e proteção de dados da Rei das Bombas conforme a LGPD."
        url="/politica-privacidade"
      />
      
      <div className="container-custom py-12">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h1 className="text-3xl font-black text-gray-900 mb-8">Política de Privacidade</h1>
          
          <p className="text-sm text-gray-500 mb-6">Última atualização: Janeiro de 2026</p>
          
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Introdução</h2>
            <p className="text-gray-600 leading-relaxed">
              A Rei das Bombas ("nós", "nosso" ou "empresa") está comprometida em proteger a privacidade 
              e os dados pessoais de nossos clientes, parceiros e visitantes do site. Esta Política de 
              Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações 
              pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Dados Coletados</h2>
            <p className="text-gray-600 leading-relaxed mb-4">Coletamos os seguintes tipos de dados:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Dados de identificação:</strong> Nome, CPF/CNPJ, razão social.</li>
              <li><strong>Dados de contato:</strong> E-mail, telefone, endereço completo.</li>
              <li><strong>Dados de transação:</strong> Histórico de compras, formas de pagamento utilizadas.</li>
              <li><strong>Dados de navegação:</strong> Endereço IP, cookies, páginas visitadas.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Finalidade do Tratamento</h2>
            <p className="text-gray-600 leading-relaxed mb-4">Utilizamos seus dados para:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Processar e entregar seus pedidos;</li>
              <li>Emitir notas fiscais e documentos legais;</li>
              <li>Comunicar sobre status de pedidos e entregas;</li>
              <li>Enviar ofertas e promoções (com seu consentimento);</li>
              <li>Melhorar nossos produtos e serviços;</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Compartilhamento de Dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Compartilhamos seus dados apenas com parceiros essenciais para a operação, como:
              transportadoras para entrega, processadores de pagamento e órgãos governamentais 
              quando exigido por lei. Não vendemos ou alugamos seus dados pessoais a terceiros.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Seus Direitos (LGPD)</h2>
            <p className="text-gray-600 leading-relaxed mb-4">Você tem direito a:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Confirmar a existência de tratamento de seus dados;</li>
              <li>Acessar seus dados pessoais;</li>
              <li>Corrigir dados incompletos ou desatualizados;</li>
              <li>Solicitar a anonimização ou eliminação de dados desnecessários;</li>
              <li>Revogar o consentimento a qualquer momento;</li>
              <li>Solicitar a portabilidade dos dados.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Segurança dos Dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Implementamos medidas técnicas e organizacionais apropriadas para proteger seus dados 
              contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos 
              criptografia SSL/TLS em todas as transmissões de dados sensíveis.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Retenção de Dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta 
              política e conforme exigido pela legislação aplicável (por exemplo, registros fiscais 
              são mantidos por 5 anos).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato 
              com nosso Encarregado de Proteção de Dados:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700"><strong>E-mail:</strong> privacidade@reidasbombas.com.br</p>
              <p className="text-gray-700"><strong>Telefone:</strong> (31) 99999-9999</p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
