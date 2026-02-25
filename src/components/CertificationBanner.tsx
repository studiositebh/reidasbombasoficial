import React from "react";
import { ShieldCheck, Award, BadgeCheck, FileCheck } from "lucide-react";

const certifications = [
  {
    icon: ShieldCheck,
    title: "INMETRO",
    description: "Equipamentos certificados"
  },
  {
    icon: FileCheck,
    title: "ANP",
    description: "Conformidade regulatória"
  },
  {
    icon: Award,
    title: "Garantia de Fábrica",
    description: "Nota fiscal inclusa"
  },
  {
    icon: BadgeCheck,
    title: "ISO 9001",
    description: "Qualidade assegurada"
  }
];

export function CertificationBanner() {
  return (
    <section className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 py-8" aria-labelledby="certification-heading">
      <div className="container-custom">
        <div className="text-center mb-6">
          <h2 id="certification-heading" className="text-lg md:text-xl font-bold text-white">
            Equipamentos em Conformidade com as Normas do{" "}
            <span className="text-primary">INMETRO</span> e Portarias da{" "}
            <span className="text-primary">ANP</span>
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            Segurança e qualidade certificadas para sua operação
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {certifications.map((cert) => (
            <div 
              key={cert.title}
              className="flex flex-col items-center text-center p-4 rounded-lg bg-white/5 border border-white/10 hover:border-primary/50 transition-all group"
            >
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-3 group-hover:bg-primary/30 transition-colors">
                <cert.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-white text-sm">{cert.title}</h3>
              <p className="text-gray-400 text-xs mt-1">{cert.description}</p>
            </div>
          ))}
        </div>

        {/* Trust Statement */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Todos os produtos comercializados passam por rigoroso controle de qualidade e são acompanhados de documentação técnica completa.
          </p>
        </div>
      </div>
    </section>
  );
}
