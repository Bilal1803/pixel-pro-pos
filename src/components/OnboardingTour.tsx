import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Smartphone, ShoppingCart, ArrowDownUp, Users,
  Wrench, DollarSign, Clock, ChevronRight, ChevronLeft, X, Sparkles,
} from "lucide-react";

const steps = [
  {
    icon: Sparkles,
    title: "Добро пожаловать в PhoneCRM!",
    description: "Давайте быстро пройдёмся по основным разделам системы. Это займёт меньше минуты.",
    route: "/dashboard",
  },
  {
    icon: Smartphone,
    title: "Склад",
    description: "Здесь вы добавляете устройства, отслеживаете статусы (проверка, в наличии, продано) и управляете запасами по IMEI.",
    route: "/dashboard/inventory",
  },
  {
    icon: ShoppingCart,
    title: "Продажи",
    description: "Оформляйте продажи в один клик: выберите устройство, клиента, способ оплаты — и готово. Статус устройства обновится автоматически.",
    route: "/dashboard/sales",
  },
  {
    icon: ArrowDownUp,
    title: "Скупка",
    description: "Принимайте устройства от клиентов. После оценки устройство автоматически попадёт на склад.",
    route: "/dashboard/buyback",
  },
  {
    icon: Users,
    title: "Клиенты",
    description: "Ведите базу клиентов с контактами, историей покупок и скидками. Привязывайте клиентов к продажам и ремонтам.",
    route: "/dashboard/customers",
  },
  {
    icon: Wrench,
    title: "Ремонт",
    description: "Создавайте заказы на ремонт, отслеживайте статусы и уведомляйте клиентов о готовности.",
    route: "/dashboard/repairs",
  },
  {
    icon: DollarSign,
    title: "Финансы",
    description: "Автоматический расчёт выручки, себестоимости и чистой прибыли. Добавляйте расходы для точного учёта.",
    route: "/dashboard/finances",
  },
  {
    icon: Clock,
    title: "Смены",
    description: "Открывайте и закрывайте смены с учётом кассы. Контролируйте выручку каждого сотрудника.",
    route: "/dashboard/shifts",
  },
  {
    icon: LayoutDashboard,
    title: "Готово! 🎉",
    description: "Вы на главной панели. Начните с добавления первого устройства на склад. Удачных продаж!",
    route: "/dashboard",
  },
];

const STORAGE_KEY = "phonecrm_onboarding_done";

const OnboardingTour = () => {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setActive(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setActive(false);
    navigate("/dashboard");
  }, [navigate]);

  const next = useCallback(() => {
    if (step < steps.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      navigate(steps[nextStep].route);
    } else {
      finish();
    }
  }, [step, navigate, finish]);

  const prev = useCallback(() => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      navigate(steps[prevStep].route);
    }
  }, [step, navigate]);

  if (!active) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative mx-4 w-full max-w-lg rounded-2xl border bg-card p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Skip button */}
        <button
          onClick={finish}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Пропустить"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-8 w-8 text-primary" />
        </div>

        {/* Content */}
        <h2 className="text-center text-xl font-bold">{current.title}</h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
          {current.description}
        </p>

        {/* Progress dots */}
        <div className="mt-6 flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {!isFirst && (
              <Button variant="ghost" size="sm" onClick={prev}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Назад
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {isFirst && (
              <Button variant="ghost" size="sm" onClick={finish}>
                Пропустить
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {isLast ? "Начать работу" : "Далее"} {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
