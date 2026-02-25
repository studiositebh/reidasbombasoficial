import React from "react";
import { Quote, Star, Building2, Fuel, Truck, Factory } from "lucide-react";

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  companyType: "posto" | "frota" | "distribuidora" | "industria";
  rating: number;
}

interface ClientLogo {
  name: string;
  icon: React.ElementType;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    quote: "Excelente atendimento técnico. As peças chegaram no prazo e a equipe nos ajudou a identificar exatamente o que precisávamos para nossa bomba Gilbarco.",
    author: "Carlos Eduardo",
    role: "Gerente de Manutenção",
    company: "Rede de Postos Mineira",
    companyType: "posto",
    rating: 5,
  },
  {
    id: "2",
    quote: "Parceiro confiável há mais de 3 anos. Sempre temos as peças em estoque e o suporte técnico é diferenciado. Recomendo para qualquer operação de frotas.",
    author: "Roberto Almeida",
    role: "Diretor de Operações",
    company: "Transportadora Nacional",
    companyType: "frota",
    rating: 5,
  },
  {
    id: "3",
    quote: "Certificação INMETRO em dia e documentação completa. Isso é fundamental para nossa operação. A Rei das Bombas entende as necessidades do setor.",
    author: "Fernanda Costa",
    role: "Coordenadora de Compras",
    company: "Distribuidora de Combustíveis",
    companyType: "distribuidora",
    rating: 5,
  },
];

const CLIENT_LOGOS: ClientLogo[] = [
  { name: "Postos de Combustível", icon: Fuel },
  { name: "Frotas Próprias", icon: Truck },
  { name: "Distribuidoras", icon: Building2 },
  { name: "Indústrias", icon: Factory },
];

const COMPANY_ICONS = {
  posto: Fuel,
  frota: Truck,
  distribuidora: Building2,
  industria: Factory,
};

export function SuccessCasesSection() {
  return (
    <section className="py-12 bg-gray-50" aria-labelledby="success-cases-heading">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 id="success-cases-heading" className="text-2xl md:text-3xl font-black text-gray-900 mb-3">
            <span className="text-primary">+500</span> Clientes Atendidos em Todo o Brasil
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Postos de serviços, frotas próprias e distribuidoras confiam na Rei das Bombas para manter suas operações funcionando.
          </p>
        </div>

        {/* Client Types / Logo Placeholders */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {CLIENT_LOGOS.map((client) => (
            <div
              key={client.name}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-gray-200 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="h-14 w-14 rounded-full bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                <client.icon className="h-7 w-7 text-gray-400 group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">{client.name}</span>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial) => {
            const CompanyIcon = COMPANY_ICONS[testimonial.companyType];
            
            return (
              <article
                key={testimonial.id}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                itemScope
                itemType="https://schema.org/Review"
              >
                {/* Quote Icon */}
                <div className="mb-4">
                  <Quote className="h-8 w-8 text-primary/30" />
                </div>

                {/* Rating */}
                <div className="flex gap-0.5 mb-4" itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
                  <meta itemProp="ratingValue" content={testimonial.rating.toString()} />
                  <meta itemProp="bestRating" content="5" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < testimonial.rating
                          ? "fill-primary text-primary"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote 
                  className="text-gray-700 text-sm leading-relaxed mb-6"
                  itemProp="reviewBody"
                >
                  "{testimonial.quote}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CompanyIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm" itemProp="author">
                      {testimonial.author}
                    </p>
                    <p className="text-xs text-gray-500">
                      {testimonial.role} • <span itemProp="name">{testimonial.company}</span>
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Trust Statement */}
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-400">
            Depoimentos de clientes reais. Nomes e empresas preservados por privacidade.
          </p>
        </div>
      </div>
    </section>
  );
}
