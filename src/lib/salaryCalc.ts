import { supabase } from "@/integrations/supabase/client";

type SalarySetting = {
  accrual_type: string;
  calc_type: string;
  value: number;
  is_active: boolean;
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
 * After a sale is created, calculate and insert salary accruals for the employee.
 */
export async function createSalaryAccruals(params: {
  companyId: string;
  employeeId: string;
  saleId: string;
  items: CartItemForSalary[];
  deviceSalePrices?: Record<string, number>; // device_id -> sale_price from devices table
}) {
  const { companyId, employeeId, saleId, items, deviceSalePrices = {} } = params;

  // Fetch salary settings for this employee
  const { data: settings } = await supabase
    .from("salary_settings")
    .select("*")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .eq("is_active", true);

  if (!settings || settings.length === 0) return;

  const settingsMap: Record<string, SalarySetting> = {};
  for (const s of settings) {
    settingsMap[s.accrual_type] = s;
  }

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
    // Map item_type to accrual_type
    let accrualType: string;
    if (item.item_type === "device") accrualType = "device";
    else if (item.item_type === "accessory") accrualType = "accessory";
    else if (item.item_type === "service" || item.item_type === "repair") accrualType = "service";
    else continue;

    const setting = settingsMap[accrualType];
    if (setting) {
      let amount = 0;
      if (setting.calc_type === "percent") {
        amount = Math.round(item.price * setting.value / 100);
      } else {
        amount = setting.value;
      }

      if (amount > 0) {
        accruals.push({
          company_id: companyId,
          employee_id: employeeId,
          sale_id: saleId,
          sale_item_id: item.sale_item_id,
          accrual_type: accrualType,
          amount,
          description: `${item.name}: ${setting.calc_type === "percent" ? `${setting.value}%` : `${setting.value} ₽`} = ${amount} ₽`,
        });
      }
    }

    // Check above_price bonus for devices
    if (item.item_type === "device" && item.device_id) {
      const abovePriceSetting = settingsMap["above_price"];
      if (abovePriceSetting) {
        const shopPrice = deviceSalePrices[item.device_id] || 0;
        if (shopPrice > 0 && item.price > shopPrice) {
          const diff = item.price - shopPrice;
          let bonus = 0;
          if (abovePriceSetting.calc_type === "percent") {
            bonus = Math.round(diff * abovePriceSetting.value / 100);
          } else {
            bonus = abovePriceSetting.value;
          }

          if (bonus > 0) {
            accruals.push({
              company_id: companyId,
              employee_id: employeeId,
              sale_id: saleId,
              sale_item_id: item.sale_item_id,
              accrual_type: "above_price",
              amount: bonus,
              description: `Продажа выше цены: ${shopPrice} → ${item.price} ₽, разница ${diff} ₽, ${abovePriceSetting.calc_type === "percent" ? `${abovePriceSetting.value}%` : `${abovePriceSetting.value} ₽`} = ${bonus} ₽`,
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
