import { supabase } from "@/integrations/supabase/client";

/**
 * Creates cash_operations records after a sale to keep the cash register in sync.
 * - For "cash" payments: creates a single deposit for the full amount
 * - For "mixed" payments: creates a deposit for the cash portion only
 * - For non-cash payments: no cash operation needed
 */
export async function createSaleCashOperations(params: {
  companyId: string;
  employeeId: string;
  storeId: string | null;
  paymentMethod: string;
  totalAmount: number;
  cashAmount?: number; // for mixed payments
  saleId: string;
}) {
  const { companyId, employeeId, storeId, paymentMethod, totalAmount, cashAmount, saleId } = params;

  // Find active shift for this employee
  const { data: activeShift } = await supabase
    .from("shifts")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();

  const shiftId = activeShift?.id || null;

  if (paymentMethod === "cash") {
    await supabase.from("cash_operations").insert({
      company_id: companyId,
      employee_id: employeeId,
      store_id: storeId,
      shift_id: shiftId,
      type: "sale_cash",
      amount: totalAmount,
      reason: `Продажа (наличные)`,
    });
  } else if (paymentMethod === "mixed" && cashAmount && cashAmount > 0) {
    await supabase.from("cash_operations").insert({
      company_id: companyId,
      employee_id: employeeId,
      store_id: storeId,
      shift_id: shiftId,
      type: "sale_cash",
      amount: cashAmount,
      reason: `Продажа (наличная часть)`,
    });
  }
}
