import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlatformAdminRole = "full_admin" | "manager" | "support" | null;

const isValidPlatformRole = (role: string | null | undefined): role is Exclude<PlatformAdminRole, null> => {
  return role === "full_admin" || role === "manager" || role === "support";
};

export const usePlatformAdmin = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["platform-admin", user?.id, user?.email],
    queryFn: async () => {
      if (!user) return { isAdmin: false, role: null as PlatformAdminRole };

      const normalizedEmail = user.email?.trim().toLowerCase();

      const [byIdResult, byEmailResult] = await Promise.all([
        supabase
          .from("platform_admins")
          .select("role")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
        normalizedEmail
          ? supabase
              .from("platform_admins")
              .select("role")
              .ilike("email", normalizedEmail)
              .order("created_at", { ascending: false })
              .limit(1)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (byIdResult.error) {
        console.error("Ошибка проверки platform_admins по user_id:", byIdResult.error);
      }
      if (byEmailResult.error) {
        console.error("Ошибка проверки platform_admins по email:", byEmailResult.error);
      }

      const matchedRow = byIdResult.data?.[0] ?? byEmailResult.data?.[0] ?? null;
      const role = matchedRow?.role;

      if (!isValidPlatformRole(role)) {
        return { isAdmin: false, role: null as PlatformAdminRole };
      }

      return { isAdmin: true, role };
    },
    enabled: !!user,
  });

  return {
    isAdmin: data?.isAdmin ?? false,
    adminRole: data?.role ?? null,
    isLoading,
  };
};
