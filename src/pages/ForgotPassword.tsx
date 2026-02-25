import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error("Erro ao enviar email", { description: error.message });
        return;
      }

      setEmailSent(true);
      toast.success("Email enviado com sucesso!");
    } catch (error) {
      toast.error("Erro inesperado ao enviar email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[hsl(220,15%,5%)]">
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <img src={logo} alt="Rei das Bombas" className="h-32 w-auto mb-8" />
          <h1 className="text-3xl font-bold text-white text-center mb-4">
            Recuperar <span className="text-primary">Senha</span>
          </h1>
          <p className="text-white/70 text-center max-w-md">
            Não se preocupe! Vamos te ajudar a recuperar o acesso à sua conta.
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
              <CardTitle className="text-2xl">Esqueceu sua senha?</CardTitle>
              <CardDescription>
                {emailSent 
                  ? "Verifique sua caixa de entrada" 
                  : "Digite seu email para receber o link de recuperação"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailSent ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Enviamos um link de recuperação para:
                    </p>
                    <p className="font-medium">{email}</p>
                    <p className="text-sm text-muted-foreground mt-4">
                      Verifique também sua pasta de spam caso não encontre o email.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setEmailSent(false)}
                  >
                    Enviar novamente
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full btn-primary h-11" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar link de recuperação"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/login" className="hover:text-primary transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
