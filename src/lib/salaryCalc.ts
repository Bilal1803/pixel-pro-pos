import { supabase } from "@/integrations/supabase/client";

type SalarySetting = {
  accrual_type: string;
  calc_type: string;
  value: number;
  is_active: boolean;
  min_price: number;
  max_price: number | null;
};

type CartItemForSalary = {
  item_type: string;
  price: number;
  original_price: number | null;
  cost_price: number;
  device_id: string | null;
  name: string;
  sale_item_id: string;
};

/**
 * Find the matching rule for a given accrual type and item price.
 * Rules are matched by price range: min_price <= price AND (max_price IS NULL OR price <= max_price)
 */
function findMatchingRule(settings: SalarySetting[], accrualType: string, price: number): SalarySetting | null {
  const candidates = settings.filter(
    s => s.accrual_type === accrualType && s.is_active
  );

  // For types with price ranges, find the matching one
  for (const rule of candidates) {
    const minOk = price >= (rule.min_price || 0);
    const maxOk = rule.max_price === null || rule.max_price === undefined || price <= rule.max_price;
    if (minOk && maxOk) return rule;
  }

  // Fallback: return first active rule (for device/above_price which don't use ranges)
  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * After a sale is created, calculate and insert salary accruals for the employee.
 */
export async function createSalaryAccruals(params: {
  companyId: string;
  employeeId: string;
  saleId: string;
  items: CartItemForSalary[];
  deviceSalePrices?: Record<string, number>;
}) {
  const { companyId, employeeId, saleId, items, deviceSalePrices = {} } = params;

  // Fetch salary settings for this employee
  const { data: settings } = await supabase
    .from("salary_settings")
    .select("*")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .eq("is_active", true);

  // If no individual settings, fall back to global defaults
  let activeSettings: any[] | null = settings;
  if (!activeSettings || activeSettings.length === 0) {
    const { data: globalSettings } = await supabase
      .from("global_salary_settings")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true);
    activeSettings = globalSettings;
  }

  if (!activeSettings || activeSettings.length === 0) return;

  const accruals: Array<{
    company_id: string;
    employee_id: string;
    sale_id: string;
    sale_item_id: string;
    accrual_type: string;
    amount: number;
    description: string;
  }> = [];

  for (const item of items) {
    let accrualType: string;
    if (item.item_type === "device") accrualType = "device";
    else if (item.item_type === "accessory") accrualType = "accessory";
    else if (item.item_type === "service") accrualType = "service";
    else if (item.item_type === "repair") accrualType = "repair";
    else continue;

    const rule = findMatchingRule(activeSettings, accrualType, item.price);
    if (rule) {
      let amount = 0;
      if (rule.calc_type === "percent") {
        amount = Math.round(item.price * rule.value / 100);
      } else {
        amount = rule.value;
      }

      if (amount > 0) {
        const rangeDesc = (rule.min_price > 0 || rule.max_price !== null)
          ? ` (${rule.min_price}–${rule.max_price ?? "∞"} ₽)`
          : "";
        accruals.push({
          company_id: companyId,
          employee_id: employeeId,
          sale_id: saleId,
          sale_item_id: item.sale_item_id,
          accrual_type: accrualType,
          amount,
          description: `${item.name}${rangeDesc}: ${rule.calc_type === "percent" ? `${rule.value}%` : `${rule.value} ₽`} = ${amount} ₽`,
        });
      }
    }

    // Check above_price bonus for devices
    if (item.item_type === "device" && item.device_id) {
      const abovePriceRule = findMatchingRule(activeSettings, "above_price", item.price);
      if (abovePriceRule) {
        const shopPrice = deviceSalePrices[item.device_id] || 0;
        if (shopPrice > 0 && item.price > shopPrice) {
          const diff = item.price - shopPrice;
          let bonus = 0;
          if (abovePriceRule.calc_type === "percent") {
            bonus = Math.round(diff * abovePriceRule.value / 100);
          } else {
            bonus = abovePriceRule.value;
          }

          if (bonus > 0) {
            accruals.push({
              company_id: companyId,
              employee_id: employeeId,
              sale_id: saleId,
              sale_item_id: item.sale_item_id,
              accrual_type: "above_price",
              amount: bonus,
              description: `Продажа выше цены: ${shopPrice} → ${item.price} ₽, разница ${diff} ₽, ${abovePriceRule.calc_type === "percent" ? `${abovePriceRule.value}%` : `${abovePriceRule.value} ₽`} = ${bonus} ₽`,
            });
          }
        }
      }
    }
  }

  if (accruals.length > 0) {
    await supabase.from("salary_accruals").insert(accruals);
  }
}
