import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const CONDITION_GRADES = ["A+", "A", "B", "C", "D"];
const BATTERY_GRADES = [
  { value: "90+", label: "90% и выше" },
  { value: "85-89", label: "85–89%" },
  { value: "80-84", label: "80–84%" },
  { value: "below80", label: "Ниже 80%" },
];

interface PriceAdjustmentsCardProps {
  companyId: string | null;
  type: "sale" | "buyback";
  title: string;
}

const PriceAdjustmentsCard = ({ companyId, type, title }: PriceAdjustmentsCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const condType = `${type}_condition`;
  const battType = `${type}_battery`;

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ["price-adjustments", companyId, type],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("price_adjustments")
        .select("*")
        .eq("company_id", companyId)
        .or(`type.eq.${condType},type.eq.${battType}`);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const getVal = (t: string, grade: string) => {
    const entry = adjustments.find((a: any) => a.type === t && a.grade === grade);
    return entry ? String(entry.adjustment) : "0";
  };

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const v: Record<string, string> = {};
    for (const g of CONDITION_GRADES) {
      v[`${condType}_${g}`] = getVal(condType, g);
    }
    for (const b of BATTERY_GRADES) {
      v[`${battType}_${b.value}`] = getVal(battType, b.value);
    }
    setValues(v);
  }, [adjustments]);

  const saveAdjustments = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Нет компании");
      const rows = Object.entries(values).map(([key, val]) => {
        const parts = key.split("_");
        const rowType = `${parts[0]}_${parts[1]}`;
        const grade = parts.slice(2).join("_");
        return { company_id: companyId, type: rowType, grade, adjustment: Number(val) || 0 };
      });

      for (const row of rows) {
        const existing = adjustments.find((a: any) => a.type === row.type && a.grade === row.grade);
        if (existing) {
          await supabase.from("price_adjustments").update({ adjustment: row.adjustment }).eq("id", (existing as any).id);
        } else {
          await supabase.from("price_adjustments").insert(row);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-adjustments"] });
      toast({ title: "Корректировки сохранены" });
    },
    onError: (e: unknown) => toast({ title: "Ошибка", description: e instanceof Error ? e.message : "Неизвестная ошибка", variant: "destructive" }),
  });

  if (isLoading) return null;

  return (
    <Card className="p-6 card-shadow">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Автоматическая коррекция рекомендуемой цены по состоянию и АКБ устройства
      </p>
      <Separator className="my-4" />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">По состоянию</p>
            {CONDITION_GRADES.map(g => (
              <div key={g} className="flex items-center gap-2">
                <span className="text-sm w-8 font-medium">{g}</span>
                <Input
                  type="number"
                  className="h-8"
                  value={values[`${condType}_${g}`] || "0"}
                  onChange={(e) => setValues(prev => ({ ...prev, [`${condType}_${g}`]: e.target.value }))}
                />
                <span className="text-xs text-muted-foreground">₽</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">По АКБ</p>
            {BATTERY_GRADES.map(b => (
              <div key={b.value} className="flex items-center gap-2">
                <span className="text-sm w-16 font-medium truncate" title={b.label}>{b.label}</span>
                <Input
                  type="number"
                  className="h-8"
                  value={values[`${battType}_${b.value}`] || "0"}
                  onChange={(e) => setValues(prev => ({ ...prev, [`${battType}_${b.value}`]: e.target.value }))}
                />
                <span className="text-xs text-muted-foreground">₽</span>
              </div>
            ))}
          </div>
        </div>
        <Button onClick={() => saveAdjustments.mutate()} disabled={saveAdjustments.isPending}>
          {saveAdjustments.isPending ? "Сохранение..." : "Сохранить корректировки"}
        </Button>
      </div>
    </Card>
  );
};

export default PriceAdjustmentsCard;
