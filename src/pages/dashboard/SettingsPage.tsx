import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";

const planLabels: Record<string, string> = { start: "Старт", business: "Бизнес", premier: "Премьер" };
const planPrices: Record<string, string> = { start: "1 990 ₽/мес", business: "2 990 ₽/мес", premier: "7 990 ₽/мес" };

const SettingsPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  const { data: company } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from("companies").select("*").eq("id", companyId).single();
      return data;
    },
    enabled: !!companyId,
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["stores-settings", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("stores").select("*").eq("company_id", companyId).limit(1);
      return data || [];
    },
    enabled: !!companyId,
  });

  const store = stores[0] || null;

  const [companyForm, setCompanyForm] = useState({ name: "", phone: "", address: "" });
  const [storeForm, setStoreForm] = useState({ name: "", address: "", phone: "" });

  useEffect(() => {
    if (company) {
      setCompanyForm({ name: company.name || "", phone: company.phone || "", address: company.address || "" });
    }
  }, [company]);

  useEffect(() => {
    if (store) {
      setStoreForm({ name: store.name || "", address: store.address || "", phone: store.phone || "" });
    }
  }, [store]);

  const updateCompany = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      const { error } = await supabase.from("companies").update(companyForm).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast({ title: "Компания обновлена" });
    },
    onError: () => toast({ title: "Ошибка сохранения", variant: "destructive" }),
  });

  const updateStore = useMutation({
    mutationFn: async () => {
      if (!store) return;
      const { error } = await supabase.from("stores").update(storeForm).eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores-settings"] });
      toast({ title: "Магазин обновлён" });
    },
    onError: () => toast({ title: "Ошибка сохранения", variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Настройки</h1>

      <SectionHelp tips={SECTION_TIPS.settings} />

      <Card className="p-6 card-shadow">
        <h2 className="text-lg font-semibold">Компания</h2>
        <p className="text-sm text-muted-foreground mt-1">Основная информация о компании</p>
        <Separator className="my-4" />
        <div className="space-y-4">
          <div>
            <Label htmlFor="companyName">Название компании</Label>
            <Input id="companyName" value={companyForm.name} onChange={(e) => setCompanyForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="phone">Телефон</Label>
            <Input id="phone" value={companyForm.phone} onChange={(e) => setCompanyForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="address">Адрес</Label>
            <Input id="address" value={companyForm.address} onChange={(e) => setCompanyForm(p => ({ ...p, address: e.target.value }))} className="mt-1" />
          </div>
          <Button onClick={() => updateCompany.mutate()} disabled={updateCompany.isPending}>
            {updateCompany.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </Card>

      {store && (
        <Card className="p-6 card-shadow">
          <h2 className="text-lg font-semibold">Магазин</h2>
          <p className="text-sm text-muted-foreground mt-1">Настройки текущего магазина</p>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div>
              <Label htmlFor="storeName">Название магазина</Label>
              <Input id="storeName" value={storeForm.name} onChange={(e) => setStoreForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="storeAddress">Адрес магазина</Label>
              <Input id="storeAddress" value={storeForm.address} onChange={(e) => setStoreForm(p => ({ ...p, address: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="storePhone">Телефон магазина</Label>
              <Input id="storePhone" value={storeForm.phone} onChange={(e) => setStoreForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" />
            </div>
            <Button onClick={() => updateStore.mutate()} disabled={updateStore.isPending}>
              {updateStore.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6 card-shadow">
        <h2 className="text-lg font-semibold">Подписка</h2>
        <p className="text-sm text-muted-foreground mt-1">Текущий тарифный план</p>
        <Separator className="my-4" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Тариф: <span className="text-primary">{planLabels[subscription.plan] || subscription.plan}</span></p>
            <p className="text-sm text-muted-foreground">{planPrices[subscription.plan] || ""}</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard/pricing")}>Изменить тариф</Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
