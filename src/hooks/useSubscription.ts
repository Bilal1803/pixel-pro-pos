import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionLimits {
  plan: string;
  max_stores: number;
  max_employees: number;
  max_devices: number;
  repairs_enabled: boolean;
  ai_enabled: boolean;
}

const PLAN_DEFAULTS: Record<string, SubscriptionLimits> = {
  start: { plan: "start", max_stores: 1, max_employees: 2, max_devices: 30, repairs_enabled: false, ai_enabled: false },
  business: { plan: "business", max_stores: 3, max_employees: 20, max_devices: 200, repairs_enabled: true, ai_enabled: true },
  premier: { plan: "premier", max_stores: 10, max_employees: 999999, max_devices: 999999, repairs_enabled: true, ai_enabled: true },
};

export const useSubscription = () => {
  const { companyId } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("company_id", companyId)
        .single();
      return data;
    },
    enabled: !!companyId,
  });

  const limits: SubscriptionLimits = subscription
    ? {
        plan: subscription.plan,
        max_stores: subscription.max_stores,
        max_employees: subscription.max_employees,
        max_devices: subscription.max_devices,
        repairs_enabled: subscription.repairs_enabled,
        ai_enabled: subscription.ai_enabled,
      }
    : PLAN_DEFAULTS.start;

  const isTrialExpired = subscription
    ? !subscription.paid && subscription.trial_ends_at && new Date(subscription.trial_ends_at) < new Date()
    : false;

  const checkLimit = async (type: "stores" | "employees" | "devices"): Promise<{ allowed: boolean; current: number; max: number }> => {
    if (!companyId) return { allowed: false, current: 0, max: 0 };

    let current = 0;
    if (type === "stores") {
      const { count } = await supabase.from("stores").select("*", { count: "exact", head: true }).eq("company_id", companyId);
      current = count || 0;
    } else if (type === "employees") {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", companyId);
      current = count || 0;
    } else if (type === "devices") {
      const { count } = await supabase.from("devices").select("*", { count: "exact", head: true }).eq("company_id", companyId).in("status", ["testing", "available", "reserved"]);
      current = count || 0;
    }

    const maxMap = { stores: limits.max_stores, employees: limits.max_employees, devices: limits.max_devices };
    return { allowed: current < maxMap[type], current, max: maxMap[type] };
  };

  return { subscription: limits, isLoading, checkLimit, isTrialExpired, PLAN_DEFAULTS };
};
