import { createContext, useContext, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
}

interface StoreContextType {
  stores: Store[];
  activeStoreId: string | null; // null = "all stores" mode
  setActiveStoreId: (id: string | null) => void;
  activeStore: Store | null;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType>({
  stores: [],
  activeStoreId: null,
  setActiveStoreId: () => {},
  activeStore: null,
  isLoading: true,
});

export const useStoreContext = () => useContext(StoreContext);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const { companyId } = useAuth();
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("company_id", companyId)
        .order("name");
      return (data || []) as Store[];
    },
    enabled: !!companyId,
  });

  const activeStore = activeStoreId
    ? stores.find((s) => s.id === activeStoreId) || null
    : null;

  return (
    <StoreContext.Provider
      value={{ stores, activeStoreId, setActiveStoreId, activeStore, isLoading }}
    >
      {children}
    </StoreContext.Provider>
  );
};
