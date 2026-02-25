import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Database, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// SQL Schema for reference
const schemaSQL = `-- ==========================================
-- REI DAS BOMBAS - E-COMMERCE SCHEMA
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- PRODUCTS TABLE
-- ==========================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_metadata ON public.products USING GIN(metadata);

-- ==========================================
-- VARIANTS TABLE (Modelo Híbrido)
-- ==========================================
CREATE TABLE public.variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  stock_level INTEGER NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  price_modifier NUMERIC(10,2) DEFAULT 0,
  attrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variants_product_id ON public.variants(product_id);
CREATE INDEX idx_variants_attrs ON public.variants USING GIN(attrs);
CREATE INDEX idx_variants_sku ON public.variants(sku);

-- ==========================================
-- ORDERS TABLE
-- ==========================================
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'shipped', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  status public.order_status DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_address JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ORDER ITEMS TABLE
-- ==========================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- RPC FUNCTION: DECREMENT STOCK (Atômico)
-- ==========================================
CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_variant RECORD;
BEGIN
  SELECT stock_level, sku INTO v_variant
  FROM public.variants
  WHERE id = p_variant_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VARIANT_NOT_FOUND');
  END IF;
  
  v_current_stock := v_variant.stock_level;
  
  IF v_current_stock < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_STOCK', 'available', v_current_stock);
  END IF;
  
  v_new_stock := v_current_stock - p_quantity;
  
  UPDATE public.variants SET stock_level = v_new_stock WHERE id = p_variant_id;
  
  RETURN jsonb_build_object('success', true, 'new_stock', v_new_stock);
END;
$$;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are publicly readable" ON public.products FOR SELECT USING (is_active = true);

ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Variants are publicly readable" ON public.variants FOR SELECT USING (is_active = true);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
`;

