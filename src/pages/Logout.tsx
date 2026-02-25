import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      console.log("[Logout] Starting logout process");
      
      try {
        // Tentar signOut do Supabase
        await supabase.auth.signOut();
        console.log("[Logout] Supabase signOut completed");
      } catch (err) {
        console.error("[Logout] signOut error:", err);
      }
      
      // Limpar storage relacionado à autenticação
      try {
        // Remover itens específicos do Supabase auth
        const keysToRemove = Object.keys(localStorage).filter(
          key => key.startsWith('sb-') || key.includes('supabase')
        );
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log("[Logout] Cleared auth-related localStorage items");
      } catch (err) {
        console.error("[Logout] localStorage clear error:", err);
      }
      
      // Redirecionar para login
      console.log("[Logout] Redirecting to /login");
      navigate("/login", { replace: true });
    };

    performLogout();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-gray-600">Saindo...</p>
      </div>
    </div>
  );
}
