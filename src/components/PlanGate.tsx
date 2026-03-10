import { useSubscription } from "@/hooks/useSubscription";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlanGateProps {
  feature: "repairs" | "ai" | "monitoring" | "listings" | "network" | "comparison" | "transfers";
  children: React.ReactNode;
}

const featureLabels: Record<string, { name: string; minPlan: string }> = {
  repairs: { name: "Модуль ремонта", minPlan: "Бизнес" },
  ai: { name: "AI ассистент", minPlan: "Бизнес" },
  monitoring: { name: "Мониторинг цен", minPlan: "Бизнес" },
  listings: { name: "Объявления Авито", minPlan: "Бизнес" },
  network: { name: "Сеть магазинов", minPlan: "Премьер" },
  comparison: { name: "Сравнение магазинов", minPlan: "Премьер" },
  transfers: { name: "Перемещение товаров", minPlan: "Премьер" },
};

const allowedPlans: Record<string, string[]> = {
  repairs: ["business", "premier"],
  ai: ["business", "premier"],
  monitoring: ["business", "premier"],
  listings: ["business", "premier"],
  network: ["premier"],
  comparison: ["premier"],
  transfers: ["premier"],
};

const PlanGate = ({ feature, children }: PlanGateProps) => {
  const { subscription } = useSubscription();
  const navigate = useNavigate();
  const info = featureLabels[feature];

  if (allowedPlans[feature].includes(subscription.plan)) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Функция недоступна</h2>
        <p className="text-muted-foreground text-sm">
          <strong>{info.name}</strong> доступен начиная с тарифа <strong>{info.minPlan}</strong>. Обновите подписку, чтобы разблокировать эту функцию.
        </p>
        <Button onClick={() => navigate("/dashboard/pricing")} className="w-full">
          Перейти к тарифам
        </Button>
      </Card>
    </div>
  );
};

export default PlanGate;
