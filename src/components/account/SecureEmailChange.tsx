import { useState } from "react";
import { Mail, Loader2, ShieldCheck, AlertTriangle, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Email validation schema
const emailSchema = z.object({
  newEmail: z.string().trim().email({ message: "E-mail inválido" }).max(255, { message: "E-mail muito longo" }),
  confirmEmail: z.string().trim().email({ message: "E-mail inválido" }),
}).refine((data) => data.newEmail === data.confirmEmail, {
  message: "Os e-mails não coincidem",
  path: ["confirmEmail"],
});

interface SecureEmailChangeProps {
  currentEmail: string;
}

export function SecureEmailChange({ currentEmail }: SecureEmailChangeProps) {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errors, setErrors] = useState<{ newEmail?: string; confirmEmail?: string }>({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const validateEmails = (): boolean => {
    setErrors({});
    
    try {
      emailSchema.parse({ newEmail, confirmEmail });
      
      // Check if new email is different from current
      if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
        setErrors({ newEmail: "O novo e-mail deve ser diferente do atual" });
        return false;
      }
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { newEmail?: string; confirmEmail?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === "newEmail") {
            fieldErrors.newEmail = err.message;
          } else if (err.path[0] === "confirmEmail") {
            fieldErrors.confirmEmail = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleRequestChange = () => {
    if (!validateEmails()) return;
    setPassword("");
    setIsPasswordModalOpen(true);
  };

  const handleVerifyAndUpdate = async () => {
    if (!user || !password.trim()) {
      toast.error("Digite sua senha atual");
      return;
    }

    setIsVerifying(true);

    try {
      // Step 1: Re-authenticate by signing in with current email and password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: password,
      });

      if (signInError) {
        toast.error("Senha incorreta. Tente novamente.");
        setIsVerifying(false);
        return;
      }

      // Step 2: Log the email change attempt for audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "EMAIL_CHANGE_INITIATED",
        details: {
          old_email: currentEmail,
          new_email: newEmail,
          timestamp: new Date().toISOString(),
        },
        ip_address: null, // Could be captured from request headers in edge function
        user_agent: navigator.userAgent,
      });

      setIsVerifying(false);
      setIsUpdating(true);

      // Step 3: Request email change through Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) {
        console.error("Email update error:", updateError);
        toast.error(updateError.message || "Erro ao solicitar alteração de e-mail");
        setIsUpdating(false);
        return;
      }

      // Success
      setIsPasswordModalOpen(false);
      setShowSuccessMessage(true);
      setNewEmail("");
      setConfirmEmail("");
      setPassword("");
      
      toast.success("Solicitação de alteração enviada!");
    } catch (error) {
      console.error("Error updating email:", error);
      toast.error("Erro ao processar solicitação");
    } finally {
      setIsVerifying(false);
      setIsUpdating(false);
    }
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPassword("");
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-primary" />
          Alterar E-mail
        </CardTitle>
        <CardDescription>
          Altere seu e-mail de acesso à conta. Por segurança, você precisará confirmar sua senha atual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success Message */}
        {showSuccessMessage && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>Quase lá!</strong> Por segurança, enviamos um link de confirmação para 
              seu e-mail <strong>antigo ({currentEmail})</strong> e para o <strong>novo e-mail</strong>. 
              A alteração só será concluída após você clicar em <strong>ambos os links</strong>.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Email (read-only) */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">E-mail atual</Label>
          <Input
            value={currentEmail}
            disabled
            className="bg-muted/50"
          />
        </div>

        {/* New Email */}
        <div className="space-y-2">
          <Label htmlFor="new-email">Novo E-mail</Label>
          <Input
            id="new-email"
            type="email"
            placeholder="seu-novo-email@exemplo.com"
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              setShowSuccessMessage(false);
              if (errors.newEmail) setErrors((prev) => ({ ...prev, newEmail: undefined }));
            }}
            className={errors.newEmail ? "border-destructive" : ""}
          />
          {errors.newEmail && (
            <p className="text-xs text-destructive">{errors.newEmail}</p>
          )}
        </div>

        {/* Confirm New Email */}
        <div className="space-y-2">
          <Label htmlFor="confirm-email">Confirmar Novo E-mail</Label>
          <Input
            id="confirm-email"
            type="email"
            placeholder="Repita o novo e-mail"
            value={confirmEmail}
            onChange={(e) => {
              setConfirmEmail(e.target.value);
              if (errors.confirmEmail) setErrors((prev) => ({ ...prev, confirmEmail: undefined }));
            }}
            className={errors.confirmEmail ? "border-destructive" : ""}
          />
          {errors.confirmEmail && (
            <p className="text-xs text-destructive">{errors.confirmEmail}</p>
          )}
        </div>

        {/* Security Note */}
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
            Por segurança, você receberá um e-mail de confirmação tanto no endereço atual 
            quanto no novo. A alteração só será efetivada após confirmar em ambos.
          </AlertDescription>
        </Alert>

        {/* Submit Button */}
        <Button
          onClick={handleRequestChange}
          disabled={!newEmail || !confirmEmail}
          className="w-full"
        >
          <ShieldCheck className="h-4 w-4 mr-2" />
          Alterar E-mail
        </Button>
      </CardContent>

      {/* Password Verification Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={handleClosePasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Confirmar Identidade
            </DialogTitle>
            <DialogDescription>
              Para sua segurança, digite sua senha atual para confirmar a alteração de e-mail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && password.trim()) {
                      handleVerifyAndUpdate();
                    }
                  }}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                <strong>Alteração solicitada:</strong>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">De:</span> {currentEmail}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Para:</span> {newEmail}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleClosePasswordModal}
              disabled={isVerifying || isUpdating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleVerifyAndUpdate}
              disabled={!password.trim() || isVerifying || isUpdating}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Confirmar Alteração
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
