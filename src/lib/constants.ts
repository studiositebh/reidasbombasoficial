// Centralized store defaults and message templates
// These are fallback values used when store_settings cannot be fetched from the database

export const STORE_DEFAULTS = {
  whatsapp: "(31) 9428-8578",
  whatsappRaw: "553194288578",
  phone: "(31) 9428-8578",
  email: "contato@reidasbombasoficial.com.br",
  cnpj: "32.722.864/0001-03",
  storeName: "Rei das Bombas",
  address: {
    street: "R. Arlíndo dos Santos",
    number: "123",
    neighborhood: "Palmares",
    city: "Belo Horizonte",
    state: "MG",
    zip: "31160-640",
  },
  social: {
    instagram: "https://www.instagram.com/reidasbombasoficial/",
    facebook: "https://www.facebook.com/ReidasBombasOficial",
    reclameAqui: "https://www.reclameaqui.com.br/empresa/rei-das-bombas-tudo-para-posto-ltda/",
  },
  hours: "Segunda a Sexta: 08:00 - 18:00",
};

export const WHATSAPP_MESSAGES = {
  default: "Olá, vim pelo site e preciso de cotação.",
  support: "Olá, preciso de suporte técnico.",
  contact: "Olá, vim pelo site e preciso de atendimento.",
  faq: "Olá! Tenho uma dúvida sobre equipamentos para postos.",
  order: (orderNumber: string) =>
    `Olá, acabei de fazer o pedido #${orderNumber} no site Rei das Bombas. Gostaria de confirmar o pagamento/entrega.`,
  tracking: (orderId?: string) =>
    orderId
      ? `Olá! Gostaria de informações sobre meu pedido #${orderId.slice(0, 8)}.`
      : "Olá! Gostaria de informações sobre meu pedido.",
  aboutUs: "Olá, vim pelo site e gostaria de mais informações.",
  help: "Olá, preciso de ajuda com meu pedido.",
};
