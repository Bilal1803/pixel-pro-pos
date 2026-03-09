import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  ShoppingCart,
  Users,
  ArrowDownUp,
  BarChart3,
  MessageSquare,
  Check,
  ArrowRight,
} from "lucide-react";

const features = [
  { icon: Smartphone, title: "Учёт по IMEI", desc: "Полный контроль склада с отслеживанием каждого устройства по IMEI" },
  { icon: ShoppingCart, title: "POS-система", desc: "Быстрые продажи с поддержкой смешанной оплаты" },
  { icon: Users, title: "CRM клиентов", desc: "Накопительные скидки, история покупок, база клиентов" },
  { icon: ArrowDownUp, title: "Скупка и трейд-ин", desc: "Приём устройств от клиентов с оценкой и проверкой" },
  { icon: BarChart3, title: "Аналитика прибыли", desc: "Выручка, расходы, маржа — всё в реальном времени" },
  { icon: MessageSquare, title: "Telegram Mini App", desc: "POS-интерфейс прямо в Telegram для сотрудников" },
];

const steps = [
  { num: "01", title: "Зарегистрируйтесь", desc: "Создайте аккаунт компании за 30 секунд" },
  { num: "02", title: "Импортируйте склад", desc: "Загрузите устройства или добавьте вручную" },
  { num: "03", title: "Начните продавать", desc: "Продажи, скупка и аналитика с первого дня" },
];

const plans = [
  {
    name: "Магазин",
    price: "1 990",
    desc: "Для одного магазина",
    features: ["1 магазин", "3 сотрудника", "Учёт по IMEI", "POS-система", "CRM клиентов", "Аналитика"],
  },
  {
    name: "Сеть",
    price: "4 990",
    desc: "Для сети магазинов",
    features: ["До 10 магазинов", "Безлимит сотрудников", "Всё из «Магазин»", "Мониторинг цен", "Telegram Mini App", "Приоритетная поддержка"],
    popular: true,
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">PhoneCRM</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Войти</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Начать бесплатно</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-24 text-center">
        <div className="mx-auto max-w-3xl animate-fade-in">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            CRM для магазинов{" "}
            <span className="text-gradient">телефонов</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Склад IMEI, продажи, трейд-ин и аналитика в одной системе
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/register">
                Начать бесплатно <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Войти</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-secondary/30 py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">Всё для вашего бизнеса</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Полный набор инструментов для управления магазином телефонов
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6 card-shadow transition-shadow hover:card-shadow-hover">
                <f.icon className="h-10 w-10 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">Как это работает</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  {s.num}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t bg-secondary/30 py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">Тарифы</h2>
          <div className="mx-auto mt-12 grid max-w-3xl gap-8 sm:grid-cols-2">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-xl border bg-card p-8 card-shadow ${p.popular ? "ring-2 ring-primary" : ""}`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Популярный
                  </span>
                )}
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold">{p.price}</span>
                  <span className="text-muted-foreground"> ₽/мес</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full" variant={p.popular ? "default" : "outline"} asChild>
                  <Link to="/register">Выбрать</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <span className="font-semibold">PhoneCRM</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 PhoneCRM. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
