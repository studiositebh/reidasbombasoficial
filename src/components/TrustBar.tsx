import { Truck, Shield, CreditCard, Headphones } from "lucide-react";

const benefits = [
  {
    icon: Truck,
    title: "Frete Grátis",
    subtitle: "Acima de R$ 500 para todo Brasil",
  },
  {
    icon: Shield,
    title: "Garantia de Fábrica",
    subtitle: "Produtos com nota fiscal",
  },
  {
    icon: CreditCard,
    title: "Até 12x sem Juros",
    subtitle: "Parcele no cartão de crédito",
  },
  {
    icon: Headphones,
    title: "Atendimento Técnico",
    subtitle: "Suporte especializado B2B",
  },
];

export function TrustBar() {
  return (
    <section className="bg-gray-50 border-b border-gray-200">
      <div className="container-custom py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {benefits.map((item) => (
            <div key={item.title} className="flex items-center gap-3 text-sm">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0" aria-hidden="true">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                <p className="text-xs text-gray-600">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
