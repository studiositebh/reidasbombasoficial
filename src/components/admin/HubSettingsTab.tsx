import React, { useState, useEffect } from "react";
import { Link2, Key, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff, Clock, Package, TrendingUp, Database, FolderTree, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { SyncProgressCard, SyncProgressData } from "./SyncProgressCard";

interface HubSettingsData {
  hub_url: string | null;
  hub_api_key: string | null;
  hub_auto_update_prices: boolean | null;
  hub_last_sync_at: string | null;
}

interface SyncStats {
  totalProducts: number;
  totalVariants: number;
  totalCategories: number;
  totalAttributes: number;
  lastSyncProducts: number;
}

interface HubSettingsTabProps {
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export function HubSettingsTab({ onSave, isSaving }: HubSettingsTabProps) {
  const [settings, setSettings] = useState<HubSettingsData>({
    hub_url: null,
    hub_api_key: null,
    hub_auto_update_prices: true,
    hub_last_sync_at: null,
  });
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalProducts: 0,
    totalVariants: 0,
    totalCategories: 0,
    totalAttributes: 0,
    lastSyncProducts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [lastSyncResult, setLastSyncResult] = useState<{ created: number; updated: number } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "online" | "offline">("checking");
  
  // Real-time sync progress
  const [syncProgress, setSyncProgress] = useState<SyncProgressData>({
    syncId: null,
    status: "idle",
    currentStep: "",
    stepProgress: 0,
    stepTotal: 0,
    message: "",
    categoriesSynced: 0,
    attributesSynced: 0,
    attributeValuesHarvested: 0,
    productsCreated: 0,
    productsUpdated: 0,
    errors: [],
    isConnected: false,
    startedAt: undefined,
  });

  useEffect(() => {
    fetchSettings();
    fetchSyncStats();
  }, []);

  // Check Hub connection status on mount and when settings change
  useEffect(() => {
    if (settings.hub_url && settings.hub_api_key) {
      checkConnectionStatus();
    } else {
      setConnectionStatus("offline");
    }
  }, [settings.hub_url, settings.hub_api_key]);

  const checkConnectionStatus = async () => {
    if (!settings.hub_url || !settings.hub_api_key) {
      setConnectionStatus("offline");
      return;
    }

    setConnectionStatus("checking");

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${settings.hub_url}/marketplace-products`, {
        method: "GET",
        headers: {
          "x-seller-key": settings.hub_api_key,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setConnectionStatus(response.ok ? "online" : "offline");
    } catch {
      setConnectionStatus("offline");
    }
  };

  // Realtime subscription for sync progress
  useEffect(() => {
    if (!syncProgress.syncId || syncProgress.status === "idle") return;

    console.log("[Realtime] Setting up subscription for syncId:", syncProgress.syncId);

    const channel = supabase
      .channel(`sync-progress-${syncProgress.syncId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sync_progress",
          filter: `sync_id=eq.${syncProgress.syncId}`,
        },
        (payload) => {
          console.log("[Realtime] Sync progress update received:", payload.new);
          const newData = payload.new as Record<string, unknown>;
          setSyncProgress((prev) => ({
            ...prev,
            status: (newData.status as SyncProgressData["status"]) ?? prev.status,
            currentStep: (newData.current_step as string) ?? prev.currentStep,
            stepProgress: (newData.step_progress as number) ?? prev.stepProgress,
            stepTotal: (newData.step_total as number) ?? prev.stepTotal,
            message: (newData.message as string) ?? prev.message,
            categoriesSynced: (newData.categories_synced as number) ?? prev.categoriesSynced,
            attributesSynced: (newData.attributes_synced as number) ?? prev.attributesSynced,
            attributeValuesHarvested: (newData.attribute_values_harvested as number) ?? prev.attributeValuesHarvested,
            productsCreated: (newData.products_created as number) ?? prev.productsCreated,
            productsUpdated: (newData.products_updated as number) ?? prev.productsUpdated,
            errors: (newData.errors as string[]) ?? prev.errors,
          }));

          // If completed or error, update the UI and refresh data
          if (newData.status === "completed" || newData.status === "error") {
            if (newData.status === "completed") {
              setLastSyncResult({
                created: (newData.products_created as number) ?? 0,
                updated: (newData.products_updated as number) ?? 0,
              });
            }
            // Always refresh settings and stats when sync finishes
            fetchSettings();
            fetchSyncStats();
            setIsSyncing(false);
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] Channel status:", status, err);
        setSyncProgress((prev) => ({
          ...prev,
          isConnected: status === "SUBSCRIBED",
        }));
      });

    return () => {
      console.log("[Realtime] Cleaning up subscription for syncId:", syncProgress.syncId);
      supabase.removeChannel(channel);
    };
  }, [syncProgress.syncId]);

  // Polling fallback for sync progress (in case realtime fails)
  useEffect(() => {
    if (!isSyncing || !syncProgress.syncId) return;

    const pollInterval = setInterval(async () => {
      try {
        // Fetch latest sync progress directly from DB
        const { data, error } = await supabase
          .from("sync_progress")
          .select("*")
          .eq("sync_id", syncProgress.syncId)
          .maybeSingle();

        if (error || !data) return;

        console.log("[Polling] Sync progress fetched:", data);

        // Update progress state with polled data - use ?? to handle 0 values correctly
        setSyncProgress((prev) => ({
          ...prev,
          status: data.status as SyncProgressData["status"],
          currentStep: data.current_step ?? prev.currentStep,
          stepProgress: data.step_progress ?? prev.stepProgress,
          stepTotal: data.step_total ?? prev.stepTotal,
          message: data.message ?? prev.message,
          categoriesSynced: data.categories_synced ?? prev.categoriesSynced,
          attributesSynced: data.attributes_synced ?? prev.attributesSynced,
          attributeValuesHarvested: data.attribute_values_harvested ?? prev.attributeValuesHarvested,
          productsCreated: data.products_created ?? prev.productsCreated,
          productsUpdated: data.products_updated ?? prev.productsUpdated,
          errors: data.errors ?? prev.errors,
        }));

        // Handle completion
        if (data.status === "completed" || data.status === "error") {
          if (data.status === "completed") {
            setLastSyncResult({
              created: data.products_created ?? 0,
              updated: data.products_updated ?? 0,
            });
          }
          fetchSettings();
          fetchSyncStats();
          setIsSyncing(false);
        }
      } catch (err) {
        console.error("[Polling] Error:", err);
      }
    }, 2000); // Poll every 2 seconds for responsive feedback

    return () => clearInterval(pollInterval);
  }, [isSyncing, syncProgress.syncId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("hub_url, hub_api_key, hub_auto_update_prices, hub_last_sync_at")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as HubSettingsData);
      }
    } catch (error) {
      console.error("Error fetching hub settings:", error);
      toast.error("Erro ao carregar configurações do Hub");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSyncStats = async () => {
    try {
      const [productsRes, variantsRes, categoriesRes, attributesRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("variants").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("attributes").select("id", { count: "exact", head: true }),
      ]);

      setSyncStats({
        totalProducts: productsRes.count || 0,
        totalVariants: variantsRes.count || 0,
        totalCategories: categoriesRes.count || 0,
        totalAttributes: attributesRes.count || 0,
        lastSyncProducts: lastSyncResult?.created || 0,
      });
    } catch (error) {
      console.error("Error fetching sync stats:", error);
    }
  };

  const updateField = (field: keyof HubSettingsData, value: unknown) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSaveSettings = async () => {
    try {
      const { error } = await supabase
        .from("store_settings")
        .update({
          hub_url: settings.hub_url,
          hub_api_key: settings.hub_api_key,
          hub_auto_update_prices: settings.hub_auto_update_prices,
        })
        .eq("id", "00000000-0000-0000-0000-000000000001");

      if (error) throw error;

      toast.success("Configurações do Hub salvas!");
      await onSave();
    } catch (error) {
      console.error("Error saving hub settings:", error);
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleTestConnection = async () => {
    if (!settings.hub_url || !settings.hub_api_key) {
      toast.error("Preencha a URL e API Key primeiro");
      return;
    }

    setTestStatus("testing");

    try {
      const response = await fetch(`${settings.hub_url}/marketplace-products`, {
        method: "GET",
        headers: {
          "x-seller-key": settings.hub_api_key,
        },
      });

      if (response.ok) {
        setTestStatus("success");
        toast.success("Conexão com o Hub bem sucedida!");
      } else {
        setTestStatus("error");
        toast.error(`Erro na conexão: ${response.status}`);
      }
    } catch {
      setTestStatus("error");
      toast.error("Não foi possível conectar ao Hub");
    }

    setTimeout(() => setTestStatus("idle"), 3000);
  };

  const handleSync = async () => {
    const newSyncId = crypto.randomUUID();
    
    try {
      // 1. PRIMEIRO: Criar o registro no banco ANTES de tudo
      const { error: insertError } = await supabase
        .from("sync_progress")
        .insert({
          sync_id: newSyncId,
          status: "running",
          current_step: "iniciando",
          message: "Preparando sincronização...",
        });

      if (insertError) {
        console.error("Failed to create sync progress:", insertError);
        toast.error("Erro ao iniciar sincronização");
        return;
      }

      // 2. Inicializar estado local DEPOIS que o registro existe
      setSyncProgress({
        syncId: newSyncId,
        status: "running",
        currentStep: "iniciando",
        stepProgress: 0,
        stepTotal: 0,
        message: "Conectando ao Hub...",
        categoriesSynced: 0,
        attributesSynced: 0,
        attributeValuesHarvested: 0,
        productsCreated: 0,
        productsUpdated: 0,
        errors: [],
        isConnected: false,
        startedAt: new Date().toISOString(),
      });
      
      setIsSyncing(true);

      // 3. Aguardar um tick para o useEffect criar a subscription realtime
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4. Só então chamar o Edge Function
      const { data, error } = await supabase.functions.invoke("sync-from-hub", {
        body: { syncId: newSyncId },
      });

      if (error) {
        toast.error(`Erro na sincronização: ${error.message}`);
        setSyncProgress((prev) => ({
          ...prev,
          status: "error",
          message: error.message,
        }));
        setIsSyncing(false);
        // Always refresh settings after edge function returns
        fetchSettings();
        fetchSyncStats();
      }

      // If function returns immediately (didn't use realtime), handle result
      if (data?.success) {
        toast.success(data.message);
        setLastSyncResult({ created: data.created, updated: data.updated });
        setSyncProgress((prev) => ({
          ...prev,
          status: "completed",
          message: data.message,
          productsCreated: data.created,
          productsUpdated: data.updated,
          categoriesSynced: data.categoriesSynced || 0,
          attributesSynced: data.attributesSynced || 0,
          attributeValuesHarvested: data.attributeValuesHarvested || 0,
        }));
        setIsSyncing(false);
      } else if (data && !data.success) {
        // Handle failed sync with error details
        toast.error(data.message || "Erro na sincronização");
        setSyncProgress((prev) => ({
          ...prev,
          status: "error",
          message: data.message || "Erro na sincronização",
          errors: data.errors || [],
        }));
        setIsSyncing(false);
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Erro ao sincronizar produtos");
      setSyncProgress((prev) => ({
        ...prev,
        status: "error",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      }));
      setIsSyncing(false);
    }
  };

  const handleCloseSyncProgress = () => {
    // Always refresh data when closing the progress card
    fetchSettings();
    fetchSyncStats();
    
    setSyncProgress({
      syncId: null,
      status: "idle",
      currentStep: "",
      stepProgress: 0,
      stepTotal: 0,
      message: "",
      categoriesSynced: 0,
      attributesSynced: 0,
      attributeValuesHarvested: 0,
      productsCreated: 0,
      productsUpdated: 0,
      errors: [],
      isConnected: false,
      startedAt: undefined,
    });
  };

  const handleResetCatalog = async () => {
    setIsResetting(true);
    setShowResetDialog(false);
    
    try {
      toast.info("Iniciando limpeza do catálogo...");

      // 1. Delete order_items first (they reference variants)
      const { error: orderItemsError } = await supabase
        .from("order_items")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (orderItemsError) {
        console.error("Error deleting order_items:", orderItemsError);
        throw new Error(`Erro ao deletar itens de pedidos: ${orderItemsError.message}`);
      }
      toast.info("Itens de pedidos deletados...");

      // 2. Delete orders (now safe since order_items are gone)
      const { error: ordersError } = await supabase
        .from("orders")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (ordersError) {
        console.error("Error deleting orders:", ordersError);
        throw new Error(`Erro ao deletar pedidos: ${ordersError.message}`);
      }
      toast.info("Pedidos deletados...");

      // 3. Delete product_images
      const { error: productImagesError } = await supabase
        .from("product_images")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (productImagesError) {
        console.warn("Error deleting product_images:", productImagesError);
      }

      const { error: variantsError } = await supabase
        .from("variants")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (variantsError) throw variantsError;
      toast.info("Variantes deletadas...");

      const { error: productsError } = await supabase
        .from("products")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (productsError) throw productsError;
      toast.info("Produtos deletados...");

      const { error: attrValuesError } = await supabase
        .from("attribute_values")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (attrValuesError) throw attrValuesError;
      toast.info("Valores de atributos deletados...");

      const { error: attributesError } = await supabase
        .from("attributes")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (attributesError) throw attributesError;
      toast.info("Atributos deletados...");

      const { error: categoriesError } = await supabase
        .from("categories")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (categoriesError) throw categoriesError;

      toast.success("Catálogo limpo com sucesso! Agora você pode sincronizar novamente.");
      setLastSyncResult(null);
      fetchSyncStats();
    } catch (error) {
      console.error("Error resetting catalog:", error);
      toast.error("Erro ao limpar catálogo. Verifique o console.");
    } finally {
      setIsResetting(false);
    }
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return "Nunca sincronizado";
    
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConfigured = settings.hub_url && settings.hub_api_key;

  return (
    <div className="space-y-6">
      {/* Real-time Sync Progress Card */}
      {syncProgress.status !== "idle" && (
        <SyncProgressCard 
          progress={syncProgress} 
          onClose={handleCloseSyncProgress}
        />
      )}

      {/* Sync Card - MOVED TO TOP */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Sincronização com Hub
            </CardTitle>
            {/* Connection Status Indicator */}
            {isConfigured && (
              <div className="flex items-center gap-2">
                {connectionStatus === "checking" ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Verificando...
                  </div>
                ) : connectionStatus === "online" ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-medium">
                    <Wifi className="h-3 w-3" />
                    Online
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs font-medium">
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </div>
                )}
              </div>
            )}
          </div>
          <CardDescription>
            Importe produtos do Hub manualmente. O Hub também pode enviar atualizações via webhook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.hub_last_sync_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Última sincronização: {formatLastSync(settings.hub_last_sync_at)}</span>
            </div>
          )}

          <Button
            onClick={handleSync}
            disabled={isSyncing || !isConfigured}
            className="w-full sm:w-auto btn-primary"
            size="lg"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar Agora
              </>
            )}
          </Button>

          {!isConfigured && (
            <p className="text-sm text-muted-foreground">
              Configure a URL e API Key abaixo para habilitar a sincronização.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sync Status Card */}
      {isConfigured && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Status da Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{syncStats.totalProducts}</p>
                <p className="text-xs text-muted-foreground">Produtos</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">{syncStats.totalVariants}</p>
                <p className="text-xs text-muted-foreground">Variantes</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <FolderTree className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <p className="text-2xl font-bold">{syncStats.totalCategories}</p>
                <p className="text-xs text-muted-foreground">Categorias</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Key className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-2xl font-bold">{syncStats.totalAttributes}</p>
                <p className="text-xs text-muted-foreground">Atributos</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">
                  {settings.hub_last_sync_at 
                    ? formatLastSync(settings.hub_last_sync_at)
                    : "—"
                  }
                </p>
                <p className="text-xs text-muted-foreground">Última Sync</p>
              </div>
              {lastSyncResult && (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-sm font-medium">
                    +{lastSyncResult.created} / ↻{lastSyncResult.updated}
                  </p>
                  <p className="text-xs text-muted-foreground">Criados / Atualiz.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Conexão com Marketplace
          </CardTitle>
          <CardDescription>
            Configure a integração com o Hub "Tudo pra Posto" para importar produtos automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isConfigured && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Hub configurado. Última sincronização: {formatLastSync(settings.hub_last_sync_at)}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hub_url">URL do Hub</Label>
              <Input
                id="hub_url"
                value={settings.hub_url || ""}
                onChange={(e) => updateField("hub_url", e.target.value)}
                placeholder="https://xxxx.supabase.co/functions/v1"
              />
              <p className="text-xs text-muted-foreground">
                URL base do Hub (ex: https://qziqjgoalcdikxhgmsej.supabase.co/functions/v1)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hub_api_key">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="hub_api_key"
                    type={showApiKey ? "text" : "password"}
                    value={settings.hub_api_key || ""}
                    onChange={(e) => updateField("hub_api_key", e.target.value)}
                    placeholder="Sua chave de API fornecida pelo Hub"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testStatus === "testing" || !settings.hub_url || !settings.hub_api_key}
                >
                  {testStatus === "testing" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : testStatus === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : testStatus === "error" ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    "Testar"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A chave de integração fornecida pelo sistema Tudo pra Posto.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_prices">Atualizar Preços Automaticamente</Label>
              <p className="text-xs text-muted-foreground">
                Quando ativado, os preços serão atualizados automaticamente quando o Hub enviar atualizações.
              </p>
            </div>
            <Switch
              id="auto_prices"
              checked={settings.hub_auto_update_prices ?? true}
              onCheckedChange={(checked) => updateField("hub_auto_update_prices", checked)}
            />
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button onClick={handleSaveSettings} disabled={isSaving} className="btn-primary">
              {isSaving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Catalog Card */}
      {isConfigured && (
        <Card className="bg-white shadow-sm border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Resetar Catálogo
            </CardTitle>
            <CardDescription>
              Apague todos os produtos, variantes, atributos e categorias para ressincronizar do zero.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-destructive/5 border-destructive/30">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                <strong>ATENÇÃO:</strong> Esta ação é irreversível! Todos os dados do catálogo serão apagados permanentemente.
              </AlertDescription>
            </Alert>

            <Button
              variant="destructive"
              onClick={() => setShowResetDialog(true)}
              disabled={isResetting}
              className="w-full sm:w-auto"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Limpando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar Tudo e Reiniciar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Webhook Info Card */}
      <Card className="bg-white shadow-sm border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Configuração do Webhook (para o Hub)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">URL do Webhook</Label>
            <code className="block p-2 bg-muted rounded text-sm break-all">
              https://kpkxnqlrgkmgbbmishaw.supabase.co/functions/v1/hub-listener
            </code>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Header de Autenticação</Label>
            <code className="block p-2 bg-muted rounded text-sm">
              x-seller-key: [sua API Key configurada acima]
            </code>
          </div>
          <p className="text-xs text-muted-foreground">
            Forneça essas informações ao administrador do Hub para que ele possa enviar atualizações automaticamente.
          </p>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              ⚠️ Confirmar Reset Total
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá <strong>DELETAR PERMANENTEMENTE</strong>:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Todos os produtos ({syncStats.totalProducts})</li>
                <li>Todas as variantes ({syncStats.totalVariants})</li>
                <li>Todos os atributos ({syncStats.totalAttributes})</li>
                <li>Todas as categorias ({syncStats.totalCategories})</li>
              </ul>
              <br />
              Após a limpeza, você precisará sincronizar novamente com o Hub.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetCatalog}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, Deletar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
