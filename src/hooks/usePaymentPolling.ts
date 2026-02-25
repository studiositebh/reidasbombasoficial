import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentStatus {
  status: string;
  status_detail?: string;
  order_status: string;
  message: string;
}

interface UsePaymentPollingOptions {
  orderId: string | null;
  paymentId?: string | null;
  enabled?: boolean;
  intervalMs?: number;
  maxAttempts?: number;
  onApproved?: () => void;
  onRejected?: () => void;
}

export function usePaymentPolling({
  orderId,
  paymentId,
  enabled = true,
  intervalMs = 5000,
  maxAttempts = 120, // 10 minutes with 5s interval
  onApproved,
  onRejected,
}: UsePaymentPollingOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const checkStatus = useCallback(async () => {
    if (!orderId && !paymentId) return;

    try {
      const { data, error: fnError } = await supabase.functions.invoke("check-payment-status", {
        body: { order_id: orderId, payment_id: paymentId },
      });

      if (!isMountedRef.current) return;

      if (fnError) {
        console.error("Payment status check error:", fnError);
        setError("Erro ao verificar status do pagamento");
        return;
      }

      setStatus(data);
      setError(null);

      // Handle terminal states
      if (data.status === "approved") {
        setIsPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onApproved?.();
      } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(data.status)) {
        setIsPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onRejected?.();
      }
    } catch (err) {
      console.error("Payment polling error:", err);
      if (isMountedRef.current) {
        setError("Erro de conexão");
      }
    }
  }, [orderId, paymentId, onApproved, onRejected]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    if (!orderId && !paymentId) return;

    setIsPolling(true);
    setAttempts(0);
    
    // Initial check
    checkStatus();

    // Start interval
    intervalRef.current = setInterval(() => {
      setAttempts((prev) => {
        const newAttempts = prev + 1;
        if (newAttempts >= maxAttempts) {
          stopPolling();
          return prev;
        }
        checkStatus();
        return newAttempts;
      });
    }, intervalMs);
  }, [orderId, paymentId, checkStatus, intervalMs, maxAttempts]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const manualCheck = useCallback(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-start polling if enabled
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled && (orderId || paymentId)) {
      startPolling();
    }

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [enabled, orderId, paymentId, startPolling, stopPolling]);

  return {
    status,
    isPolling,
    attempts,
    error,
    startPolling,
    stopPolling,
    manualCheck,
    isApproved: status?.status === "approved",
    isPending: status?.status === "pending" || status?.status === "in_process",
    isRejected: ["rejected", "cancelled", "refunded", "charged_back"].includes(status?.status || ""),
  };
}
