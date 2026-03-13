import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";

type SalaryRule = {
  id?: string;
  accrual_type: string;
  calc_type: string;
  value: number;
  is_active: boolean;
  min_price: number;
  max_price: number | null;
};

interface SalaryRuleRowProps {
  rule: SalaryRule;
  showPriceRange: boolean;
  onUpdate: (field: string, value: any) => void;
  onRemove: () => void;
}

export const SalaryRuleRow = ({ rule, showPriceRange, onUpdate, onRemove }: SalaryRuleRowProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5">
      <Switch checked={rule.is_active} onCheckedChange={(v) => onUpdate("is_active", v)} />
      
      {showPriceRange && (
        <>
          <Input
            type="number"
            value={rule.min_price || ""}
            onChange={(e) => onUpdate("min_price", Number(e.target.value) || 0)}
            className="w-16 sm:w-20 h-8 text-xs"
            placeholder="0"
          />
          <Input
            type="number"
            value={rule.max_price ?? ""}
            onChange={(e) => onUpdate("max_price", e.target.value ? Number(e.target.value) : null)}
            className="w-16 sm:w-20 h-8 text-xs"
            placeholder="∞"
          />
        </>
      )}

      <Select value={rule.calc_type} onValueChange={(v) => onUpdate("calc_type", v)}>
        <SelectTrigger className="w-[52px] h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="percent">%</SelectItem>
          <SelectItem value="fixed">₽</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="number"
        value={rule.value || ""}
        onChange={(e) => onUpdate("value", Number(e.target.value) || 0)}
        className="w-16 sm:w-20 h-8 text-xs"
        placeholder="0"
      />

      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
