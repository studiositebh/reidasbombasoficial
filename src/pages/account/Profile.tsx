import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Save, Loader2, Trash2, AlertTriangle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SecureEmailChange } from "@/components/account/SecureEmailChange";

interface ProfileData {
  full_name: string;
  phone: string;
  document: string;
  document_type: string;
}

interface DeletionStatus {
  pending: boolean;
  scheduled_for: string | null;
  created_at: string | null;
}

export default function AccountProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus>({
    pending: false,
    scheduled_for: null,
    created_at: null,
  });
  const [formData, setFormData] = useState<ProfileData>({
    full_name: "",
    phone: "",
    document: "",
    document_type: "cpf",
  });

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        // Fetch profile and deletion status in parallel
        const [profileResult, deletionResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, phone, document, document_type")
            .eq("user_id", user.id)
            .single(),
          supabase.functions.invoke("delete-account", {
            body: { action: "status" },
          }),
        ]);

        if (profileResult.error && profileResult.error.code !== "PGRST116") {
          throw profileResult.error;
        }

        if (profileResult.data) {
          setFormData({
            full_name: profileResult.data.full_name || "",
            phone: profileResult.data.phone || "",
            document: profileResult.data.document || "",
            document_type: profileResult.data.document_type || "cpf",
          });
        }

        if (deletionResult.data) {
          setDeletionStatus(deletionResult.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Erro ao carregar dados");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    
    if (numbers.length <= 11) {
      setFormData((prev) => ({ ...prev, document_type: "cpf" }));
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      setFormData((prev) => ({ ...prev, document_type: "cnpj" }));
      return numbers
        .slice(0, 14)
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.full_name.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: formData.full_name.trim(),
          phone: formData.phone.replace(/\D/g, "") || null,
          document: formData.document.replace(/\D/g, "") || null,
          document_type: formData.document_type,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      toast.success("Dados salvos com sucesso!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erro ao salvar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const handleScheduleDeletion = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { action: "schedule" },
      });
      
      if (error || data?.error) {
        throw new Error(data?.error || "Erro ao agendar exclusão");
      }
      
      toast.success(data.message || "Exclusão agendada com sucesso");
      setDeleteDialogOpen(false);
      setDeletionStatus({
        pending: true,
        scheduled_for: data.scheduled_for,
        created_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error scheduling deletion:", error);
      toast.error(error.message || "Erro ao agendar exclusão. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { action: "cancel" },
      });
      
      if (error || data?.error) {
        throw new Error(data?.error || "Erro ao cancelar exclusão");
      }
      
      toast.success("Exclusão cancelada! Sua conta está segura.");
      setDeletionStatus({
        pending: false,
        scheduled_for: null,
        created_at: null,
      });
    } catch (error: any) {
      console.error("Error cancelling deletion:", error);
      toast.error(error.message || "Erro ao cancelar exclusão. Tente novamente.");
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysRemaining = () => {
    if (!deletionStatus.scheduled_for) return 0;
    const scheduledDate = new Date(deletionStatus.scheduled_for);
    const now = new Date();
    const diff = scheduledDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Dados Pessoais</h1>
        <Card className="border-border">
          <CardContent className="p-6 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dados Pessoais</h1>

      {/* Pending Deletion Alert */}
      {deletionStatus.pending && (
        <Alert variant="destructive" className="border-destructive bg-destructive/10">
          <Clock className="h-4 w-4" />
          <AlertTitle className="font-semibold">Exclusão agendada</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p>
              Sua conta será excluída permanentemente em{" "}
              <strong>{formatDate(deletionStatus.scheduled_for)}</strong>.
            </p>
            <p className="text-sm">
              Você tem <strong>{getDaysRemaining()} dias</strong> para cancelar esta solicitação e manter sua conta.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelDeletion}
              disabled={isCancelling}
              className="mt-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar Exclusão
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              placeholder="Seu nome completo"
              value={formData.full_name}
              onChange={(e) => handleInputChange("full_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              placeholder="Seu nome completo"
              value={formData.full_name}
              onChange={(e) => handleInputChange("full_name", e.target.value)}
            />
          </div>

          {/* Document (CPF/CNPJ) */}
          <div className="space-y-2">
            <Label htmlFor="document">CPF / CNPJ</Label>
            <Input
              id="document"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              value={formData.document}
              onChange={(e) => handleInputChange("document", formatDocument(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {formData.document_type === "cnpj" ? "CNPJ detectado" : "CPF detectado"}
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", formatPhone(e.target.value))}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full btn-primary"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Secure Email Change Section */}
      <SecureEmailChange currentEmail={user?.email || ""} />

      {/* Delete Account Section */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {deletionStatus.pending ? (
            <p className="text-sm text-muted-foreground">
              Sua conta já está agendada para exclusão. Use o botão acima para cancelar 
              se mudar de ideia.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Ao solicitar a exclusão, sua conta entrará em um período de carência de{" "}
                <strong>7 dias</strong>. Durante esse tempo, você pode cancelar a solicitação 
                e manter sua conta. Após esse período, todos os seus dados serão permanentemente 
                removidos.
              </p>
              
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Solicitar Exclusão da Conta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      Período de Carência de 7 Dias
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        Sua conta será agendada para exclusão após <strong>7 dias</strong>.
                        Durante esse período, você pode:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                        <li>Cancelar a exclusão a qualquer momento</li>
                        <li>Continuar usando sua conta normalmente</li>
                        <li>Baixar seus dados antes da exclusão</li>
                      </ul>
                      <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                        <p className="text-sm text-destructive font-medium">
                          Após 7 dias, a exclusão será permanente:
                        </p>
                        <ul className="list-disc list-inside text-xs space-y-1 mt-1 text-muted-foreground">
                          <li>Perfil e dados pessoais removidos</li>
                          <li>Endereços e cartões salvos deletados</li>
                          <li>Pedidos anteriores anonimizados</li>
                        </ul>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        handleScheduleDeletion();
                      }}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Agendando...
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Agendar Exclusão (7 dias)
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
