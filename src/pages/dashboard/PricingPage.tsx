import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    id: "start",
    name: "Старт",
    price: "1 990 ₽/мес",
    description: "Для начинающих предпринимателей",
    trial: "3 дня бесплатно",
    features: [
      { text: "1 магазин", included: true },
      { text: "До 2 сотрудников", included: true },
      { text: "До 30 телефонов на складе", included: true },
      { text: "Базовые продажи и склад", included: true },
      { text: "Мониторинг цен", included: false },
      { text: "Объявления Авито", included: false },
      { text: "Модуль ремонта", included: false },
      { text: "AI ассистент", included: false },
    ],
  },
  {
    id: "business",
    name: "Бизнес",
    price: "2 990 ₽/мес",
    description: "Для растущего бизнеса",
    trial: "3 дня бесплатно",
    popular: true,
    features: [
      { text: "До 3 магазинов", included: true },
      { text: "До 20 сотрудников", included: true },
      { text: "До 200 телефонов на складе", included: true },
      { text: "Модуль ремонта", included: true },
      { text: "AI ассистент", included: true },
      { text: "Мониторинг цен", included: true },
      { text: "Объявления Авито", included: true },
      { text: "Расширенная аналитика", included: true },
    ],
  },
  {
    id: "premier",
    name: "Премьер",
    price: "7 990 ₽/мес",
    description: "Для крупных сетей",
    features: [
      { text: "До 10 магазинов", included: true },
      { text: "Неограниченные сотрудники", included: true },
      { text: "Неограниченный склад", included: true },
      { text: "Все функции", included: true },
      { text: "Приоритетная поддержка", included: true },
      { text: "API доступ", included: true },
    ],
  },
];

const PricingPage = () => {
  const { subscription } = useSubscription();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Тарифы</h1>
        <p className="text-muted-foreground mt-1">Выберите подходящий план для вашего бизнеса</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = subscription.plan === plan.id;
          const isPopular = plan.popular;

          return (
            <Card
              key={plan.id}
              className={`relative p-6 flex flex-col ${
                isPopular
                  ? "border-2 border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                  : "card-shadow"
              }`}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3">
                  Популярный
                </Badge>
              )}

              <div className="space-y-2 mb-6">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <p className="text-3xl font-extrabold">{plan.price}</p>
                {(plan as any).trial && (
                  <p className="text-xs font-medium text-success">{(plan as any).trial}</p>
                )}
              </div>

              <div className="space-y-3 flex-1">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <Check className="h-4 w-4 text-success flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={f.included ? "" : "text-muted-foreground"}>{f.text}</span>
                  </div>
                ))}
              </div>

              <Button
                className="mt-6 w-full"
                variant={isPopular ? "default" : "outline"}
                disabled={isCurrent}
              >
                {isCurrent ? "Текущий план" : "Выбрать"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PricingPage;
