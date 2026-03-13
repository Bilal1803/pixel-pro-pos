import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";

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
    <div className="space-y-3">
      {usingGlobal && (
        <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
          Используются общие настройки магазина. Измените значения ниже, чтобы задать индивидуальные ставки.
        </p>
      )}

      {ACCRUAL_TYPES.map(at => {
        const typeRules = getRulesForType(at.value);
        return (
          <div key={at.value} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{at.emoji} {at.label}</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addRule(at.value)}>
                <Plus className="h-3 w-3 mr-1" />Правило
              </Button>
            </div>

            {typeRules.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-xs">Вкл</TableHead>
                    {at.value !== "above_price" && at.value !== "device" && (
                      <>
                        <TableHead className="h-8 text-xs">От ₽</TableHead>
                        <TableHead className="h-8 text-xs">До ₽</TableHead>
                      </>
                    )}
                    <TableHead className="h-8 text-xs">Тип</TableHead>
                    <TableHead className="h-8 text-xs">Размер</TableHead>
                    <TableHead className="h-8 text-xs w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeRules.map((rule) => {
                    const idx = rules.indexOf(rule);
                    return (
                      <TableRow key={idx}>
                        <TableCell className="p-2">
                          <Switch checked={rule.is_active} onCheckedChange={(v) => updateRule(idx, "is_active", v)} />
                        </TableCell>
                        {at.value !== "above_price" && at.value !== "device" && (
                          <>
                            <TableCell className="p-2">
                              <Input
                                type="number"
                                value={rule.min_price || ""}
                                onChange={(e) => updateRule(idx, "min_price", Number(e.target.value) || 0)}
                                className="w-20 h-8 text-xs"
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input
                                type="number"
                                value={rule.max_price ?? ""}
                                onChange={(e) => updateRule(idx, "max_price", e.target.value ? Number(e.target.value) : null)}
                                className="w-20 h-8 text-xs"
                                placeholder="∞"
                              />
                            </TableCell>
                          </>
                        )}
                        <TableCell className="p-2">
                          <Select value={rule.calc_type} onValueChange={(v) => updateRule(idx, "calc_type", v)}>
                            <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="fixed">₽</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            value={rule.value || ""}
                            onChange={(e) => updateRule(idx, "value", Number(e.target.value) || 0)}
                            className="w-20 h-8 text-xs"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeRule(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
