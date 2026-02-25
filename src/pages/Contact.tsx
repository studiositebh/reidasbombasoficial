import { useState } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { 
  Phone, Mail, MapPin, MessageCircle, Clock,
  Facebook, Instagram, ExternalLink, Send, Loader2, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Helmet } from "react-helmet-async";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useStoreSettings, getWhatsAppUrl } from "@/hooks/useStoreSettings";
import { WHATSAPP_MESSAGES, STORE_DEFAULTS } from "@/lib/constants";

// Generate contact schema dynamically based on settings
const generateContactSchema = (settings: any) => ({
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "mainEntity": {
    "@type": "LocalBusiness",
    "name": settings?.storeName || STORE_DEFAULTS.storeName,
    "telephone": `+55-${(settings?.whatsappRaw || STORE_DEFAULTS.whatsappRaw).replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3")}`,
    "email": settings?.email || STORE_DEFAULTS.email,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": `${settings?.address?.street || STORE_DEFAULTS.address.street}, ${settings?.address?.number || STORE_DEFAULTS.address.number}`,
      "addressLocality": settings?.address?.city || STORE_DEFAULTS.address.city,
      "addressRegion": settings?.address?.state || STORE_DEFAULTS.address.state,
      "postalCode": settings?.address?.zip || STORE_DEFAULTS.address.zip,
      "addressCountry": "BR"
    },
    "openingHours": "Mo-Fr 08:00-18:00",
    "sameAs": [
      settings?.social?.instagram || STORE_DEFAULTS.social.instagram,
      settings?.social?.facebook || STORE_DEFAULTS.social.facebook
    ]
  }
});

// Validation schema
const formSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  email: z.string().trim().email("E-mail inválido").max(255, "E-mail muito longo"),
  phone: z.string().optional().refine(val => !val || val.replace(/\D/g, "").length >= 10, {
    message: "Telefone inválido"
  }),
  message: z.string().trim().min(10, "Mensagem deve ter pelo menos 10 caracteres").max(1000, "Mensagem muito longa")
});

type FormData = z.infer<typeof formSchema>;

