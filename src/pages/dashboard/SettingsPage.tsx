import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useNavigate } from "react-router-dom";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";
import { Send, Shield } from "lucide-react";
import PaymentSettingsCard from "@/components/PaymentSettingsCard";

const planLabels: Record<string, string> = { start: "Старт", business: "Бизнес", premier: "Премьер" };
const planPrices: Record<string, string> = { start: "1 990 ₽/мес", business: "2 990 ₽/мес", premier: "7 990 ₽/мес" };

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Неизвестная ошибка";
};

const SettingsPage = () => {
  const { companyId, user } = useAuth();
  const { isAdmin, isLoading: isAdminLoading } = usePlatformAdmin();
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

  const { data: userRole } = useQuery({
    queryKey: ["user-role-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      return data?.role || null;
    },
    enabled: !!user?.id,
  });

  

  const [emailForm, setEmailForm] = useState("");
  const [companyForm, setCompanyForm] = useState({ name: "", phone: "", address: "" });
  const [storeForm, setStoreForm] = useState({ name: "", address: "", phone: "" });

  useEffect(() => { if (user?.email) setEmailForm(user.email); }, [user?.email]);
  useEffect(() => { if (company) setCompanyForm({ name: company.name || "", phone: company.phone || "", address: company.address || "" }); }, [company]);
  useEffect(() => { if (store) setStoreForm({ name: store.name || "", address: store.address || "", phone: store.phone || "" }); }, [store]);

  const updateEmail = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Пользователь не найден");
      const normalizedEmail = emailForm.trim().toLowerCase();
      const currentEmail = (user.email || "").trim().toLowerCase();
      if (!normalizedEmail) throw new Error("Введите email");
      if (normalizedEmail === currentEmail) return { unchanged: true };
      const { error } = await supabase.auth.updateUser({ email: normalizedEmail });
      if (error) throw error;
      await supabase.from("profiles").update({ email: normalizedEmail }).eq("user_id", user.id);
      return { unchanged: false };
    },
    onSuccess: ({ unchanged }) => {
      if (unchanged) { toast({ title: "Email не изменился" }); return; }
      toast({ title: "Email обновлён", description: "Подтвердите новый адрес из письма." });
    },
    onError: (error: unknown) => toast({ title: "Ошибка", description: getErrorMessage(error), variant: "destructive" }),
  });

  const updateCompany = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      const { error } = await supabase.from("companies").update(companyForm).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["company-settings"] }); toast({ title: "Компания обновлена" }); },
    onError: () => toast({ title: "Ошибка сохранения", variant: "destructive" }),
  });

  const updateStore = useMutation({
    mutationFn: async () => {
      if (!store) return;
      const { error } = await supabase.from("stores").update(storeForm).eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stores-settings"] }); toast({ title: "Магазин обновлён" }); },
    onError: () => toast({ title: "Ошибка сохранения", variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Настройки</h1>
      <SectionHelp tips={SECTION_TIPS.settings} sectionKey="settings" />

      {/* Account */}
      <Card className="p-6 card-shadow space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Аккаунт</h2>
          <p className="text-sm text-muted-foreground mt-1">Настройки профиля</p>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label htmlFor="accountEmail">Email</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="accountEmail" type="email" value={emailForm} onChange={(e) => setEmailForm(e.target.value)} className="sm:flex-1" />
            <Button onClick={() => updateEmail.mutate()} disabled={updateEmail.isPending || !emailForm.trim()}>
              {updateEmail.isPending ? "Сохранение..." : "Изменить email"}
            </Button>
          </div>
        </div>
        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Админ-панель</span>
            </div>
            {isAdminLoading ? (
              <span className="text-xs text-muted-foreground">Проверка...</span>
            ) : isAdmin ? (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>Открыть</Button>
            ) : (
              <span className="text-xs text-muted-foreground">Нет доступа</span>
            )}
          </div>
        </div>
      </Card>

      {/* Company */}
      <Card className="p-6 card-shadow">
        <h2 className="text-lg font-semibold">Компания</h2>
        <Separator className="my-4" />
        <div className="space-y-4">
          <div><Label>Название компании</Label><Input value={companyForm.name} onChange={(e) => setCompanyForm(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
          <div><Label>Телефон</Label><Input value={companyForm.phone} onChange={(e) => setCompanyForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" /></div>
          <div><Label>Адрес</Label><Input value={companyForm.address} onChange={(e) => setCompanyForm(p => ({ ...p, address: e.target.value }))} className="mt-1" /></div>
          <Button onClick={() => updateCompany.mutate()} disabled={updateCompany.isPending}>
            {updateCompany.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </Card>

      {/* Store */}
      {store && (
        <Card className="p-6 card-shadow">
          <h2 className="text-lg font-semibold">Магазин</h2>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div><Label>Название</Label><Input value={storeForm.name} onChange={(e) => setStoreForm(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Адрес</Label><Input value={storeForm.address} onChange={(e) => setStoreForm(p => ({ ...p, address: e.target.value }))} className="mt-1" /></div>
            <div><Label>Телефон</Label><Input value={storeForm.phone} onChange={(e) => setStoreForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" /></div>
            <Button onClick={() => updateStore.mutate()} disabled={updateStore.isPending}>
              {updateStore.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </Card>
      )}

      <PaymentSettingsCard companyId={companyId} />

      {/* Listing Template moved to ListingsPage */}


      <TelegramSettingsCard companyId={companyId} />

      {/* Subscription */}
      <Card className="p-6 card-shadow">
        <h2 className="text-lg font-semibold">Подписка</h2>
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



/* ── Telegram Settings Card ── */
const TelegramSettingsCard = ({ companyId }: { companyId: string | null }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tgSettings, isLoading } = useQuery({
    queryKey: ["telegram-settings", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from("telegram_settings").select("*").eq("company_id", companyId).maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const [chatId, setChatId] = useState("");
  const [notifySales, setNotifySales] = useState(true);
  const [notifyShifts, setNotifyShifts] = useState(true);
  const [notifyCash, setNotifyCash] = useState(true);
  const [notifyAi, setNotifyAi] = useState(true);

  useEffect(() => {
    if (tgSettings) {
      setChatId(tgSettings.chat_id || "");
      setNotifySales(tgSettings.notify_sales);
      setNotifyShifts(tgSettings.notify_shifts);
      setNotifyCash(tgSettings.notify_cash);
      setNotifyAi(tgSettings.notify_ai);
    }
  }, [tgSettings]);

  const saveTelegram = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      const payload = { company_id: companyId, chat_id: chatId || null, notify_sales: notifySales, notify_shifts: notifyShifts, notify_cash: notifyCash, notify_ai: notifyAi };
      if (tgSettings) {
        const { error } = await supabase.from("telegram_settings").update(payload).eq("id", tgSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("telegram_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["telegram-settings"] }); toast({ title: "Настройки Telegram сохранены" }); },
    onError: (error: unknown) => toast({ title: "Ошибка", description: getErrorMessage(error), variant: "destructive" }),
  });

  const testMessage = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      const { data, error } = await supabase.functions.invoke("send-telegram", {
        body: { company_id: companyId, event_type: "sale", message: "🔔 <b>Тестовое уведомление</b>\n\nНастройка Telegram завершена!" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.skipped) throw new Error(data.reason || "Пропущено");
    },
    onSuccess: () => toast({ title: "Тестовое сообщение отправлено ✓" }),
    onError: (error: unknown) => toast({ title: "Ошибка отправки", description: getErrorMessage(error), variant: "destructive" }),
  });

  if (isLoading) return null;

  return (
    <Card className="p-6 card-shadow">
      <div className="flex items-center gap-2">
        <Send className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Telegram уведомления</h2>
      </div>
      <Separator className="my-4" />
      <div className="space-y-5">
        <div>
          <Label>Chat ID</Label>
          <Input placeholder="-1001234567890" value={chatId} onChange={(e) => setChatId(e.target.value)} className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">Узнайте Chat ID через @userinfobot</p>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium">Типы уведомлений</p>
          <div className="flex items-center justify-between"><Label className="cursor-pointer">🛒 Продажи</Label><Switch checked={notifySales} onCheckedChange={setNotifySales} /></div>
          <div className="flex items-center justify-between"><Label className="cursor-pointer">🕐 Смены</Label><Switch checked={notifyShifts} onCheckedChange={setNotifyShifts} /></div>
          <div className="flex items-center justify-between"><Label className="cursor-pointer">💰 Касса</Label><Switch checked={notifyCash} onCheckedChange={setNotifyCash} /></div>
          <div className="flex items-center justify-between"><Label className="cursor-pointer">🤖 AI</Label><Switch checked={notifyAi} onCheckedChange={setNotifyAi} /></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => saveTelegram.mutate()} disabled={saveTelegram.isPending}>
            {saveTelegram.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
          <Button variant="outline" onClick={() => testMessage.mutate()} disabled={testMessage.isPending || !chatId}>
            {testMessage.isPending ? "Отправка..." : "Тест"}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SettingsPage;
