import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { 
  Target, Eye, Heart, ShieldCheck, Truck, 
  Users, Clock, Award, MessageCircle, Building2,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStoreSettings, getWhatsAppUrl } from "@/hooks/useStoreSettings";
import { WHATSAPP_MESSAGES } from "@/lib/constants";

const stats = [
  { value: "+10", label: "Anos de Experiência" },
  { value: "+500", label: "Clientes Atendidos" },
  { value: "27", label: "Estados Atendidos" },
  { value: "+5000", label: "Produtos Entregues" },
];

const values = [
  {
    icon: Target,
    title: "Missão",
    description: "Fornecer equipamentos e peças de alta qualidade para postos de combustível, com atendimento técnico especializado e compromisso com a conformidade regulatória.",
  },
  {
    icon: Eye,
    title: "Visão",
    description: "Ser a referência nacional em distribuição de equipamentos para postos de serviços e frotas próprias, reconhecida pela excelência no atendimento e qualidade dos produtos.",
  },
  {
    icon: Heart,
    title: "Valores",
    description: "Qualidade sem compromisso, honestidade nas relações comerciais, atendimento humanizado e total conformidade com as normas INMETRO e ANP.",
  },
];

const differentials = [
  {
    icon: ShieldCheck,
    title: "Certificação INMETRO",
    description: "Todos os produtos em conformidade com as normas brasileiras",
  },
  {
    icon: Truck,
    title: "Entrega Nacional",
    description: "Atendemos todos os 27 estados brasileiros com frete competitivo",
  },
  {
    icon: Users,
    title: "Suporte Técnico",
    description: "Equipe especializada para orientação na escolha e instalação",
  },
  {
    icon: Clock,
    title: "Agilidade",
    description: "Estoque próprio para pronta entrega dos principais produtos",
  },
  {
    icon: Award,
    title: "Garantia de Fábrica",
    description: "Produtos originais com nota fiscal e garantia do fabricante",
  },
  {
    icon: CheckCircle2,
    title: "Empresa Verificada",
    description: "Reputação confirmada no Reclame Aqui e redes sociais",
  },
];

export default function AboutUs() {
  const { data: settings } = useStoreSettings();
  const whatsappUrl = getWhatsAppUrl(settings?.whatsappUrl || "", WHATSAPP_MESSAGES.aboutUs);
  
  return (
    <Layout>
      <SEO 
        title="Sobre Nós" 
        description="Conheça a Rei das Bombas: mais de 10 anos de experiência em equipamentos para postos de combustível. Distribuidor autorizado com certificação INMETRO e entrega em todo Brasil."
        url="/sobre-nos"
      />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 md:py-24">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Building2 className="h-4 w-4" />
              Institucional
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-6">
              Sobre a Rei das Bombas
            </h1>
            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
              Especialistas em equipamentos e peças para postos de combustível, 
              frotas próprias e sistemas de abastecimento industrial.
            </p>
          </div>
        </div>
      </section>

      {/* Nossa História */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                Nossa História
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  A <strong className="text-gray-900">Rei das Bombas</strong> nasceu da paixão pelo setor de 
                  combustíveis e da identificação de uma necessidade real no mercado: oferecer 
                  equipamentos de qualidade com atendimento técnico especializado.
                </p>
                <p>
                  Com mais de uma década de atuação, nos consolidamos como uma das principais 
                  distribuidoras de peças e equipamentos para postos de serviços no Brasil. 
                  Trabalhamos com as melhores marcas do mercado, incluindo <strong className="text-gray-900">Gilbarco</strong>, 
                  <strong className="text-gray-900"> Wayne</strong> e outros fabricantes renomados.
                </p>
                <p>
                  Nossa sede está localizada em Belo Horizonte, Minas Gerais, mas atendemos 
                  clientes em todos os estados brasileiros, sempre com o compromisso de 
                  entregar produtos originais, com nota fiscal e garantia de fábrica.
                </p>
                <p>
                  Ao longo dos anos, construímos uma reputação sólida baseada na honestidade, 
                  no conhecimento técnico e no relacionamento de confiança com nossos clientes.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 md:p-12">
              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Missão, Visão e Valores */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Missão, Visão e Valores
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Os pilares que guiam nossa atuação no mercado de equipamentos para postos
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((item, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Por que escolher a Rei das Bombas?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Diferenciais que fazem da nossa empresa a melhor escolha para seu posto
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {differentials.map((item, index) => (
              <div 
                key={index} 
                className="flex items-start gap-4 p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary to-primary/80">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center text-white">
            <MessageCircle className="h-12 w-12 mx-auto mb-6 opacity-90" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Pronto para equipar seu posto?
            </h2>
            <p className="text-lg opacity-90 mb-8">
              Entre em contato com nossa equipe técnica e receba uma cotação personalizada 
              para suas necessidades.
            </p>
            <Button 
              asChild 
              size="lg" 
              className="bg-white text-primary hover:bg-gray-100 font-semibold px-8"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5 mr-2" />
                Falar com Especialista
              </a>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
