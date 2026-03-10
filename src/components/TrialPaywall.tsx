import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CreditCard, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TrialPaywall = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Clock className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Пробный период закончился</h1>
          <p className="text-muted-foreground">
            Ваш бесплатный период использования PhoneCRM завершён. Оплатите тариф, чтобы продолжить работу.
          </p>
        </div>

        <div className="grid gap-3">
          <Card className="p-4 border-primary/30 bg-primary/5 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">Рекомендуем</Badge>
            </div>
            <p className="font-semibold">Бизнес — 2 990 ₽/мес</p>
            <p className="text-sm text-muted-foreground">3 магазина, 20 сотрудников, AI, ремонт, мониторинг</p>
          </Card>

          <Card className="p-4 text-left">
            <p className="font-semibold">Старт — 1 990 ₽/мес</p>
            <p className="text-sm text-muted-foreground">1 магазин, 2 сотрудника, 30 устройств</p>
          </Card>

          <Card className="p-4 text-left">
            <p className="font-semibold">Премьер — 7 990 ₽/мес</p>
            <p className="text-sm text-muted-foreground">До 10 магазинов, безлимитный склад и сотрудники</p>
          </Card>
        </div>

        <Button onClick={() => navigate("/dashboard/pricing")} className="w-full gap-2" size="lg">
          <CreditCard className="h-4 w-4" />
          Выбрать тариф и оплатить
        </Button>

        <p className="text-xs text-muted-foreground">
          Ваши данные сохранены и будут доступны после оплаты
        </p>
      </Card>
    </div>
  );
};

export default TrialPaywall;
