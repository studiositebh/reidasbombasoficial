import { useState, useEffect } from "react";
import { Eye, EyeOff, Copy, Check, ExternalLink, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MercadoPagoConfig {
  mp_environment: "sandbox" | "production";
  mp_sandbox_public_key: string;
  mp_sandbox_access_token: string;
  mp_production_public_key: string;
  mp_production_access_token: string;
}

export function MercadoPagoGatewayConfig() {
  const [config, setConfig] = useState<MercadoPagoConfig>({
    mp_environment: "production",
    mp_sandbox_public_key: "",
    mp_sandbox_access_token: "",
    mp_production_public_key: "",
    mp_production_access_token: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState({
    sandbox_public: false,
    sandbox_access: false,
    production_public: false,
    production_access: false,
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("mp_environment, mp_sandbox_public_key, mp_sandbox_access_token, mp_production_public_key, mp_production_access_token")
        .single();

      if (error) throw error;

      if (data) {
        setConfig({
          mp_environment: (data.mp_environment as "sandbox" | "production") || "production",
          mp_sandbox_public_key: data.mp_sandbox_public_key || "",
          mp_sandbox_access_token: data.mp_sandbox_access_token || "",
          mp_production_public_key: data.mp_production_public_key || "",
          mp_production_access_token: data.mp_production_access_token || "",
        });
      }
    } catch (error) {
      console.error("Error fetching MP config:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("store_settings")
        .update({
          mp_environment: config.mp_environment,
          mp_sandbox_public_key: config.mp_sandbox_public_key,
          mp_sandbox_access_token: config.mp_sandbox_access_token,
          mp_production_public_key: config.mp_production_public_key,
          mp_production_access_token: config.mp_production_access_token,
        })
        .eq("id", "00000000-0000-0000-0000-000000000001");

      if (error) throw error;

      toast.success("Configurações do Mercado Pago salvas com sucesso!");
    } catch (error) {
      console.error("Error saving MP config:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copiado!");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const toggleVisibility = (field: keyof typeof showKeys) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const updateConfig = (field: keyof MercadoPagoConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const isConfigured = (env: "sandbox" | "production") => {
    if (env === "sandbox") {
      return config.mp_sandbox_public_key && config.mp_sandbox_access_token;
    }
    return config.mp_production_public_key && config.mp_production_access_token;
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Environment Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Ambiente Ativo
            <Badge variant={config.mp_environment === "sandbox" ? "secondary" : "default"}>
              {config.mp_environment === "sandbox" ? "🧪 Sandbox" : "🚀 Produção"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Selecione qual ambiente será usado para processar pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={config.mp_environment}
            onValueChange={(value) => updateConfig("mp_environment", value)}
            className="grid grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sandbox" id="sandbox" />
              <Label htmlFor="sandbox" className="flex items-center gap-2 cursor-pointer">
                <span>Sandbox (Testes)</span>
                {isConfigured("sandbox") && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Configurado
                  </Badge>
                )}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="production" id="production" />
              <Label htmlFor="production" className="flex items-center gap-2 cursor-pointer">
                <span>Produção</span>
                {isConfigured("production") && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Configurado
                  </Badge>
                )}
              </Label>
            </div>
          </RadioGroup>

          {config.mp_environment === "sandbox" && (
            <Alert className="mt-4 border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                Modo de testes ativo. Use cartões de teste do Mercado Pago. Nenhuma cobrança real será feita.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sandbox Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 Credenciais Sandbox
            {!isConfigured("sandbox") && (
              <Badge variant="destructive">Não configurado</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Use estas credenciais para testar pagamentos sem cobranças reais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sandbox_public">Public Key</Label>
            <div className="flex gap-2">
              <Input
                id="sandbox_public"
                type={showKeys.sandbox_public ? "text" : "password"}
                value={config.mp_sandbox_public_key}
                onChange={(e) => updateConfig("mp_sandbox_public_key", e.target.value)}
                placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => toggleVisibility("sandbox_public")}
              >
                {showKeys.sandbox_public ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleCopy(config.mp_sandbox_public_key, "sandbox_public")}
                disabled={!config.mp_sandbox_public_key}
              >
                {copiedField === "sandbox_public" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sandbox_access">Access Token</Label>
            <div className="flex gap-2">
              <Input
                id="sandbox_access"
                type={showKeys.sandbox_access ? "text" : "password"}
                value={config.mp_sandbox_access_token}
                onChange={(e) => updateConfig("mp_sandbox_access_token", e.target.value)}
                placeholder="TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => toggleVisibility("sandbox_access")}
              >
                {showKeys.sandbox_access ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleCopy(config.mp_sandbox_access_token, "sandbox_access")}
                disabled={!config.mp_sandbox_access_token}
              >
                {copiedField === "sandbox_access" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 Credenciais Produção
            {!isConfigured("production") && (
              <Badge variant="destructive">Não configurado</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Credenciais para processar pagamentos reais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="production_public">Public Key</Label>
            <div className="flex gap-2">
              <Input
                id="production_public"
                type={showKeys.production_public ? "text" : "password"}
                value={config.mp_production_public_key}
                onChange={(e) => updateConfig("mp_production_public_key", e.target.value)}
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => toggleVisibility("production_public")}
              >
                {showKeys.production_public ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleCopy(config.mp_production_public_key, "production_public")}
                disabled={!config.mp_production_public_key}
              >
                {copiedField === "production_public" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="production_access">Access Token</Label>
            <div className="flex gap-2">
              <Input
                id="production_access"
                type={showKeys.production_access ? "text" : "password"}
                value={config.mp_production_access_token}
                onChange={(e) => updateConfig("mp_production_access_token", e.target.value)}
                placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => toggleVisibility("production_access")}
              >
                {showKeys.production_access ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleCopy(config.mp_production_access_token, "production_access")}
                disabled={!config.mp_production_access_token}
              >
                {copiedField === "production_access" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Onde encontrar suas credenciais?</p>
              <p className="text-sm text-muted-foreground">
                Acesse o painel de desenvolvedores do Mercado Pago
              </p>
            </div>
            <Button variant="outline" asChild>
              <a
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Acessar Painel
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving ? (
          <>Salvando...</>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </>
        )}
      </Button>

      {/* Test Cards Info (only show when sandbox is selected) */}
      {config.mp_environment === "sandbox" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 text-base">Cartões de Teste</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 space-y-3">
            <div className="space-y-1">
              <p><strong>Mastercard:</strong> 5031 4332 1540 6351 | CVV: 123 | Validade: 11/30</p>
              <p><strong>Visa:</strong> 4235 6477 2802 5682 | CVV: 123 | Validade: 11/30</p>
              <p><strong>Amex:</strong> 3753 651535 56885 | CVV: 1234 | Validade: 11/30</p>
            </div>
            <div className="pt-2 border-t border-blue-200">
              <p><strong>💡 Dica:</strong> Use o nome <span className="font-mono bg-blue-100 px-1 rounded">APRO</span> para aprovar o pagamento</p>
              <p><strong>CPF:</strong> 12345678909</p>
            </div>
            <a
              href="https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/your-integrations/test/cards"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800 flex items-center gap-1"
            >
              Ver mais cartões de teste <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
