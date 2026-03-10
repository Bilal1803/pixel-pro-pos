import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Smartphone, ShoppingCart, Users, ArrowDownUp, BarChart3, MessageSquare,
  Check, ArrowRight, X, Sparkles, Bell, Wrench, Tag, Shield, Zap, Star,
} from "lucide-react";

const features = [
  { icon: Smartphone, title: "Учёт по IMEI", desc: "Полный контроль склада с отслеживанием каждого устройства по IMEI, батарее, памяти и цвету" },
  { icon: ShoppingCart, title: "POS-система", desc: "Многотоварные продажи: телефоны, аксессуары, услуги. Смешанная оплата и скидки" },
  { icon: Users, title: "CRM клиентов", desc: "Накопительные скидки, история покупок, анализ клиентов и стратегии возврата" },
  { icon: ArrowDownUp, title: "Скупка и трейд-ин", desc: "Приём устройств от клиентов с оценкой, проверкой и автоматическим оприходованием" },
  { icon: Sparkles, title: "AI ассистент", desc: "Анализ продаж, рекомендации акций, прогнозирование спроса и советы по ценам" },
  { icon: Bell, title: "Уведомления", desc: "Мгновенные оповещения о продажах, сменах и кассе — в CRM и Telegram" },
  { icon: BarChart3, title: "Расширенная аналитика", desc: "Прибыль по моделям, средний чек, продажи по сотрудникам, залежалый товар" },
  { icon: MessageSquare, title: "Telegram Mini App", desc: "POS-интерфейс прямо в Telegram для сотрудников с мини-статистикой" },
  { icon: Wrench, title: "Модуль ремонта", desc: "Полный цикл ремонта: приём, статусы, запчасти, уведомления клиенту" },
  { icon: Tag, title: "Ценники и мониторинг", desc: "Генерация ценников и отслеживание рыночных цен конкурентов" },
  { icon: Shield, title: "Роли и доступ", desc: "Владелец, менеджер, сотрудник — гибкое разграничение прав" },
  { icon: Zap, title: "Stories и акции", desc: "Публикация баннеров и акционных предложений на дашборде" },
];

const steps = [
  { num: "01", title: "Зарегистрируйтесь", desc: "Создайте аккаунт компании за 30 секунд — без карты и обязательств" },
  { num: "02", title: "Настройте магазин", desc: "Импортируйте склад из Excel или добавьте устройства вручную" },
  { num: "03", title: "Продавайте и растите", desc: "Продажи, аналитика и AI-рекомендации с первого дня" },
];

const plans = [
  {
    id: "start",
    name: "Старт",
    price: "1 990",
    priceSuffix: " ₽/мес",
    desc: "Для начинающих предпринимателей",
    trial: "3 дня бесплатно",
    features: [
      { text: "1 магазин", included: true },
      { text: "До 2 сотрудников", included: true },
      { text: "До 30 устройств на складе", included: true },
      { text: "POS-система и CRM", included: true },
      { text: "Базовая аналитика", included: true },
      { text: "Модуль ремонта", included: false },
      { text: "AI ассистент", included: false },
      { text: "Telegram-уведомления", included: false },
    ],
  },
  {
    id: "business",
    name: "Бизнес",
    price: "2 990",
    priceSuffix: " ₽/мес",
    desc: "Для растущего бизнеса",
    popular: true,
    features: [
      { text: "До 3 магазинов", included: true },
      { text: "До 20 сотрудников", included: true },
      { text: "До 200 устройств на складе", included: true },
      { text: "Модуль ремонта", included: true },
      { text: "AI ассистент", included: true },
      { text: "Расширенная аналитика", included: true },
      { text: "Telegram-уведомления", included: true },
      { text: "Приоритетная поддержка", included: false },
    ],
  },
  {
    id: "premier",
    name: "Премьер",
    price: "7 990",
    priceSuffix: " ₽/мес",
    desc: "Для крупных сетей",
    features: [
      { text: "До 10 магазинов", included: true },
      { text: "Безлимит сотрудников", included: true },
      { text: "Безлимит устройств", included: true },
      { text: "Все функции Бизнес", included: true },
      { text: "API доступ", included: true },
      { text: "Приоритетная поддержка", included: true },
      { text: "Персональный менеджер", included: true },
      { text: "White-label брендинг", included: true },
    ],
  },
];

