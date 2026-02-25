import React from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";

export default function TermsOfUse() {
  return (
    <Layout>
      <SEO 
        title="Termos de Uso" 
        description="Termos e condições de uso da loja Rei das Bombas para compra e venda de equipamentos para postos."
        url="/termos-uso"
      />
      
      <div className="container-custom py-12">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h1 className="text-3xl font-black text-gray-900 mb-8">Termos de Uso</h1>
          
          <p className="text-sm text-gray-500 mb-6">Última atualização: Janeiro de 2026</p>
          
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Aceitação dos Termos</h2>
            <p className="text-gray-600 leading-relaxed">
              Ao acessar e utilizar o site da Rei das Bombas (reidasbombas.com.br), você concorda 
              em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com 
              qualquer parte destes termos, não deverá utilizar nosso site ou serviços.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Identificação da Empresa</h2>
            <div className="p-4 bg-gray-50 rounded-lg text-gray-700">
              <p><strong>Razão Social:</strong> Rei das Bombas Comércio de Peças LTDA</p>
              <p><strong>CNPJ:</strong> 32.722.864/0001-03</p>
              <p><strong>Endereço:</strong> Rua Arlindo dos Santos, 123, Loja 4 - Maria Virginia, Belo Horizonte/MG - CEP: 31160-640</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Produtos e Serviços</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Comercializamos equipamentos e peças para postos de combustível, incluindo bicos de 
              abastecimento, mangueiras, filtros, válvulas e acessórios correlatos. Nossos produtos 
              são destinados principalmente ao mercado B2B (business-to-business).
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>As imagens dos produtos são meramente ilustrativas;</li>
              <li>Especificações técnicas podem sofrer alterações sem aviso prévio;</li>
              <li>Disponibilidade sujeita ao estoque no momento da compra.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Preços e Pagamento</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Todos os preços são expressos em Reais (R$) e incluem impostos;</li>
              <li>Preços podem ser alterados sem aviso prévio;</li>
              <li>O preço válido é aquele exibido no momento da finalização do pedido;</li>
              <li>Aceitamos pagamento via PIX, cartão de crédito e boleto bancário;</li>
              <li>Pedidos estão sujeitos à aprovação de crédito e verificação de dados.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Entrega</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Realizamos entregas para todo o território nacional através de transportadoras parceiras.
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>O prazo de entrega é contado a partir da confirmação do pagamento;</li>
              <li>Frete grátis para pedidos acima de R$ 500,00 (consulte condições);</li>
              <li>O cliente é responsável por verificar o produto no ato da entrega;</li>
              <li>Reclamações sobre avarias devem ser feitas no momento da entrega.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Propriedade Intelectual</h2>
            <p className="text-gray-600 leading-relaxed">
              Todo o conteúdo do site, incluindo textos, imagens, logotipos, gráficos e software, 
              é de propriedade da Rei das Bombas ou de seus licenciadores, protegido pelas leis 
              brasileiras de propriedade intelectual. É proibida a reprodução sem autorização prévia.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Uso do Site</h2>
            <p className="text-gray-600 leading-relaxed mb-4">Ao utilizar nosso site, você concorda em:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Fornecer informações verdadeiras, precisas e completas;</li>
              <li>Não utilizar o site para fins ilegais ou não autorizados;</li>
              <li>Não tentar acessar áreas restritas do sistema;</li>
              <li>Não transmitir vírus ou códigos maliciosos.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Limitação de Responsabilidade</h2>
            <p className="text-gray-600 leading-relaxed">
              A Rei das Bombas não se responsabiliza por danos indiretos, incidentais ou 
              consequenciais decorrentes do uso ou impossibilidade de uso do site. Nossa 
              responsabilidade está limitada ao valor do produto adquirido.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Legislação Aplicável</h2>
            <p className="text-gray-600 leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. 
              Fica eleito o foro da comarca de Belo Horizonte/MG para dirimir quaisquer 
              controvérsias decorrentes destes termos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Para dúvidas sobre estes termos, entre em contato:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700"><strong>E-mail:</strong> contato@reidasbombas.com.br</p>
              <p className="text-gray-700"><strong>Telefone:</strong> (31) 99999-9999</p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
