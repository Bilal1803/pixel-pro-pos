import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch salary accruals and bonuses for a company, with optional filters.
 */
export function useSalaryData(companyId: string | null, options?: {
  employeeId?: string;
  from?: string;
  to?: string;
}) {
  const { employeeId, from, to } = options || {};

  const { data: accruals = [], isLoading: accrualsLoading } = useQuery({
    queryKey: ["salary-accruals", companyId, employeeId, from, to],
    queryFn: async () => {
      let q = supabase
        .from("salary_accruals")
        .select("*")
        .eq("company_id", companyId!);
      if (employeeId) q = q.eq("employee_id", employeeId);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to);
      q = q.order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: bonuses = [], isLoading: bonusesLoading } = useQuery({
    queryKey: ["salary-bonuses-all", companyId, employeeId, from, to],
    queryFn: async () => {
      let q = supabase
        .from("salary_bonuses")
        .select("*")
        .eq("company_id", companyId!);
      if (employeeId) q = q.eq("employee_id", employeeId);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to);
      q = q.order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const totalAccruals = accruals.reduce((s: number, a: any) => s + (a.amount || 0), 0);
  const totalBonuses = bonuses.filter((b: any) => b.type === "bonus").reduce((s: number, b: any) => s + (b.amount || 0), 0);
  const totalPenalties = bonuses.filter((b: any) => b.type === "penalty").reduce((s: number, b: any) => s + (b.amount || 0), 0);
  const totalSalary = totalAccruals + totalBonuses - totalPenalties;

  // Group by employee
  const byEmployee: Record<string, { accruals: number; bonuses: number; penalties: number; total: number; salesCount: number }> = {};
  
  for (const a of accruals) {
    if (!byEmployee[a.employee_id]) byEmployee[a.employee_id] = { accruals: 0, bonuses: 0, penalties: 0, total: 0, salesCount: 0 };
    byEmployee[a.employee_id].accruals += a.amount || 0;
    // Count unique sales
    byEmployee[a.employee_id].salesCount = new Set(
      accruals.filter((x: any) => x.employee_id === a.employee_id && x.sale_id).map((x: any) => x.sale_id)
    ).size;
  }

  for (const b of bonuses) {
    if (!byEmployee[b.employee_id]) byEmployee[b.employee_id] = { accruals: 0, bonuses: 0, penalties: 0, total: 0, salesCount: 0 };
    if (b.type === "bonus") byEmployee[b.employee_id].bonuses += b.amount || 0;
    else byEmployee[b.employee_id].penalties += b.amount || 0;
  }

  for (const id in byEmployee) {
    const e = byEmployee[id];
    e.total = e.accruals + e.bonuses - e.penalties;
  }

  return {
    accruals,
    bonuses,
    totalAccruals,
    totalBonuses,
    totalPenalties,
    totalSalary,
    byEmployee,
    isLoading: accrualsLoading || bonusesLoading,
  };
}
