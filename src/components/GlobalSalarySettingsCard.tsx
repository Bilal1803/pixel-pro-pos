import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Settings } from "lucide-react";

const ACCRUAL_TYPES = [
  { value: "device", label: "Продажа телефона", emoji: "📱" },
  { value: "accessory", label: "Продажа аксессуара", emoji: "🎧" },
  { value: "service", label: "Продажа услуги", emoji: "🔧" },
  { value: "repair", label: "Ремонт", emoji: "🛠️" },
  { value: "above_price", label: "Продажа выше цены", emoji: "💎" },
];

type GlobalSetting = {
  id?: string;
  accrual_type: string;
  calc_type: string;
  value: number;
  is_active: boolean;
};

export const GlobalSalarySettingsCard = ({ companyId, open, onOpenChange }: { companyId: string; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const qc = useQueryClient();
  const [settings, setSettings] = useState<Record<string, GlobalSetting>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["global-salary-settings", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_salary_settings")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && open,
  });

  useEffect(() => {
    if (savedSettings) {
      const map: Record<string, GlobalSetting> = {};
      for (const at of ACCRUAL_TYPES) {
        const saved = savedSettings.find((s: any) => s.accrual_type === at.value);
        map[at.value] = saved
          ? { id: saved.id, accrual_type: at.value, calc_type: saved.calc_type, value: saved.value, is_active: saved.is_active }
          : { accrual_type: at.value, calc_type: "percent", value: 0, is_active: false };
      }
      setSettings(map);
      setHasChanges(false);
    }
  }, [savedSettings]);

  const updateSetting = (type: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const at of ACCRUAL_TYPES) {
        const s = settings[at.value];
        if (!s) continue;

        if (s.id) {
          await supabase.from("global_salary_settings").update({
            calc_type: s.calc_type,
            value: s.value,
            is_active: s.is_active,
            updated_at: new Date().toISOString(),
          }).eq("id", s.id);
        } else if (s.is_active || s.value > 0) {
          await supabase.from("global_salary_settings").upsert({
            company_id: companyId,
            accrual_type: at.value,
            calc_type: s.calc_type,
            value: s.value,
            is_active: s.is_active,
          }, { onConflict: "company_id,accrual_type" });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["global-salary-settings", companyId] });
      toast.success("Общие настройки зарплаты сохранены");
      setHasChanges(false);
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Общие настройки зарплаты
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Стандартные ставки для всех новых сотрудников. Можно переопределить индивидуально в карточке сотрудника.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {ACCRUAL_TYPES.map(at => {
              const s = settings[at.value];
              if (!s) return null;
              return (
                <div key={at.value} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(v) => updateSetting(at.value, "is_active", v)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{at.emoji} {at.label}</p>
                    {at.value === "above_price" && (
                      <p className="text-[10px] text-muted-foreground">% или сумма от разницы между ценой продажи и ценой магазина</p>
                    )}
                  </div>
                  {s.is_active && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="number"
                        value={s.value || ""}
                        onChange={(e) => updateSetting(at.value, "value", Number(e.target.value) || 0)}
                        className="w-20 h-8 text-sm"
                        placeholder="0"
                      />
                      <Select value={s.calc_type} onValueChange={(v) => updateSetting(at.value, "calc_type", v)}>
                        <SelectTrigger className="w-20 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">%</SelectItem>
                          <SelectItem value="fixed">₽</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })}

            {hasChanges && (
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Сохранить настройки
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
