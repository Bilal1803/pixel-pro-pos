import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on key tables and invalidates
 * the corresponding TanStack Query caches so TMA stays in sync
 * with the main CRM dashboard (and vice-versa).
 */
export function useTmaRealtime(companyId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel("tma-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales", filter: `company_id=eq.${companyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tma-today-sales"] });
          queryClient.invalidateQueries({ queryKey: ["tma-shift-sales"] });
          queryClient.invalidateQueries({ queryKey: ["tma-analytics-sales"] });
          queryClient.invalidateQueries({ queryKey: ["tma-cash-sales-total"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices", filter: `company_id=eq.${companyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tma-devices"] });
          queryClient.invalidateQueries({ queryKey: ["tma-available-devices"] });
          queryClient.invalidateQueries({ queryKey: ["tma-stock"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `company_id=eq.${companyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tma-products"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cash_operations", filter: `company_id=eq.${companyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tma-cash-ops"] });
          queryClient.invalidateQueries({ queryKey: ["tma-cash-sales-total"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts", filter: `company_id=eq.${companyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tma-active-shift"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "salary_accruals", filter: `company_id=eq.${companyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tma-salary"] });
          queryClient.invalidateQueries({ queryKey: ["tma-salary-period"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "salary_bonuses", filter: `company_id=eq.${companyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tma-bonuses-period"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);
}
