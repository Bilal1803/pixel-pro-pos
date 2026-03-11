import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PaymentSetting = {
  id: string;
  method: string;
  label: string;
  percent_fee: number;
  fixed_fee: number;
  is_active: boolean;
  sort_order: number;
};

export const calcFee = (basePrice: number, setting: PaymentSetting | undefined) => {
  if (!setting) return { fee: 0, total: basePrice };
  const withFixed = basePrice + (setting.fixed_fee || 0);
  const fee = (setting.fixed_fee || 0) + Math.round(withFixed * (setting.percent_fee || 0) / 100);
  const total = basePrice + fee;
  return { fee, total };
};

export const usePaymentSettings = () => {
  const { companyId } = useAuth();

  const { data: paymentSettings = [] } = useQuery({
    queryKey: ["payment-settings", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("sort_order");
      return (data || []) as PaymentSetting[];
    },
    enabled: !!companyId,
  });

  const getSettingByMethod = (method: string) => paymentSettings.find(s => s.method === method);

  return { paymentSettings, getSettingByMethod };
};