export default function Contact() {
  const { data: settings } = useStoreSettings();
  const whatsappUrl = getWhatsAppUrl(settings?.whatsappUrl || "", WHATSAPP_MESSAGES.contact);
  const contactSchema = generateContactSchema(settings);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof FormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("save-lead", {
        body: {
          email: result.data.email,
          name: result.data.name,
          phone: result.data.phone || null,
          notes: result.data.message,
          source: "contact_form"
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar mensagem");

      setIsSuccess(true);
      setFormData({ name: "", email: "", phone: "", message: "" });
      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve.",
      });

      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
      console.error("Contact form error:", err);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente ou entre em contato pelo WhatsApp.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEO 
        title="Contato | Rei das Bombas - Atendimento Técnico Especializado"
        description="Entre em contato com a Rei das Bombas. Atendimento via WhatsApp, telefone e e-mail. Suporte técnico para bombas de combustível e equipamentos para postos."
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(contactSchema)}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16 md:py-24">
        <div className="container-custom text-center">
          <span className="inline-block bg-primary/20 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            Atendimento Especializado
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Fale Conosco
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Nossa equipe técnica está pronta para atender você. Tire dúvidas, solicite orçamentos ou agende uma visita técnica.
          </p>
        </div>
      </section>

      {/* Contact Form + Cards Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Contact Form */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Mail className="h-5 w-5 text-primary" />
                  Envie sua Mensagem
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Preencha o formulário e retornaremos em até 24 horas úteis.
                </p>
              </CardHeader>
              <CardContent>
                {isSuccess ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Mensagem Enviada!
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Obrigado pelo contato. Nossa equipe responderá em breve.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsSuccess(false)}
                    >
                      Enviar nova mensagem
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Seu nome"
                        disabled={isSubmitting}
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="seu@email.com"
                        disabled={isSubmitting}
                        className={errors.email ? "border-destructive" : ""}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone / WhatsApp</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="(31) 99999-9999"
                        disabled={isSubmitting}
                        className={errors.phone ? "border-destructive" : ""}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Mensagem *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Descreva sua dúvida, solicitação de orçamento ou necessidade técnica..."
                        rows={4}
                        disabled={isSubmitting}
                        className={errors.message ? "border-destructive" : ""}
                      />
                      {errors.message && (
                        <p className="text-sm text-destructive">{errors.message}</p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Mensagem
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Contact Cards */}
            <div className="space-y-4">
              {/* WhatsApp Card - Highlighted */}
              <Card className="border-2 border-green-500 bg-green-50 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-lg text-gray-900 mb-1">WhatsApp</h2>
                      <p className="text-sm text-gray-600 mb-3">Resposta rápida em horário comercial</p>
                      <a 
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 font-semibold text-lg hover:text-green-700 transition-colors"
                      >
                        {settings?.whatsapp || STORE_DEFAULTS.whatsapp}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Phone Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-lg text-gray-900 mb-1">Telefone</h2>
                      <p className="text-sm text-gray-600 mb-3">Ligue para nossa central</p>
                      <a 
                        href={`tel:+55${settings?.whatsappRaw || STORE_DEFAULTS.whatsappRaw}`}
                        className="text-primary font-semibold text-lg hover:text-primary/80 transition-colors"
                      >
                        {settings?.phone || STORE_DEFAULTS.phone}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-lg text-gray-900 mb-1">E-mail</h2>
                      <p className="text-sm text-gray-600 mb-3">Para orçamentos e dúvidas técnicas</p>
                      <a 
                        href={`mailto:${settings?.email || STORE_DEFAULTS.email}`}
                        className="text-primary font-semibold hover:text-primary/80 transition-colors break-all"
                      >
                        {settings?.email || STORE_DEFAULTS.email}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-lg text-gray-900 mb-1">Endereço</h2>
                      <p className="text-sm text-gray-600 mb-3">Visite nossa sede</p>
                      <address className="not-italic text-gray-700 leading-relaxed">
                        {settings?.address.street || STORE_DEFAULTS.address.street}, {settings?.address.number || STORE_DEFAULTS.address.number}<br />
                        {settings?.address.neighborhood || STORE_DEFAULTS.address.neighborhood}<br />
                        {settings?.address.city || STORE_DEFAULTS.address.city}/{settings?.address.state || STORE_DEFAULTS.address.state}<br />
                        CEP: {settings?.address.zip || STORE_DEFAULTS.address.zip}
                      </address>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Business Hours Section */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gray-900 text-white">
              <CardContent className="p-8 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-bold text-xl mb-2">Horário de Atendimento</h2>
                <p className="text-gray-300 text-lg">{settings?.hours || STORE_DEFAULTS.hours}</p>
                <p className="text-gray-500 text-sm mt-2">Sábados, domingos e feriados: fechado</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Media Section */}
      <section className="py-12 bg-gray-50">
        <div className="container-custom text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Siga-nos nas Redes Sociais</h2>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href={settings?.social.instagram || STORE_DEFAULTS.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <Instagram className="h-5 w-5 text-pink-600" />
              <span className="font-medium text-gray-700">Instagram</span>
            </a>
            <a
              href={settings?.social.facebook || STORE_DEFAULTS.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <Facebook className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-700">Facebook</span>
            </a>
            <a
              href={STORE_DEFAULTS.social.reclameAqui}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <ExternalLink className="h-5 w-5 text-green-600" />
              <span className="font-medium text-gray-700">Reclame Aqui</span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-700">
        <div className="container-custom text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Precisa de Ajuda Agora?
          </h2>
          <p className="text-green-100 mb-8 max-w-xl mx-auto">
            Nossa equipe técnica está online para tirar suas dúvidas e ajudar com orçamentos personalizados.
          </p>
          <Button 
            asChild
            size="lg"
            className="bg-white text-green-700 hover:bg-green-50 font-bold text-lg px-8 py-6 h-auto"
          >
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Iniciar Conversa no WhatsApp
            </a>
          </Button>
          <p className="text-green-200 text-sm mt-4">
            CNPJ: {settings?.cnpj || STORE_DEFAULTS.cnpj}
          </p>
        </div>
      </section>
    </Layout>
  );
}
