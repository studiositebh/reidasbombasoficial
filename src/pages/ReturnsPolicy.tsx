import React from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { AlertTriangle, CheckCircle, Clock, Package } from "lucide-react";

export default function ReturnsPolicy() {
  return (
    <Layout>
      <SEO 
        title="Trocas e Devoluções" 
        description="Política de trocas, devoluções e garantia de produtos da Rei das Bombas. Garantia de fábrica para peças industriais."
        url="/trocas-devolucoes"
      />
      
      <div className="container-custom py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-black text-gray-900 mb-8">Política de Trocas e Devoluções</h1>
          
          <p className="text-sm text-gray-500 mb-6">Última atualização: Janeiro de 2026</p>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800">7 Dias</p>
              <p className="text-xs text-green-600">Direito de Arrependimento</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="font-bold text-blue-800">90 Dias</p>
              <p className="text-xs text-blue-600">Garantia Legal</p>
            </div>
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-bold text-primary">12 Meses</p>
              <p className="text-xs text-primary/80">Garantia de Fábrica*</p>
            </div>
          </div>
          
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Direito de Arrependimento</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Conforme o Código de Defesa do Consumidor (Art. 49), você pode desistir da compra 
              em até <strong>7 dias corridos</strong> após o recebimento do produto, desde que:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>O produto esteja em sua embalagem original, lacrado e sem uso;</li>
              <li>Não apresente sinais de instalação ou manuseio;</li>
              <li>Acompanhe todos os acessórios e manuais originais;</li>
              <li>A nota fiscal esteja disponível.</li>
            </ul>
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Atenção:</strong> Produtos instalados, com sinais de uso ou danos causados 
                pelo cliente não são elegíveis para devolução por arrependimento.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Garantia Legal (90 dias)</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Todos os produtos possuem garantia legal de 90 dias contra defeitos de fabricação, 
              conforme previsto no Código de Defesa do Consumidor.
            </p>
            <p className="text-gray-600 leading-relaxed">
              A garantia cobre defeitos de fabricação que comprometam o funcionamento adequado 
              do produto. Não cobre desgaste natural, mau uso, instalação incorreta ou danos 
              causados por terceiros.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Garantia de Fábrica (Estendida)</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Muitos de nossos produtos possuem garantia de fábrica estendida de até 12 meses, 
              conforme especificação do fabricante. Consulte a descrição do produto para verificar 
              o prazo de garantia aplicável.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Para acionar a garantia de fábrica, é necessário:</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Apresentar a nota fiscal de compra;</li>
              <li>O produto deve ter sido instalado por profissional qualificado;</li>
              <li>Seguir as instruções de uso e manutenção do fabricante;</li>
              <li>Não ter realizado modificações ou reparos não autorizados.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. O que NÃO é coberto pela garantia</h2>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <ul className="list-disc pl-6 text-red-800 space-y-2">
                <li>Desgaste natural de peças (vedações, o-rings, mangueiras expostas a UV);</li>
                <li>Danos causados por instalação incorreta ou por profissional não qualificado;</li>
                <li>Uso de combustíveis adulterados ou fora das especificações;</li>
                <li>Sobrecarga, subtensão ou variações elétricas (para bombas e eletrônicos);</li>
                <li>Danos causados por acidentes, quedas ou transporte inadequado;</li>
                <li>Modificações ou reparos realizados por terceiros não autorizados.</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Como Solicitar Troca ou Devolução</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <p className="font-semibold text-gray-900">Entre em contato conosco</p>
                  <p className="text-gray-600 text-sm">Envie um e-mail para trocas@reidasbombas.com.br ou ligue para (31) 99999-9999 informando o número do pedido e o motivo da solicitação.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">2</div>
                <div>
                  <p className="font-semibold text-gray-900">Aguarde a análise</p>
                  <p className="text-gray-600 text-sm">Nossa equipe técnica avaliará a solicitação e, se aprovada, enviará as instruções para devolução do produto.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">3</div>
                <div>
                  <p className="font-semibold text-gray-900">Envie o produto</p>
                  <p className="text-gray-600 text-sm">Embale o produto com segurança e envie para nosso centro de distribuição. O frete de devolução pode ser por nossa conta dependendo do motivo.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">4</div>
                <div>
                  <p className="font-semibold text-gray-900">Receba a solução</p>
                  <p className="text-gray-600 text-sm">Após recebimento e análise do produto, realizaremos a troca, reparo ou estorno conforme o caso.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Prazos de Ressarcimento</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Estorno no cartão:</strong> Até 2 faturas após a devolução;</li>
              <li><strong>PIX:</strong> Até 5 dias úteis após aprovação;</li>
              <li><strong>Boleto:</strong> Até 10 dias úteis após aprovação;</li>
              <li><strong>Troca de produto:</strong> Envio em até 5 dias úteis após recebimento.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Contato</h2>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 mb-2"><strong>Central de Trocas e Devoluções</strong></p>
              <p className="text-gray-700"><strong>E-mail:</strong> trocas@reidasbombas.com.br</p>
              <p className="text-gray-700"><strong>WhatsApp:</strong> (31) 99999-9999</p>
              <p className="text-gray-700"><strong>Horário:</strong> Segunda a Sexta, das 8h às 18h</p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