const seedSQL = `-- ==========================================
-- SEED DATA - REI DAS BOMBAS
-- Produtos para Postos de Combustível
-- ==========================================

-- Produto 1: Bico de Abastecimento Automático 11A
INSERT INTO public.products (title, slug, description, base_price, image_url, category, metadata)
VALUES (
  'Bico de Abastecimento Automático 11A',
  'bico-abastecimento-automatico-11a',
  'Bico de abastecimento automático modelo 11A, ideal para postos de combustível. Possui sistema de corte automático, gatilho ergonômico e alta durabilidade. Compatível com gasolina, etanol e diesel.',
  1299.90,
  'https://images.unsplash.com/photo-1609921141835-710b7fa6e438?w=800',
  'Bicos de Abastecimento',
  '{"brand": "OPW", "warranty": "2 anos", "origin": "Importado", "flow_rate": "75 L/min"}'::jsonb
);

-- Produto 2: Mangueira de Abastecimento Tramada em Aço
INSERT INTO public.products (title, slug, description, base_price, image_url, category, metadata)
VALUES (
  'Mangueira de Abastecimento Tramada em Aço',
  'mangueira-abastecimento-tramada-aco',
  'Mangueira de alta resistência com trançado em aço inoxidável. Suporta alta pressão e é resistente a combustíveis derivados de petróleo e álcool. Ideal para uso profissional em postos.',
  459.90,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  'Mangueiras',
  '{"brand": "Parker", "warranty": "1 ano", "material": "Borracha NBR + Aço Inox", "pressure": "300 PSI"}'::jsonb
);

-- Produto 3: Filtro Prensa de Combustível
INSERT INTO public.products (title, slug, description, base_price, image_url, category, metadata)
VALUES (
  'Filtro Prensa de Combustível',
  'filtro-prensa-combustivel',
  'Filtro prensa industrial para filtragem de combustíveis. Remove impurezas, água e partículas sólidas. Essencial para manter a qualidade do combustível e proteger os equipamentos do posto.',
  2899.90,
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
  'Filtros',
  '{"brand": "Cim-Tek", "warranty": "1 ano", "type": "Industrial", "capacity": "200 L/min"}'::jsonb
);

-- Variantes do Bico de Abastecimento
INSERT INTO public.variants (product_id, sku, stock_level, price_modifier, attrs)
SELECT id, 'BICO-11A-VERM-34-FINA', 25, 0, '{"cor": "Vermelho", "entrada": "3/4 pol", "ponteira": "fina"}'::jsonb
FROM public.products WHERE slug = 'bico-abastecimento-automatico-11a';

INSERT INTO public.variants (product_id, sku, stock_level, price_modifier, attrs)
SELECT id, 'BICO-11A-VERD-34-FINA', 18, 0, '{"cor": "Verde", "entrada": "3/4 pol", "ponteira": "fina"}'::jsonb
FROM public.products WHERE slug = 'bico-abastecimento-automatico-11a';

INSERT INTO public.variants (product_id, sku, stock_level, price_modifier, attrs)
SELECT id, 'BICO-11A-PRET-34-FINA', 30, 0, '{"cor": "Preto", "entrada": "3/4 pol", "ponteira": "fina"}'::jsonb
FROM public.products WHERE slug = 'bico-abastecimento-automatico-11a';

-- Variantes da Mangueira
INSERT INTO public.variants (product_id, sku, stock_level, price_modifier, attrs)
SELECT id, 'MANG-5M-34-FIXO', 40, 0, '{"comprimento": "5 metros", "diametro": "3/4 pol", "terminais": "fixos"}'::jsonb
FROM public.products WHERE slug = 'mangueira-abastecimento-tramada-aco';

INSERT INTO public.variants (product_id, sku, stock_level, price_modifier, attrs)
SELECT id, 'MANG-5M-1-GIRA', 22, 89.90, '{"comprimento": "5 metros", "diametro": "1 pol", "terminais": "giratórios"}'::jsonb
FROM public.products WHERE slug = 'mangueira-abastecimento-tramada-aco';

-- Variantes do Filtro Prensa
INSERT INTO public.variants (product_id, sku, stock_level, price_modifier, attrs)
SELECT id, 'FILT-ALTA-PAPEL-20', 12, 0, '{"capacidade": "Alta Vazão", "elemento_filtrante": "papel", "micragem": "20 microns"}'::jsonb
FROM public.products WHERE slug = 'filtro-prensa-combustivel';
`;

type TableStatus = "checking" | "exists" | "missing" | "error";

interface TableCheck {
  name: string;
  status: TableStatus;
  count?: number;
  error?: string;
}

