import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_CHECK_TIMEOUT_MS = 15000; // 15 segundos de timeout
const MAX_ADMIN_CHECK_RETRIES = 3;
const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface AdminCacheEntry {
  userId: string;
  isAdmin: boolean;
  timestamp: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAdminLoading: boolean;
  isAdminVerified: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkAdminRole: (userId?: string, accessToken?: string) => Promise<boolean | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helpers para cache de admin
const getAdminCache = (userId: string): boolean | null => {
  try {
    const cached = sessionStorage.getItem('admin_verified');
    if (!cached) return null;
    
    const entry: AdminCacheEntry = JSON.parse(cached);
    if (entry.userId !== userId) return null;
    if (Date.now() - entry.timestamp > ADMIN_CACHE_TTL_MS) {
      sessionStorage.removeItem('admin_verified');
      return null;
    }
    
    console.log("[Auth] Using cached admin status:", entry.isAdmin);
    return entry.isAdmin;
  } catch {
    return null;
  }
};

const setAdminCache = (userId: string, isAdmin: boolean) => {
  try {
    const entry: AdminCacheEntry = {
      userId,
      isAdmin,
      timestamp: Date.now()
    };
    sessionStorage.setItem('admin_verified', JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
};

const clearAdminCache = () => {
  try {
    sessionStorage.removeItem('admin_verified');
  } catch {
    // Ignore
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [isAdminVerified, setIsAdminVerified] = useState(false); // Nova flag
  
  // Refs para controle de requests
  const adminCheckPromiseRef = useRef<Promise<boolean | null> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkAdminRole = async (userIdArg?: string, accessTokenArg?: string, retryCount = 0): Promise<boolean | null> => {
    // PRIORIZAR userId passado como argumento (evita estado stale durante login)
    const targetUserId = userIdArg || user?.id;
    
    console.log("[Auth] checkAdminRole called with arg:", userIdArg, "hasToken:", !!accessTokenArg, "state user:", user?.id, "using:", targetUserId);
    
    // Sem usuário = não é admin
    if (!targetUserId) {
      console.log("[Auth] checkAdminRole: no userId, setting isAdmin=false");
      setIsAdmin(false);
      setIsAdminLoading(false);
      setIsAdminVerified(true);
      adminCheckPromiseRef.current = null;
      return false;
    }
    
    // Verificar cache primeiro (apenas na primeira tentativa)
    if (retryCount === 0) {
      const cachedResult = getAdminCache(targetUserId);
      if (cachedResult !== null) {
        setIsAdmin(cachedResult);
        setIsAdminLoading(false);
        setIsAdminVerified(true);
        return cachedResult;
      }
    }
    
    // Se já existe uma verificação em andamento e é a primeira tentativa, aguardar ela
    if (adminCheckPromiseRef.current && retryCount === 0) {
      console.log("[Auth] checkAdminRole: reusing existing promise");
      return adminCheckPromiseRef.current;
    }
    
    console.log("[Auth] checkAdminRole: starting check for", targetUserId, retryCount > 0 ? `(retry ${retryCount})` : "");
    
    // Cancelar request anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Criar nova promise de verificação
    const checkPromise = (async (): Promise<boolean | null> => {
      try {
        // USAR token passado como argumento, só buscar se não foi passado
        let accessToken = accessTokenArg;
        
        if (!accessToken) {
          console.log("[Auth] checkAdminRole: fetching session for token...");
          try {
            // Timeout para getSession para evitar travamento
            const sessionPromise = supabase.auth.getSession();
            const sessionTimeout = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error("getSession timeout")), 5000)
            );
            const { data: sessionData } = await Promise.race([sessionPromise, sessionTimeout]);
            accessToken = sessionData?.session?.access_token;
          } catch (sessionErr) {
            console.error("[Auth] checkAdminRole: getSession failed:", sessionErr);
            setIsAdmin(false);
            setIsAdminLoading(false);
            setIsAdminVerified(true);
            return false;
          }
        }
        
        if (!accessToken) {
          console.log("[Auth] checkAdminRole: no access token available");
          setIsAdmin(false);
          setIsAdminLoading(false);
          setIsAdminVerified(true);
          return false;
        }
        
        // Promise.race entre a chamada ao endpoint e um timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timeoutId = setTimeout(() => reject(new Error("Admin check timeout")), ADMIN_CHECK_TIMEOUT_MS);
          signal.addEventListener('abort', () => clearTimeout(timeoutId));
        });
        
        const fetchPromise = fetch(`${SUPABASE_URL}/functions/v1/check-admin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          signal, // Usar signal do AbortController
        }).then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });
        
        const result = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (result.error) {
          console.error("[Auth] checkAdminRole backend error:", result.error);
          setIsAdmin(false);
          setIsAdminVerified(true);
          return false;
        }
        
        const hasAdmin = !!result.isAdmin;
        console.log("[Auth] checkAdminRole result:", hasAdmin);
        setIsAdmin(hasAdmin);
        setIsAdminVerified(true);
        
        // Salvar no cache
        setAdminCache(targetUserId, hasAdmin);
        
        return hasAdmin;
      } catch (err) {
        // Se foi abortado, setar loading false para não travar UI
        if (err instanceof Error && err.name === 'AbortError') {
          console.log("[Auth] checkAdminRole: request aborted");
          setIsAdminLoading(false);
          return null; // Indica resultado inconclusivo
        }
        
        // Se deu timeout e ainda não esgotou retries, tentar novamente
        if (retryCount < MAX_ADMIN_CHECK_RETRIES) {
          console.log("[Auth] checkAdminRole: error/timeout, retrying...", retryCount + 1, err);
          adminCheckPromiseRef.current = null;
          return checkAdminRole(targetUserId, accessTokenArg, retryCount + 1);
        }
        
        console.error("[Auth] checkAdminRole: all retries exhausted", err);
        setIsAdmin(false);
        setIsAdminLoading(false);
        setIsAdminVerified(true);
        return false;
      }
    })();
    
    adminCheckPromiseRef.current = checkPromise;
    
    try {
      const result = await checkPromise;
      return result;
    } finally {
      adminCheckPromiseRef.current = null;
      setIsAdminLoading(false);
      console.log("[Auth] checkAdminRole: completed, isAdminLoading=false");
    }
  };

  // Função unificada para aplicar sessão
  const applySession = async (newSession: Session | null, source: string) => {
    console.log(`[Auth] applySession from ${source}:`, newSession?.user?.email ?? "no session");
    
    setSession(newSession);
    setUser(newSession?.user ?? null);
    setIsLoading(false);
    
    if (newSession?.user) {
      // Passar o token diretamente para evitar chamada extra a getSession()
      await checkAdminRole(newSession.user.id, newSession.access_token);
    } else {
      setIsAdmin(false);
      setIsAdminLoading(false);
      setIsAdminVerified(true);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let hasInitialized = false;
    
    console.log("[Auth] useEffect: setting up auth listener");
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;
        
        console.log("[Auth] onAuthStateChange:", event, newSession?.user?.email ?? "no user");
        
        // Ignorar INITIAL_SESSION se já inicializamos via getSession
        if (hasInitialized && event === 'INITIAL_SESSION') {
          console.log("[Auth] onAuthStateChange: ignoring INITIAL_SESSION (already initialized)");
          return;
        }
        
        // Ignorar SIGNED_IN duplicado se já temos sessão do mesmo usuário
        // IMPORTANTE: Verificar que session?.user?.id existe antes de comparar para evitar false positives
        if (event === 'SIGNED_IN' && session?.user?.id && newSession?.user?.id === session.user.id && !isLoading) {
          console.log("[Auth] onAuthStateChange: ignoring duplicate SIGNED_IN for same user");
          return;
        }
        
        await applySession(newSession, `onAuthStateChange:${event}`);
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      console.log("[Auth] initializeAuth: starting");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        hasInitialized = true;
        await applySession(session, "initializeAuth");
        console.log("[Auth] initializeAuth: completed");
      } catch (error) {
        console.error("[Auth] initializeAuth error:", error);
        if (isMounted) {
          setIsLoading(false);
          setIsAdmin(false);
          setIsAdminLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    // Cancelar qualquer request de admin em andamento
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearAdminCache();
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsAdminLoading(false);
    setIsAdminVerified(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAdmin,
        isAdminLoading,
        isAdminVerified,
        signIn,
        signUp,
        signOut,
        checkAdminRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
