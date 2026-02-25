import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InstallmentSettings {
  maxInstallments: number;
  interestFreeInstallments: number;
  monthlyInterestRate: number;
}

const DEFAULT_SETTINGS: InstallmentSettings = {
  maxInstallments: 12,
  interestFreeInstallments: 3,
  monthlyInterestRate: 0.0199, // 1.99%
};

export function useInstallmentSettings() {
  const [settings, setSettings] = useState<InstallmentSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Use raw query to avoid type conflicts with new columns
        const { data, error } = await supabase
          .from("store_settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching installment settings:", error);
          return;
        }

        if (data) {
          // Access properties using bracket notation to bypass TypeScript checks
          // These columns exist in DB but types haven't been regenerated yet
          const rawData = data as unknown as Record<string, unknown>;
          const maxInst = rawData["max_installments"];
          const freeInst = rawData["interest_free_installments"];
          const rate = rawData["monthly_interest_rate"];

          setSettings({
            maxInstallments: typeof maxInst === "number" ? maxInst : 12,
            interestFreeInstallments: typeof freeInst === "number" ? freeInst : 3,
            // Convert percentage to decimal (1.99 -> 0.0199)
            monthlyInterestRate: (typeof rate === "number" ? rate : 1.99) / 100,
          });
        }
      } catch (error) {
        console.error("Error fetching installment settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, isLoading };
}
