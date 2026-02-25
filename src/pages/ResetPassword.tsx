import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // The session exists when coming from the password reset email
      if (session) {
        setIsValidSession(true);
      }
      setIsCheckingSession(false);
    };

    checkSession();

    // Listen for auth state changes (when user clicks the reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
        setIsCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error("Erro ao atualizar senha", { description: error.message });
        return;
      }

      setIsSuccess(true);
      toast.success("Senha atualizada com sucesso!");
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error) {
      toast.error("Erro inesperado ao atualizar senha");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[hsl(220,15%,5%)]">
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <img src={logo} alt="Rei das Bombas" className="h-32 w-auto mb-8" />
          <h1 className="text-3xl font-bold text-white text-center mb-4">
            Nova <span className="text-primary">Senha</span>
          </h1>
          <p className="text-white/70 text-center max-w-md">
            Crie uma nova senha segura para sua conta.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <Link to="/">
              <img src={logo} alt="Rei das Bombas" className="h-16 w-auto mx-auto" />
            </Link>
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {isSuccess ? "Senha Atualizada!" : "Redefinir Senha"}
              </CardTitle>
              <CardDescription>
                {isSuccess 
                  ? "Você será redirecionado para o login" 
                  : !isValidSession 
                    ? "Link inválido ou expirado"
                    : "Digite sua nova senha"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSuccess ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sua senha foi atualizada com sucesso. Redirecionando...
                  </p>
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                </div>
              ) : !isValidSession ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    O link de recuperação é inválido ou expirou. Solicite um novo link.
                  </p>
                  <Button asChild className="w-full btn-primary">
                    <Link to="/forgot-password">Solicitar novo link</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Repita a senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full btn-primary h-11" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      "Atualizar Senha"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/login" className="hover:text-primary transition-colors">
              ← Voltar para o login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
