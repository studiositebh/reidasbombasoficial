import { MessageCircle } from "lucide-react";
import { useStoreSettings, getWhatsAppUrl } from "@/hooks/useStoreSettings";
import { WHATSAPP_MESSAGES } from "@/lib/constants";

export function WhatsAppFloatingButton() {
  const { data: settings } = useStoreSettings();
  const whatsappUrl = getWhatsAppUrl(settings?.whatsappUrl || "", WHATSAPP_MESSAGES.default);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all group"
      aria-label="Fale com um Consultor Técnico via WhatsApp - Clique para abrir conversa"
      title="Abrir conversa no WhatsApp"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
      <span className="hidden sm:inline font-semibold text-sm whitespace-nowrap">
        Fale com um Consultor Técnico
      </span>
      
      {/* Pulse animation ring - CSS-only, no JS */}
      <span className="absolute inset-0 rounded-full bg-green-600 animate-ping opacity-20" aria-hidden="true" />
    </a>
  );
}