const stats = [
  { value: "500+", label: "Магазинов" },
  { value: "50 000+", label: "Устройств на учёте" },
  { value: "99.9%", label: "Аптайм" },
  { value: "24/7", label: "Поддержка" },
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
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Возможности</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Тарифы</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Как начать</a>
          </nav>
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative py-24 lg:py-32 text-center">
          <div className="mx-auto max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <Sparkles className="h-4 w-4 text-primary" />
              Теперь с AI ассистентом
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              CRM-система для{" "}
              <span className="text-primary">магазинов телефонов</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
              Склад IMEI, продажи, скупка, ремонт, AI-аналитика и Telegram — всё в одной платформе. Начните бесплатно за 30 секунд.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="text-base px-8" asChild>
                <Link to="/register">
                  Начать бесплатно <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <Link to="/login">Войти в аккаунт</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card">
        <div className="container py-10">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold sm:text-4xl">Всё для вашего бизнеса</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              12 модулей, которые закрывают все потребности магазина смартфонов
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="border-y bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-20">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                <Sparkles className="h-4 w-4" /> Новое
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">AI ассистент для вашего бизнеса</h2>
              <p className="mt-4 text-muted-foreground text-lg">
                Искусственный интеллект анализирует ваши продажи, склад и клиентов — и даёт конкретные рекомендации для роста прибыли.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Анализ прибыльности по моделям",
                  "Рекомендации скидок на залежалый товар",
                  "Идеи акций и бандлов",
                  "Стратегии возврата клиентов",
                  "Советы по ценообразованию",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Button size="lg" className="mt-8" asChild>
                <Link to="/register">Попробовать AI бесплатно</Link>
              </Button>
            </div>
            <div className="relative">
              <div className="rounded-2xl border bg-card p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">AI Ассистент</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-xl px-3 py-2 text-sm max-w-[75%]">
                      Какие модели приносят больше прибыли?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-xl px-3 py-2 text-sm max-w-[85%]">
                      📊 Топ-3 по прибыли за месяц:<br />
                      1. iPhone 13 — 127 500 ₽ (23 продажи)<br />
                      2. Samsung S23 — 89 200 ₽ (15 продаж)<br />
                      3. iPhone 14 — 76 800 ₽ (12 продаж)<br /><br />
                      💡 Рекомендую увеличить закупку iPhone 13 — спрос стабильно высокий.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 lg:py-28">
        <div className="container">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Начните за 3 шага</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground text-lg">
            Никаких сложных настроек — зарегистрируйтесь и работайте
          </p>
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-7 left-[60%] w-[80%] h-px bg-border" />
                )}
                <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold shadow-lg">
                  {s.num}
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-secondary/30 py-20 lg:py-28">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold sm:text-4xl">Простые и прозрачные тарифы</h2>
            <p className="mt-4 text-muted-foreground text-lg">Начните бесплатно, масштабируйтесь по мере роста</p>
          </div>
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border bg-card p-8 transition-all ${
                  p.popular
                    ? "ring-2 ring-primary shadow-xl shadow-primary/10 scale-[1.03] z-10"
                    : "shadow-sm hover:shadow-md"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow">
                      <Star className="h-3 w-3" /> Популярный
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                </div>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold">{p.price}</span>
                  <span className="text-muted-foreground">{p.priceSuffix}</span>
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {p.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-2.5 text-sm">
                      {f.included ? (
                        <Check className="h-4 w-4 text-success flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                      )}
                      <span className={f.included ? "" : "text-muted-foreground"}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full" size="lg" variant={p.popular ? "default" : "outline"} asChild>
                  <Link to="/register">{p.price === "Бесплатно" ? "Начать бесплатно" : "Выбрать"}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl bg-primary p-10 lg:p-14 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold sm:text-4xl">Готовы начать?</h2>
            <p className="mt-4 text-primary-foreground/80 text-lg">
              Присоединяйтесь к сотням магазинов, которые уже используют PhoneCRM для роста прибыли
            </p>
            <Button size="lg" variant="secondary" className="mt-8 text-base px-8" asChild>
              <Link to="/register">
                Создать аккаунт бесплатно <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <span className="font-bold">PhoneCRM</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Возможности</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Тарифы</a>
              <Link to="/login" className="hover:text-foreground transition-colors">Войти</Link>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 PhoneCRM. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
