import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { MercadoPagoGatewayConfig } from "@/components/admin/MercadoPagoGatewayConfig";

interface PaymentSettingsData {
  max_installments: number | null;
  interest_free_installments: number | null;
  monthly_interest_rate: number | null;
}

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export default function Payments() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettingsData>({
    max_installments: 12,
    interest_free_installments: 3,
    monthly_interest_rate: 1.99,
  });

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("max_installments, interest_free_installments, monthly_interest_rate")
        .eq("id", SETTINGS_ID)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as PaymentSettingsData);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateField = (field: keyof PaymentSettingsData, value: number | null) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("store_settings")
        .update(settings)
        .eq("id", SETTINGS_ID);

      if (error) throw error;

      toast.success("Configurações de pagamento salvas!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Pagamentos">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Pagamentos">
      <div className="space-y-6">
        {/* Mercado Pago Gateway */}
        <MercadoPagoGatewayConfig />

        {/* Installment Settings */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Parcelamento</CardTitle>
            <CardDescription>
              Configure as regras de parcelamento para pagamentos com cartão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_installments">Máximo de Parcelas</Label>
                <Input
                  id="max_installments"
                  type="number"
                  min={1}
                  max={24}
                  value={settings.max_installments ?? 12}
                  onChange={(e) => updateField("max_installments", parseInt(e.target.value) || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest_free_installments">Parcelas Sem Juros</Label>
                <Input
                  id="interest_free_installments"
                  type="number"
                  min={1}
                  max={12}
                  value={settings.interest_free_installments ?? 3}
                  onChange={(e) => updateField("interest_free_installments", parseInt(e.target.value) || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_interest_rate">Taxa de Juros Mensal (%)</Label>
                <Input
                  id="monthly_interest_rate"
                  type="number"
                  step="0.01"
                  min={0}
                  value={settings.monthly_interest_rate ?? 1.99}
                  onChange={(e) => updateField("monthly_interest_rate", parseFloat(e.target.value) || null)}
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Exemplo de Parcelamento</h4>
              <p className="text-sm text-muted-foreground">
                Com as configurações atuais, um produto de R$ 100,00 ficaria:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• 1x de R$ 100,00 (à vista)</li>
                <li>• {settings.interest_free_installments ?? 3}x de R$ {(100 / (settings.interest_free_installments ?? 3)).toFixed(2)} sem juros</li>
                <li>• {settings.max_installments ?? 12}x de R$ {((100 * ((settings.monthly_interest_rate ?? 1.99) / 100 * Math.pow(1 + (settings.monthly_interest_rate ?? 1.99) / 100, settings.max_installments ?? 12)) / (Math.pow(1 + (settings.monthly_interest_rate ?? 1.99) / 100, settings.max_installments ?? 12) - 1))).toFixed(2)} com juros</li>
              </ul>
            </div>

            <Separator />

            <Button onClick={handleSave} disabled={isSaving} className="btn-primary">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
