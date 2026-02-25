import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackingEvent {
  date: string;
  time: string;
  location: string;
  status: string;
  description: string;
}

interface TrackingResponse {
  success: boolean;
  tracking_code: string;
  carrier: string;
  events: TrackingEvent[];
  delivered: boolean;
  error?: string;
}

// Correios tracking codes pattern: 13 characters (e.g., BR123456789BR)
const CORREIOS_PATTERN = /^[A-Z]{2}\d{9}[A-Z]{2}$/i;

// Parse Correios API response
function parseCorreiosResponse(data: any): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  
  if (!data || !data.objetos || !Array.isArray(data.objetos) || data.objetos.length === 0) {
    return events;
  }
  
  const objeto = data.objetos[0];
  
  if (!objeto.eventos || !Array.isArray(objeto.eventos)) {
    return events;
  }
  
  for (const evento of objeto.eventos) {
    try {
      const dateTime = new Date(evento.dtHrCriado);
      
      // Build location string
      let location = "Brasil";
      if (evento.unidade) {
        const unidade = evento.unidade;
        if (unidade.endereco) {
          const endereco = unidade.endereco;
          location = [endereco.cidade, endereco.uf].filter(Boolean).join(" - ") || "Brasil";
        } else if (unidade.nome) {
          location = unidade.nome;
        }
      }
      
      // Get description
      let description = evento.descricao || "";
      
      // Add destination info if available
      if (evento.unidadeDestino) {
        const destino = evento.unidadeDestino;
        if (destino.endereco) {
          const endDest = destino.endereco;
          const destLocation = [endDest.cidade, endDest.uf].filter(Boolean).join(" - ");
          if (destLocation) {
            description += ` - Destino: ${destLocation}`;
          }
        }
      }
      
      events.push({
        date: dateTime.toLocaleDateString("pt-BR"),
        time: dateTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        location,
        status: mapCorreiosStatus(evento.descricao || ""),
        description,
      });
    } catch (e) {
      console.error("Error parsing event:", e);
    }
  }
  
  return events;
}

// Map Correios descriptions to user-friendly status
function mapCorreiosStatus(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes("entregue")) return "Entregue";
  if (desc.includes("saiu para entrega")) return "Saiu para Entrega";
  if (desc.includes("em trânsito") || desc.includes("encaminhado")) return "Em Trânsito";
  if (desc.includes("postado") || desc.includes("objeto postado")) return "Postado";
  if (desc.includes("fiscalização") || desc.includes("alfândega")) return "Em Fiscalização";
  if (desc.includes("aguardando retirada")) return "Aguardando Retirada";
  if (desc.includes("tentativa de entrega")) return "Tentativa de Entrega";
  if (desc.includes("devolvido") || desc.includes("devolução")) return "Devolvido";
  if (desc.includes("extraviado")) return "Extraviado";
  
  return "Atualização";
}

// Check if package is delivered
function isDelivered(events: TrackingEvent[]): boolean {
  return events.some(e => 
    e.status === "Entregue" || 
    e.description.toLowerCase().includes("entregue")
  );
}

// Fetch from Correios API (public endpoint)
async function fetchCorreiosTracking(code: string): Promise<TrackingResponse> {
  try {
    // Use the public Correios SRO API
    const url = `https://proxyapp.correios.com.br/v1/sro-rastro/${code}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    if (!response.ok) {
      // Try alternative endpoint
      return await fetchCorreiosAlternative(code);
    }
    
    const data = await response.json();
    const events = parseCorreiosResponse(data);
    
    if (events.length === 0) {
      return {
        success: false,
        tracking_code: code,
        carrier: "Correios",
        events: [],
        delivered: false,
        error: "Nenhum evento encontrado para este código",
      };
    }
    
    return {
      success: true,
      tracking_code: code,
      carrier: "Correios",
      events,
      delivered: isDelivered(events),
    };
  } catch (error) {
    console.error("Correios API error:", error);
    return await fetchCorreiosAlternative(code);
  }
}

// Alternative method using a different approach
async function fetchCorreiosAlternative(code: string): Promise<TrackingResponse> {
  try {
    // Try the legacy API endpoint
    const url = "https://www.linkcorreios.com.br/";
    
    const response = await fetch(`${url}${code}`, {
      method: "GET",
      headers: {
        "Accept": "text/html",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch tracking");
    }
    
    const html = await response.text();
    
    // Parse the HTML response for tracking events
    const events = parseHtmlTracking(html);
    
    if (events.length === 0) {
      return {
        success: false,
        tracking_code: code,
        carrier: "Correios",
        events: [],
        delivered: false,
        error: "Objeto não encontrado ou ainda não postado",
      };
    }
    
    return {
      success: true,
      tracking_code: code,
      carrier: "Correios",
      events,
      delivered: isDelivered(events),
    };
  } catch (error) {
    console.error("Alternative tracking error:", error);
    return {
      success: false,
      tracking_code: code,
      carrier: "Correios",
      events: [],
      delivered: false,
      error: "Não foi possível rastrear o objeto. Tente novamente mais tarde.",
    };
  }
}

// Parse HTML from linkcorreios
function parseHtmlTracking(html: string): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  
  // Look for tracking data in the HTML
  // This is a simplified parser - in production you'd use a proper HTML parser
  const eventPattern = /<li class="linha_status"[^>]*>([\s\S]*?)<\/li>/gi;
  const matches = html.matchAll(eventPattern);
  
  for (const match of matches) {
    try {
      const content = match[1];
      
      // Extract date/time
      const dateMatch = content.match(/(\d{2}\/\d{2}\/\d{4})/);
      const timeMatch = content.match(/(\d{2}:\d{2})/);
      
      // Extract status (usually in bold or strong)
      const statusMatch = content.match(/<b>([^<]+)<\/b>|<strong>([^<]+)<\/strong>/i);
      
      // Extract location
      const locationMatch = content.match(/(?:Local:|Origem:|Destino:)\s*([^<\n]+)/i);
      
      if (dateMatch) {
        events.push({
          date: dateMatch[1],
          time: timeMatch ? timeMatch[1] : "00:00",
          location: locationMatch ? locationMatch[1].trim() : "Brasil",
          status: statusMatch ? (statusMatch[1] || statusMatch[2]).trim() : "Atualização",
          description: content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200),
        });
      }
    } catch (e) {
      console.error("Error parsing HTML event:", e);
    }
  }
  
  return events;
}

// Generic tracking for other carriers (placeholder)
async function fetchGenericTracking(code: string, carrier: string): Promise<TrackingResponse> {
  // For non-Correios carriers, return a basic response
  // In a real implementation, you'd add specific APIs for each carrier
  return {
    success: true,
    tracking_code: code,
    carrier,
    events: [
      {
        date: new Date().toLocaleDateString("pt-BR"),
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        location: "Sistema",
        status: "Em Transporte",
        description: `Pacote em transporte via ${carrier}. Para rastreamento detalhado, consulte o site da transportadora.`,
      },
    ],
    delivered: false,
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tracking_code, carrier } = await req.json();

    if (!tracking_code || typeof tracking_code !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Código de rastreio é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const code = tracking_code.trim().toUpperCase();
    const carrierName = carrier?.trim() || "Correios";
    
    let result: TrackingResponse;
    
    // Check if it's a Correios code
    if (CORREIOS_PATTERN.test(code) || carrierName.toLowerCase().includes("correio")) {
      result = await fetchCorreiosTracking(code);
    } else {
      // For other carriers, use generic response
      result = await fetchGenericTracking(code, carrierName);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in track-correios function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Erro ao rastrear encomenda. Tente novamente." 
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
