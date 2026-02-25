import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Instagram, MessageCircle, Truck, ShieldCheck, FileCheck, ExternalLink } from "lucide-react";
import logo from "@/assets/logo.png";
import mercadoPagoLogo from "@/assets/mercado-pago-logo.svg";
import seloReclameAqui from "@/assets/selo-reclame-aqui.webp";
import { useStoreSettings, getWhatsAppUrl } from "@/hooks/useStoreSettings";
import { WHATSAPP_MESSAGES, STORE_DEFAULTS } from "@/lib/constants";

// Estados atendidos organizados por região
const SERVICE_REGIONS = {
  "Sudeste": ["SP", "RJ", "MG", "ES"],
  "Sul": ["PR", "SC", "RS"],
  "Centro-Oeste": ["GO", "MT", "MS", "DF"],
  "Nordeste": ["BA", "PE", "CE", "MA", "PB", "RN", "AL", "SE", "PI"],
  "Norte": ["PA", "AM", "RO", "AC", "AP", "RR", "TO"]
};

export function Footer() {
  const { data: settings } = useStoreSettings();
  const whatsappUrl = getWhatsAppUrl(settings?.whatsappUrl || "", WHATSAPP_MESSAGES.default);

  return (
    <footer className="bg-gray-100 border-t border-gray-200 text-gray-700">
      {/* National Coverage Banner */}
      <div className="bg-gray-900 py-6">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Entregamos e Instalamos em Todo o Brasil</h3>
                <p className="text-gray-400 text-xs">Atendimento técnico especializado em todas as regiões</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(SERVICE_REGIONS).map(([region, states]) => (
                <div key={region} className="text-center">
                  <span className="text-[10px] text-gray-500 block mb-1">{region}</span>
                  <div className="flex gap-1">
                    {states.map((state) => (
                      <span 
                        key={state}
                        className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded"
                      >
                        {state}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link to="/" className="inline-block">
              <img 
                src={logo} 
                alt="Rei das Bombas" 
                width={120}
                height={40}
                loading="lazy"
                decoding="async"
                className="h-10 w-auto" 
              />
            </Link>
            <p className="text-xs text-gray-600 leading-relaxed">
              Distribuidor de equipamentos e peças para postos de combustível. Qualidade industrial e suporte técnico.
            </p>
            <div className="flex items-center gap-2">
              <a 
                href={settings?.social.facebook || STORE_DEFAULTS.social.facebook} 
                target="_blank" 
                rel="noopener noreferrer"
                className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href={settings?.social.instagram || STORE_DEFAULTS.social.instagram} 
                target="_blank" 
                rel="noopener noreferrer"
                className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a 
                href={STORE_DEFAULTS.social.reclameAqui} 
                target="_blank" 
                rel="noopener noreferrer"
                className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                aria-label="Reclame Aqui"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider mb-3 text-gray-900">
              Produtos
            </h3>
            <ul className="space-y-2">
              <li><Link to="/categoria/bicos" className="text-xs text-gray-600 hover:text-primary transition-colors">Bicos</Link></li>
              <li><Link to="/categoria/mangueiras" className="text-xs text-gray-600 hover:text-primary transition-colors">Mangueiras</Link></li>
              <li><Link to="/categoria/filtros" className="text-xs text-gray-600 hover:text-primary transition-colors">Filtros</Link></li>
              <li><Link to="/categoria/valvulas" className="text-xs text-gray-600 hover:text-primary transition-colors">Válvulas</Link></li>
              <li><Link to="/produtos" className="text-xs text-gray-600 hover:text-primary transition-colors">Ver Todos</Link></li>
            </ul>
          </div>

          {/* Institucional */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider mb-3 text-gray-900">
              Institucional
            </h3>
            <ul className="space-y-2">
              <li><Link to="/sobre-nos" className="text-xs text-gray-600 hover:text-primary transition-colors">Sobre Nós</Link></li>
              <li><Link to="/politica-privacidade" className="text-xs text-gray-600 hover:text-primary transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/termos-uso" className="text-xs text-gray-600 hover:text-primary transition-colors">Termos de Uso</Link></li>
              <li><Link to="/trocas-devolucoes" className="text-xs text-gray-600 hover:text-primary transition-colors">Trocas e Devoluções</Link></li>
              <li><Link to="/contato" className="text-xs text-gray-600 hover:text-primary transition-colors">Contato</Link></li>
              <li><Link to="/rastrear" className="text-xs text-gray-600 hover:text-primary transition-colors">Rastrear Pedido</Link></li>
              <li><Link to="/rastrear-envio" className="text-xs text-gray-600 hover:text-primary transition-colors">Rastrear Envio</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider mb-3 text-gray-900">
              Contato
            </h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-green-600 hover:text-green-700 transition-colors font-semibold"
                >
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp: {settings?.whatsapp || STORE_DEFAULTS.whatsapp}
                </a>
              </li>
              <li>
                <a href={`tel:+55${settings?.whatsappRaw || STORE_DEFAULTS.whatsappRaw}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary transition-colors">
                  <Phone className="h-3 w-3" />
                  {settings?.phone || STORE_DEFAULTS.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings?.email || STORE_DEFAULTS.email}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary transition-colors">
                  <Mail className="h-3 w-3" />
                  {settings?.email || STORE_DEFAULTS.email}
                </a>
              </li>
              <li>
                <span className="flex items-start gap-2 text-xs text-gray-600">
                  <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                  {settings?.address.street || STORE_DEFAULTS.address.street}, {settings?.address.number || STORE_DEFAULTS.address.number}<br />
                  {settings?.address.neighborhood || STORE_DEFAULTS.address.neighborhood} - {settings?.address.city || STORE_DEFAULTS.address.city}/{settings?.address.state || STORE_DEFAULTS.address.state}<br />
                  CEP: {settings?.address.zip || STORE_DEFAULTS.address.zip}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* SEO Authority Keywords Section - E-E-A-T */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3 font-medium">
            Especialidades e Serviços
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              "Revendedor de Bombas Gilbarco",
              "Peças para Postos Wayne",
              "Instalação de Dispensers de Combustível",
              "Equipamentos em conformidade com Portaria INMETRO",
              "Assistência Técnica para Bombas",
              "Medidores de Tanque ANP",
              "Automação de Postos de Serviços",
              "Peças para Frotas Próprias",
            ].map((keyword) => (
              <span
                key={keyword}
                className="text-[10px] text-gray-500 bg-gray-200 px-2 py-1 rounded"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Certificações e Verificações */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-4 font-medium text-center">
            Certificações e Verificações
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 bg-gray-200 px-3 py-2 rounded">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-xs text-gray-700 font-medium">INMETRO</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-200 px-3 py-2 rounded">
              <FileCheck className="h-5 w-5 text-primary" />
              <span className="text-xs text-gray-700 font-medium">ANP</span>
            </div>
            <a 
              href={STORE_DEFAULTS.social.reclameAqui} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img 
                src={seloReclameAqui} 
                alt="Verificada por Reclame Aqui" 
                width={80}
                height={48}
                loading="lazy"
                decoding="async"
                className="h-12 w-auto"
              />
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 pt-6 border-t border-gray-300 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-gray-500">
            © {new Date().getFullYear()} {settings?.storeName || STORE_DEFAULTS.storeName}. CNPJ: {settings?.cnpj || STORE_DEFAULTS.cnpj}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Pagamento seguro</span>
            <img 
              src={mercadoPagoLogo} 
              alt="Mercado Pago" 
              width={60}
              height={20}
              loading="lazy"
              decoding="async"
              className="h-5 w-auto"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
