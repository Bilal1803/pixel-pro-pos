import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Plus } from "lucide-react";
import { SalaryRuleRow } from "./SalaryRuleRow";

const ACCRUAL_TYPES = [
  { value: "device", label: "Продажа телефона", emoji: "📱" },
  { value: "accessory", label: "Продажа аксессуара", emoji: "🎧" },
  { value: "service", label: "Продажа услуги", emoji: "🔧" },
  { value: "repair", label: "Ремонт", emoji: "🛠️" },
  { value: "above_price", label: "Продажа выше цены", emoji: "💎" },
];

type SalaryRule = {
  id?: string;
  accrual_type: string;
  calc_type: string;
  value: number;
  is_active: boolean;
  min_price: number;
  max_price: number | null;
};

export const SalarySettingsCard = ({ employeeId, companyId }: { employeeId: string; companyId: string }) => {
  const qc = useQueryClient();
  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [usingGlobal, setUsingGlobal] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const { data: savedRules, isLoading } = useQuery({
    queryKey: ["salary-settings", companyId, employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_settings")
        .select("*")
        .eq("company_id", companyId)
        .eq("employee_id", employeeId)
        .order("accrual_type")
        .order("min_price");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!employeeId,
  });

  const { data: globalRules } = useQuery({
    queryKey: ["global-salary-settings", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_salary_settings")
        .select("*")
        .eq("company_id", companyId)
        .order("accrual_type")
        .order("min_price");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (savedRules) {
      const hasIndividual = savedRules.length > 0;
      setUsingGlobal(!hasIndividual);
      const source = hasIndividual ? savedRules : (globalRules || []);
      const mapped: SalaryRule[] = source.map((s: any) => ({
        id: hasIndividual ? s.id : undefined,
        accrual_type: s.accrual_type,
        calc_type: s.calc_type,
        value: s.value,
        is_active: s.is_active,
        min_price: s.min_price || 0,
        max_price: s.max_price ?? null,
      }));
      setRules(mapped);
      setHasChanges(false);
      setDeletedIds([]);
    }
  }, [savedRules, globalRules]);

  const addRule = (accrualType: string) => {
    setRules(prev => [...prev, { accrual_type: accrualType, calc_type: "percent", value: 0, is_active: true, min_price: 0, max_price: null }]);
    setHasChanges(true);
  };

  const removeRule = (index: number) => {
    const rule = rules[index];
    if (rule.id) setDeletedIds(prev => [...prev, rule.id!]);
    setRules(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateRule = (index: number, field: string, value: any) => {
    setRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const id of deletedIds) {
        await supabase.from("salary_settings").delete().eq("id", id);
      }
      for (const rule of rules) {
        if (rule.id) {
          await supabase.from("salary_settings").update({
            calc_type: rule.calc_type,
            value: rule.value,
            is_active: rule.is_active,
            min_price: rule.min_price,
            max_price: rule.max_price,
            updated_at: new Date().toISOString(),
          }).eq("id", rule.id);
        } else if (rule.is_active && rule.value > 0) {
          await supabase.from("salary_settings").insert({
            company_id: companyId,
            employee_id: employeeId,
            accrual_type: rule.accrual_type,
            calc_type: rule.calc_type,
            value: rule.value,
            is_active: rule.is_active,
            min_price: rule.min_price,
            max_price: rule.max_price,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-settings", companyId, employeeId] });
      toast.success("Настройки зарплаты сохранены");
      setHasChanges(false);
      setDeletedIds([]);
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const getRulesForType = (type: string) => rules.filter(r => r.accrual_type === type);

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Настройки начислений</p>
      {usingGlobal && (
        <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
          Используются общие настройки. Измените значения, чтобы задать индивидуальные ставки.
        </p>
      )}

      {ACCRUAL_TYPES.map(at => {
        const typeRules = getRulesForType(at.value);
        const showPriceRange = at.value !== "above_price" && at.value !== "device";
        return (
          <div key={at.value} className="border rounded-lg p-2.5 sm:p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{at.emoji} {at.label}</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addRule(at.value)}>
                <Plus className="h-3 w-3 mr-1" />Правило
              </Button>
            </div>

            {showPriceRange && typeRules.length > 0 && (
              <div className="flex flex-wrap gap-x-2 text-[10px] text-muted-foreground pl-12">
                <span className="w-16 sm:w-20">От ₽</span>
                <span className="w-16 sm:w-20">До ₽</span>
                <span className="w-[52px]">Тип</span>
                <span>Размер</span>
              </div>
            )}
            {!showPriceRange && typeRules.length > 0 && (
              <div className="flex flex-wrap gap-x-2 text-[10px] text-muted-foreground pl-12">
                <span className="w-[52px]">Тип</span>
                <span>Размер</span>
              </div>
            )}

            {typeRules.length > 0 ? (
              typeRules.map((rule) => {
                const idx = rules.indexOf(rule);
                return (
                  <SalaryRuleRow
                    key={idx}
                    rule={rule}
                    showPriceRange={showPriceRange}
                    onUpdate={(field, value) => updateRule(idx, field, value)}
                    onRemove={() => removeRule(idx)}
                  />
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">Нет правил</p>
            )}

            {at.value === "above_price" && (
              <p className="text-[10px] text-muted-foreground">% или сумма от разницы между ценой продажи и ценой магазина</p>
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
  );
};
