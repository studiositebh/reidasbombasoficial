import { useState, useEffect } from "react";
import { Save, Store, MapPin, Phone, Globe, Palette, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface StoreSettingsData {
  id: string;
  store_name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  free_shipping_minimum: number | null;
  origin_zip: string | null;
  origin_city: string | null;
  origin_state: string | null;
  // Installment settings
  max_installments: number | null;
  interest_free_installments: number | null;
  monthly_interest_rate: number | null;
}

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export default function StoreSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<StoreSettingsData | null>(null);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("id", SETTINGS_ID)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as unknown as StoreSettingsData);
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

  const updateField = (field: keyof StoreSettingsData, value: any) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("store_settings")
        .update(settings)
        .eq("id", SETTINGS_ID);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Configurações da Loja">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout title="Configurações da Loja">
        <div className="text-center py-12">
          <p className="text-gray-500">Configurações não encontradas</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configurações da Loja">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-white border flex-wrap">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Endereço
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contato
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Redes Sociais
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
              <CardDescription>
                Dados básicos da loja que aparecem no site e documentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="store_name">Nome da Loja</Label>
                  <Input
                    id="store_name"
                    value={settings.store_name}
                    onChange={(e) => updateField("store_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={settings.cnpj || ""}
                    onChange={(e) => updateField("cnpj", e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="free_shipping">Valor Mínimo para Frete Grátis (R$)</Label>
                <Input
                  id="free_shipping"
                  type="number"
                  value={settings.free_shipping_minimum || ""}
                  onChange={(e) => updateField("free_shipping_minimum", parseFloat(e.target.value) || null)}
                  className="max-w-xs"
                />
                <p className="text-xs text-gray-500">
                  Deixe em branco para desativar o frete grátis.
                </p>
              </div>

              <Separator />

              <Button onClick={handleSave} disabled={isSaving} className="btn-primary">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Settings */}
        <TabsContent value="address">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
              <CardDescription>
                Endereço físico da loja e origem para cálculo de frete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address_street">Rua/Logradouro</Label>
                  <Input
                    id="address_street"
                    value={settings.address_street || ""}
                    onChange={(e) => updateField("address_street", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    value={settings.address_number || ""}
                    onChange={(e) => updateField("address_number", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    value={settings.address_complement || ""}
                    onChange={(e) => updateField("address_complement", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_neighborhood">Bairro</Label>
                  <Input
                    id="address_neighborhood"
                    value={settings.address_neighborhood || ""}
                    onChange={(e) => updateField("address_neighborhood", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_city">Cidade</Label>
                  <Input
                    id="address_city"
                    value={settings.address_city || ""}
                    onChange={(e) => updateField("address_city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_state">Estado</Label>
                  <Input
                    id="address_state"
                    value={settings.address_state || ""}
                    onChange={(e) => updateField("address_state", e.target.value)}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_zip">CEP</Label>
                  <Input
                    id="address_zip"
                    value={settings.address_zip || ""}
                    onChange={(e) => updateField("address_zip", e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <Separator />

              <h4 className="font-medium">Origem do Frete</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin_zip">CEP de Origem</Label>
                  <Input
                    id="origin_zip"
                    value={settings.origin_zip || ""}
                    onChange={(e) => updateField("origin_zip", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origin_city">Cidade</Label>
                  <Input
                    id="origin_city"
                    value={settings.origin_city || ""}
                    onChange={(e) => updateField("origin_city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origin_state">Estado</Label>
                  <Input
                    id="origin_state"
                    value={settings.origin_state || ""}
                    onChange={(e) => updateField("origin_state", e.target.value)}
                    maxLength={2}
                  />
                </div>
              </div>

              <Separator />

              <Button onClick={handleSave} disabled={isSaving} className="btn-primary">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Settings */}
        <TabsContent value="contact">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Contato</CardTitle>
              <CardDescription>
                Informações de contato exibidas no site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={settings.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="(00) 0000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={settings.whatsapp || ""}
                  onChange={(e) => updateField("whatsapp", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
                <p className="text-xs text-gray-500">
                  Este número será usado para o botão de WhatsApp no site.
                </p>
              </div>

              <Separator />

              <Button onClick={handleSave} disabled={isSaving} className="btn-primary">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Settings */}
        <TabsContent value="social">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Redes Sociais</CardTitle>
              <CardDescription>
                Links das redes sociais que aparecem no rodapé.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook_url">Facebook</Label>
                  <Input
                    id="facebook_url"
                    value={settings.facebook_url || ""}
                    onChange={(e) => updateField("facebook_url", e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram</Label>
                  <Input
                    id="instagram_url"
                    value={settings.instagram_url || ""}
                    onChange={(e) => updateField("instagram_url", e.target.value)}
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube_url">YouTube</Label>
                  <Input
                    id="youtube_url"
                    value={settings.youtube_url || ""}
                    onChange={(e) => updateField("youtube_url", e.target.value)}
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    value={settings.linkedin_url || ""}
                    onChange={(e) => updateField("linkedin_url", e.target.value)}
                    placeholder="https://linkedin.com/..."
                  />
                </div>
              </div>

              <Separator />

              <Button onClick={handleSave} disabled={isSaving} className="btn-primary">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>
                Personalize as cores e visual da loja.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      value={settings.primary_color || "#0055FF"}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      placeholder="#0055FF"
                    />
                    <input
                      type="color"
                      value={settings.primary_color || "#0055FF"}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      value={settings.secondary_color || "#FFD700"}
                      onChange={(e) => updateField("secondary_color", e.target.value)}
                      placeholder="#FFD700"
                    />
                    <input
                      type="color"
                      value={settings.secondary_color || "#FFD700"}
                      onChange={(e) => updateField("secondary_color", e.target.value)}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="logo_url">URL do Logo</Label>
                <Input
                  id="logo_url"
                  value={settings.logo_url || ""}
                  onChange={(e) => updateField("logo_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="favicon_url">URL do Favicon</Label>
                <Input
                  id="favicon_url"
                  value={settings.favicon_url || ""}
                  onChange={(e) => updateField("favicon_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <Separator />

              <Button onClick={handleSave} disabled={isSaving} className="btn-primary">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}