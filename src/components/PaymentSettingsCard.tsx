import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const DEFAULT_METHODS = [
  { method: "cash", label: "Наличные", percent_fee: 0, fixed_fee: 0, sort_order: 0 },
  { method: "card", label: "Карта / QR", percent_fee: 0, fixed_fee: 0, sort_order: 1 },
  { method: "transfer", label: "Перевод", percent_fee: 0, fixed_fee: 0, sort_order: 2 },
  { method: "installments", label: "Рассрочка", percent_fee: 0, fixed_fee: 0, sort_order: 3 },
];

const PaymentSettingsCard = ({ companyId }: { companyId: string | null }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newMethod, setNewMethod] = useState({ method: "", label: "", percent_fee: "0", fixed_fee: "0" });

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["payment-settings", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("company_id", companyId)
        .order("sort_order");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Auto-initialize defaults if no settings exist
  const initDefaults = useMutation({
    mutationFn: async () => {
      if (!companyId || settings.length > 0) return;
      const rows = DEFAULT_METHODS.map(m => ({ ...m, company_id: companyId }));
      await supabase.from("payment_settings").insert(rows);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-settings"] }),
  });

  useEffect(() => {
    if (!isLoading && settings.length === 0 && companyId) {
      initDefaults.mutate();
    }
  }, [isLoading, settings.length, companyId]);

  const updateSetting = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("payment_settings").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-settings"] });
      toast({ title: "Настройки сохранены" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteSetting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_settings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-settings"] });
      toast({ title: "Способ оплаты удалён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const addMethod = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      const { error } = await supabase.from("payment_settings").insert({
        company_id: companyId,
        method: newMethod.method || newMethod.label.toLowerCase().replace(/\s+/g, "_"),
        label: newMethod.label,
        percent_fee: Number(newMethod.percent_fee) || 0,
        fixed_fee: Number(newMethod.fixed_fee) || 0,
        sort_order: settings.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-settings"] });
      setAddOpen(false);
      setNewMethod({ method: "", label: "", percent_fee: "0", fixed_fee: "0" });
      toast({ title: "Способ оплаты добавлен" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return null;

  return (
    <Card className="p-6 card-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Способы оплаты</h2>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый способ оплаты</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Название *</Label>
                <Input value={newMethod.label} onChange={e => setNewMethod(p => ({ ...p, label: e.target.value }))} placeholder="Криптовалюта" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Комиссия %</Label>
                  <Input type="number" value={newMethod.percent_fee} onChange={e => setNewMethod(p => ({ ...p, percent_fee: e.target.value }))} />
                </div>
                <div>
                  <Label>Фикс. комиссия ₽</Label>
                  <Input type="number" value={newMethod.fixed_fee} onChange={e => setNewMethod(p => ({ ...p, fixed_fee: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={() => addMethod.mutate()} disabled={!newMethod.label || addMethod.isPending}>
                {addMethod.isPending ? "Добавление..." : "Добавить"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Настройте комиссии для каждого способа оплаты. Комиссия будет автоматически добавлена к цене при продаже.
      </p>
      <Separator className="my-4" />

      <div className="space-y-3">
        {settings.map((s: any) => (
          <PaymentMethodRow
            key={s.id}
            setting={s}
            onUpdate={(updates) => updateSetting.mutate({ id: s.id, updates })}
            onDelete={() => deleteSetting.mutate(s.id)}
          />
        ))}
        {settings.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Настройки загружаются...</p>
        )}
      </div>
    </Card>
  );
};

const PaymentMethodRow = ({ setting, onUpdate, onDelete }: {
  setting: any;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
}) => {
  const [percentFee, setPercentFee] = useState(String(setting.percent_fee || 0));
  const [fixedFee, setFixedFee] = useState(String(setting.fixed_fee || 0));
  const [editing, setEditing] = useState(false);

  const hasChanges = Number(percentFee) !== Number(setting.percent_fee) || Number(fixedFee) !== Number(setting.fixed_fee);

  const save = () => {
    onUpdate({ percent_fee: Number(percentFee) || 0, fixed_fee: Number(fixedFee) || 0 });
    setEditing(false);
  };

  const feeDesc = () => {
    const parts = [];
    if (Number(setting.percent_fee)) parts.push(`${setting.percent_fee}%`);
    if (Number(setting.fixed_fee)) parts.push(`${Number(setting.fixed_fee).toLocaleString("ru")} ₽`);
    return parts.length > 0 ? parts.join(" + ") : "без комиссии";
  };

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={setting.is_active}
            onCheckedChange={(checked) => onUpdate({ is_active: checked })}
          />
          <div>
            <p className="text-sm font-medium">{setting.label}</p>
            <p className="text-xs text-muted-foreground">{feeDesc()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? "Скрыть" : "Изменить"}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {editing && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <Label className="text-xs">Комиссия %</Label>
            <Input type="number" value={percentFee} onChange={e => setPercentFee(e.target.value)} min="0" step="0.5" />
          </div>
          <div>
            <Label className="text-xs">Фикс. комиссия ₽</Label>
            <Input type="number" value={fixedFee} onChange={e => setFixedFee(e.target.value)} min="0" />
          </div>
          {hasChanges && (
            <Button size="sm" className="col-span-2" onClick={save}>Сохранить</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentSettingsCard;