export default function AdminSetup() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("SQL copiado para a área de transferência!");
    setTimeout(() => setCopied(null), 2000);
  };

  // Check connection and tables
  const { data: connectionStatus, isLoading, refetch } = useQuery({
    queryKey: ["admin-setup-check"],
    queryFn: async () => {
      const tables: TableCheck[] = [
        { name: "products", status: "checking" },
        { name: "variants", status: "checking" },
        { name: "orders", status: "checking" },
        { name: "order_items", status: "checking" },
      ];

      const results: TableCheck[] = [];

      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table.name as "products" | "variants" | "orders" | "order_items")
            .select("*", { count: "exact", head: true });

          if (error) {
            results.push({
              name: table.name,
              status: error.message.includes("does not exist") ? "missing" : "error",
              error: error.message,
            });
          } else {
            results.push({
              name: table.name,
              status: "exists",
              count: count ?? 0,
            });
          }
        } catch (err) {
          results.push({
            name: table.name,
            status: "error",
            error: String(err),
          });
        }
      }

      return {
        connected: true,
        tables: results,
      };
    },
  });

  const allTablesExist = connectionStatus?.tables.every((t) => t.status === "exists");

  return (
    <Layout>
      <div className="container-custom py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Database className="h-4 w-4" />
              Setup Wizard
            </div>
            <h1 className="text-3xl font-bold text-foreground">Configuração do Banco de Dados</h1>
            <p className="mt-2 text-muted-foreground">
              Verifique a conexão e configure o schema do e-commerce Rei das Bombas
            </p>
          </div>

          {/* Connection Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Status da Conexão
                    {allTablesExist && (
                      <Badge className="bg-green-100 text-green-800">Tudo OK</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Verifique se as tabelas estão configuradas</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Verificar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {connectionStatus?.tables.map((table) => (
                  <div
                    key={table.name}
                    className={`p-4 rounded-lg border ${
                      table.status === "exists"
                        ? "bg-green-50 border-green-200"
                        : table.status === "missing"
                        ? "bg-yellow-50 border-yellow-200"
                        : table.status === "error"
                        ? "bg-red-50 border-red-200"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {table.status === "exists" && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {table.status === "missing" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                      {table.status === "error" && <XCircle className="h-4 w-4 text-red-600" />}
                      {table.status === "checking" && <RefreshCw className="h-4 w-4 animate-spin" />}
                      <span className="font-mono text-sm font-medium">{table.name}</span>
                    </div>
                    {table.status === "exists" && (
                      <p className="text-xs text-muted-foreground">{table.count} registros</p>
                    )}
                    {table.status === "missing" && (
                      <p className="text-xs text-yellow-700">Tabela não encontrada</p>
                    )}
                    {table.status === "error" && (
                      <p className="text-xs text-red-700 truncate" title={table.error}>
                        {table.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {allTablesExist && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-800 font-medium flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Banco de dados configurado corretamente!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Todas as tabelas foram encontradas e estão prontas para uso.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schema SQL */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Schema SQL</CardTitle>
                  <CardDescription>
                    Estrutura completa do banco de dados com RLS e função RPC
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(schemaSQL, "schema")}
                >
                  {copied === "schema" ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied === "schema" ? "Copiado!" : "Copiar SQL"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
                <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                  {schemaSQL}
                </pre>
              </div>
              <div className="mt-4 p-4 bg-accent rounded-lg">
                <h4 className="font-medium text-foreground mb-2">📋 Instruções</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Copie o SQL acima clicando no botão "Copiar SQL"</li>
                  <li>Acesse o painel do Supabase → SQL Editor</li>
                  <li>Cole o SQL e execute</li>
                  <li>Volte aqui e clique em "Verificar" para confirmar</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Seed SQL */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dados de Teste (Seed) - Rei das Bombas</CardTitle>
                  <CardDescription>
                    Produtos de posto de combustível para testar a loja
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(seedSQL, "seed")}
                >
                  {copied === "seed" ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied === "seed" ? "Copiado!" : "Copiar Seed"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg overflow-auto max-h-64">
                <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                  {seedSQL}
                </pre>
              </div>
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="font-medium text-foreground text-sm">🔴 Bico de Abastecimento</p>
                  <p className="text-xs text-muted-foreground mt-1">3 variantes (cores)</p>
                </div>
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="font-medium text-foreground text-sm">⚫ Mangueira Tramada</p>
                  <p className="text-xs text-muted-foreground mt-1">2 variantes (diâmetro)</p>
                </div>
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="font-medium text-foreground text-sm">🔵 Filtro Prensa</p>
                  <p className="text-xs text-muted-foreground mt-1">1 variante (capacidade)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RPC Function Info */}
          <Card>
            <CardHeader>
              <CardTitle>⚡ Função RPC: decrement_stock</CardTitle>
              <CardDescription>
                Garante transações atômicas para evitar race conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Como usar no código:</h4>
                  <pre className="text-sm font-mono text-foreground">{`const { data, error } = await supabase
  .rpc('decrement_stock', {
    p_variant_id: 'uuid-da-variante',
    p_quantity: 1
  });

if (data.success) {
  console.log('Novo estoque:', data.new_stock);
} else {
  console.error('Erro:', data.error);
}`}</pre>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-medium text-green-800">✓ Sucesso</p>
                    <code className="text-xs text-green-700">
                      {`{success: true, new_stock: 24}`}
                    </code>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-red-800">✗ Erro</p>
                    <code className="text-xs text-red-700">
                      {`{success: false, error: "INSUFFICIENT_STOCK"}`}
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
