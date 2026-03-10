import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const questions = [
  {
    key: "store_type",
    title: "Тип вашего магазина",
    options: [
      { value: "phones_only", label: "Только смартфоны" },
      { value: "phones_accessories", label: "Смартфоны + аксессуары" },
      { value: "phones_repairs", label: "Смартфоны + ремонт" },
      { value: "full_service", label: "Смартфоны, аксессуары и ремонт" },
    ],
  },
  {
    key: "price_segment",
    title: "Основной ценовой сегмент",
    options: [
      { value: "budget", label: "Бюджетный (до 15 000 ₽)" },
      { value: "mid", label: "Средний (15 000 – 40 000 ₽)" },
      { value: "premium", label: "Премиум (от 40 000 ₽)" },
      { value: "mixed", label: "Все сегменты" },
    ],
  },
  {
    key: "avg_daily_sales",
    title: "Среднее количество продаж в день",
    options: [
      { value: "1-3", label: "1–3 продажи" },
      { value: "4-10", label: "4–10 продаж" },
      { value: "11-30", label: "11–30 продаж" },
      { value: "30+", label: "Более 30 продаж" },
    ],
  },
  {
    key: "sales_channel",
    title: "Основной канал продаж",
    options: [
      { value: "offline", label: "Офлайн (розничная точка)" },
      { value: "online", label: "Онлайн (Avito, маркетплейсы)" },
      { value: "both", label: "Офлайн + онлайн" },
      { value: "wholesale", label: "Оптовые продажи" },
    ],
  },
  {
    key: "main_goal",
    title: "Главная цель для бизнеса",
    options: [
      { value: "increase_sales", label: "Увеличить продажи" },
      { value: "reduce_stock", label: "Сократить залежавшийся товар" },
      { value: "improve_margins", label: "Повысить маржинальность" },
      { value: "attract_clients", label: "Привлечь новых клиентов" },
    ],
  },
];

interface AISurveyProps {
  onComplete: () => void;
}

const AISurvey = ({ onComplete }: AISurveyProps) => {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const current = questions[step];
  const selected = answers[current.key];
  const isLast = step === questions.length - 1;

  const handleSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [current.key]: value }));
  };

  const handleNext = async () => {
    if (!selected) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("ai_survey_answers" as any).insert({
        company_id: companyId,
        user_id: user?.id,
        store_type: answers.store_type,
        price_segment: answers.price_segment,
        avg_daily_sales: answers.avg_daily_sales,
        sales_channel: answers.sales_channel,
        main_goal: answers.main_goal,
      } as any);
      if (error) throw error;
      onComplete();
    } catch (err: any) {
      toast({ title: "Ошибка сохранения", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b px-4 py-3 bg-primary/5">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Настройка AI-ассистента</span>
      </div>

      <div className="flex-1 flex flex-col justify-between p-4">
        <div>
          {/* Progress */}
          <div className="flex gap-1 mb-6">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground mb-1">
            Вопрос {step + 1} из {questions.length}
          </p>
          <h3 className="text-base font-semibold mb-4">{current.title}</h3>

          <div className="space-y-2">
            {current.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-all ${
                  selected === opt.value
                    ? "border-primary bg-primary/10 text-foreground font-medium"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>
          <Button
            size="sm"
            disabled={!selected || saving}
            onClick={handleNext}
          >
            {isLast ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                {saving ? "Сохранение..." : "Готово"}
              </>
            ) : (
              <>
                Далее
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AISurvey;
