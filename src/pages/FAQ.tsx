import React from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Wrench, Fuel, Shield, Truck, HelpCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useStoreSettings, getWhatsAppUrl } from "@/hooks/useStoreSettings";
import { WHATSAPP_MESSAGES } from "@/lib/constants";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    title: "Bombas de Combustível",
    icon: <Fuel className="h-5 w-5" />,
    items: [
      {
        question: "Qual a diferença entre bombas de combustível Gilbarco e Wayne?",
        answer: "Ambas são marcas líderes no mercado. A Gilbarco é conhecida pela durabilidade e facilidade de manutenção, enquanto a Wayne se destaca pela tecnologia avançada e precisão de medição. A escolha depende das necessidades específicas do seu posto, volume de vendas e infraestrutura existente."
      },
      {
        question: "Qual a vazão ideal para uma bomba de combustível em posto de grande movimento?",
        answer: "Para postos de alto movimento, recomendamos bombas com vazão mínima de 80 litros por minuto. Para postos de rodovia ou frotas, a vazão pode chegar a 130 L/min. Bombas de abastecimento de diesel para caminhões geralmente operam com vazões ainda maiores, entre 100 a 150 L/min."
      },
      {
        question: "As bombas de combustível vendidas possuem certificação INMETRO e ANP?",
        answer: "Sim, todos os nossos equipamentos possuem certificação INMETRO e homologação ANP, garantindo conformidade com as normas brasileiras de metrologia e segurança. Fornecemos certificados e documentação completa para regularização junto aos órgãos fiscalizadores."
      },
      {
        question: "Qual a vida útil média de uma bomba de combustível?",
        answer: "Com manutenção preventiva adequada, uma bomba de combustível pode durar de 15 a 25 anos. Fatores como qualidade do combustível, frequência de uso e condições ambientais influenciam diretamente na durabilidade. Recomendamos manutenção preventiva a cada 6 meses."
      }
    ]
  },
  {
    title: "Instalação e Infraestrutura",
    icon: <Wrench className="h-5 w-5" />,
    items: [
      {
        question: "Vocês realizam instalação das bombas de combustível?",
        answer: "Trabalhamos com uma rede de instaladores credenciados em todo o Brasil. Podemos indicar profissionais qualificados na sua região que seguem todas as normas técnicas da ANP e ABNT NBR para instalação segura de equipamentos de abastecimento."
      },
      {
        question: "Quais os requisitos elétricos para instalação de uma bomba de combustível?",
        answer: "A instalação requer alimentação trifásica 220V ou 380V, dependendo do modelo. É obrigatório aterramento adequado, disjuntor exclusivo e fiação dimensionada conforme NBR 5410. Consulte sempre um eletricista especializado em áreas classificadas (NR-10 e NR-20)."
      },
      {
        question: "Como dimensionar a tubulação para instalação de bombas?",
        answer: "O dimensionamento depende da vazão e distância até o tanque. Para bombas padrão (até 80 L/min), tubulação de 1.1/2\" é suficiente para distâncias até 30 metros. Para maiores distâncias ou vazões superiores, recomendamos tubulação de 2\". Sempre utilize tubos de aço carbono ou PEAD homologados."
      },
      {
        question: "É necessário licença ambiental para instalar equipamentos de abastecimento?",
        answer: "Sim, a instalação de equipamentos de abastecimento requer licenciamento ambiental junto ao órgão estadual (CETESB, FEPAM, etc.). Também é necessário alvará do Corpo de Bombeiros e registro na ANP. Fornecemos toda documentação técnica necessária para os processos de licenciamento."
      }
    ]
  },
  {
    title: "Manutenção e Peças",
    icon: <Shield className="h-5 w-5" />,
    items: [
      {
        question: "Qual a frequência recomendada para manutenção preventiva?",
        answer: "Recomendamos manutenção preventiva a cada 6 meses ou 50.000 litros abastecidos, o que ocorrer primeiro. A manutenção inclui verificação de filtros, calibração do medidor, inspeção de mangueiras e bicos, e teste de vazamento. Postos de alto movimento devem considerar intervalos menores."
      },
      {
        question: "Vocês vendem peças de reposição para bombas Gilbarco e Wayne?",
        answer: "Sim, temos estoque completo de peças originais e paralelas homologadas para as principais marcas: Gilbarco, Wayne, Tokheim, Mepisan e outras. Fornecemos filtros, mangueiras, bicos, medidores, placas eletrônicas, displays e todos os componentes necessários."
      },
      {
        question: "Como identificar se um bico de abastecimento precisa ser trocado?",
        answer: "Os principais sinais são: gotejamento após o abastecimento, dificuldade de travamento automático, vazamentos na conexão com a mangueira, e corrosão visível. Bicos devem ser inspecionados mensalmente e substituídos a cada 2-3 anos ou conforme desgaste observado."
      },
      {
        question: "Qual a garantia dos produtos vendidos?",
        answer: "Oferecemos garantia de fábrica de 12 meses para equipamentos novos e 6 meses para peças de reposição. A garantia cobre defeitos de fabricação e não inclui mau uso, instalação inadequada ou desgaste natural. Produtos recondicionados possuem garantia de 90 dias."
      }
    ]
  },
  {
    title: "Compra e Entrega",
    icon: <Truck className="h-5 w-5" />,
    items: [
      {
        question: "Qual o prazo de entrega para bombas de combustível?",
        answer: "Equipamentos em estoque são enviados em até 3 dias úteis. Para produtos sob encomenda ou personalizações, o prazo varia de 15 a 45 dias. Entregas para capitais levam de 5 a 10 dias úteis, interior pode levar até 15 dias dependendo da localização."
      },
      {
        question: "Vocês fazem entrega para todo o Brasil?",
        answer: "Sim, entregamos em todo território nacional. Trabalhamos com transportadoras especializadas em cargas pesadas e produtos industriais. Para equipamentos de grande porte, oferecemos frete dedicado com seguro completo."
      },
      {
        question: "É possível parcelar a compra de equipamentos?",
        answer: "Sim, oferecemos parcelamento em até 12x sem juros no cartão de crédito para compras acima de R$ 500. Para valores maiores, trabalhamos com financiamento via BNDES e leasing. Consulte condições especiais para compras em grande quantidade."
      },
      {
        question: "Vocês emitem nota fiscal e documentação para licitações?",
        answer: "Sim, emitimos nota fiscal eletrônica (NF-e) e toda documentação necessária para processos licitatórios, incluindo certidões negativas, atestados de capacidade técnica e certificados de conformidade. Temos experiência em fornecimento para órgãos públicos e grandes redes."
      }
    ]
  }
];

