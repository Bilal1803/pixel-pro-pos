import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlatformAdminRole = "full_admin" | "manager" | "support" | null;

export const usePlatformAdmin = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["platform-admin", user?.id],
    queryFn: async () => {
      if (!user) return { isAdmin: false, role: null as PlatformAdminRole };
      const { data: adminData } = await supabase
        .from("platform_admins")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!adminData) return { isAdmin: false, role: null as PlatformAdminRole };
      return { isAdmin: true, role: (adminData.role || "full_admin") as PlatformAdminRole };
    },
    enabled: !!user,
  });

  return {
    isAdmin: data?.isAdmin ?? false,
    adminRole: data?.role ?? null,
    isLoading,
  };
};