// Flatten all FAQs for schema
const allFAQs = faqCategories.flatMap(cat => cat.items);

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": allFAQs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
};

export default function FAQ() {
  const { data: settings } = useStoreSettings();
  const whatsappUrl = getWhatsAppUrl(settings?.whatsappUrl || "", WHATSAPP_MESSAGES.faq);
  
  return (
    <Layout>
      <SEO 
        title="Perguntas Frequentes - Bombas de Combustível"
        description="Tire suas dúvidas sobre bombas de combustível, instalação, manutenção e peças de reposição. FAQ técnico completo para postos de gasolina e frotas."
        url="/faq"
      />
      
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <div className="bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <HelpCircle className="h-4 w-4" />
              Central de Ajuda
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground mb-4">
              Perguntas Frequentes
            </h1>
            <p className="text-lg text-muted-foreground">
              Encontre respostas para as principais dúvidas sobre bombas de combustível, 
              instalação, manutenção e equipamentos para postos.
            </p>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto space-y-8">
            {faqCategories.map((category, catIndex) => (
              <div key={catIndex} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {category.icon}
                  </div>
                  <h2 className="text-lg font-bold text-foreground">
                    {category.title}
                  </h2>
                </div>
                
                <Accordion type="single" collapsible className="px-6">
                  {category.items.map((item, itemIndex) => (
                    <AccordionItem 
                      key={itemIndex} 
                      value={`${catIndex}-${itemIndex}`}
                      className="border-b last:border-0"
                    >
                      <AccordionTrigger className="text-left font-medium hover:text-primary py-4">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="max-w-4xl mx-auto mt-12">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Não encontrou sua resposta?
              </h3>
              <p className="text-muted-foreground mb-6">
                Nossa equipe técnica está pronta para ajudar com suas dúvidas específicas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="btn-primary">
                  <a 
                    href={whatsappUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Falar com Especialista
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/">
                    Ver Produtos
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
