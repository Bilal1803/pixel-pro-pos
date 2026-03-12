import { Link, Navigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Smartphone, ShoppingCart, Users, ArrowDownUp, BarChart3, MessageSquare,
  Check, ArrowRight, X, Sparkles, Tag, Shield, Wrench, Star, Headphones,
  Package, DollarSign, TrendingUp, Printer, Send, ChevronRight,
  ClipboardList, Megaphone, CalendarCheck, Bell,
} from "lucide-react";

/* ── Data ── */

const problems = [
  { icon: "📋", text: "Учёт телефонов ведётся в Excel" },
  { icon: "🔢", text: "Нет учёта IMEI устройств" },
  { icon: "📱", text: "Нет системы скупки телефонов" },
  { icon: "📦", text: "Сложно контролировать склад" },
  { icon: "📵", text: "Нет удобного приложения для продавцов" },
  { icon: "📝", text: "Задачи теряются в чатах" },
];

const solutions = [
  { icon: Smartphone, text: "Учёт устройств по IMEI", desc: "Каждое устройство с уникальным IMEI, историей и статусом" },
  { icon: Package, text: "Полный контроль склада", desc: "Остатки, перемещения между точками и статусы в реальном времени" },
  { icon: ShoppingCart, text: "Продажи и оформление сделок", desc: "Быстрое оформление с выбором способа оплаты и скидками" },
  { icon: ArrowDownUp, text: "Система скупки телефонов", desc: "Оценка, выкуп и автоматическое добавление на склад" },
  { icon: Tag, text: "Учёт аксессуаров и товаров", desc: "Чехлы, стёкла и другие товары с остатками и ценами" },
  { icon: BarChart3, text: "Финансовая аналитика", desc: "Выручка, прибыль, расходы и динамика по периодам" },
  { icon: ClipboardList, text: "Система задач для сотрудников", desc: "Назначение, контроль сроков и отслеживание выполнения" },
  { icon: Megaphone, text: "AI-контроль объявлений на Авито", desc: "Анализ цен и рекомендации по улучшению объявлений" },
  { icon: MessageSquare, text: "Telegram Mini App для продавцов", desc: "Продажи, склад и касса прямо в Telegram без отдельного приложения" },
  { icon: DollarSign, text: "Управление кассой", desc: "Приход, расход, инкассация и баланс по каждой точке" },
  { icon: Users, text: "Управление сотрудниками", desc: "Роли, доступы и привязка сотрудников к точкам продаж" },
  { icon: Wrench, text: "Ремонт устройств", desc: "Приём заявок, статусы ремонта и уведомления клиентов" },
  { icon: TrendingUp, text: "Мониторинг цен конкурентов", desc: "Отслеживание рыночных цен и расчёт маржинальности" },
  { icon: Printer, text: "Автоматические ценники", desc: "Генерация и печать ценников с логотипом и QR-кодом" },
  { icon: Sparkles, text: "AI ассистент для бизнеса", desc: "Умные подсказки по ценам, спросу и оптимизации продаж" },
  { icon: Shield, text: "Контроль смен и доступов", desc: "Открытие и закрытие смен с контролем кассы" },
  { icon: Send, text: "Telegram уведомления", desc: "Мгновенные оповещения о продажах, задачах и событиях" },
  { icon: Headphones, text: "Поддержка клиентов", desc: "Быстрая помощь через встроенный чат и тикеты" },
];

const miniAppFeatures = [
  "Оформление продажи за несколько секунд",
  "Работа со складом",
  "Оформление скупки устройств",
  "Задачи на день и уведомления",
  "Работа с кассой",
  "Управление сменами",
];

const inventoryStatuses = [
  { label: "В наличии", color: "bg-green-500" },
  { label: "Продан", color: "bg-blue-500" },
  { label: "Ремонт", color: "bg-amber-500" },
  { label: "Резерв", color: "bg-purple-500" },
];

const inventoryFeatures = [
  "Учёт устройств по IMEI",
  "Отслеживание статусов устройств",
  "Статус публикации объявления",
  "Разные цены для разных способов оплаты",
  "История устройства",
];

const buybackFeatures = [
  "База цен выкупа устройств",
  "Быстрое оформление скупки",
  "Автоматическое добавление устройства на склад",
];

const taskFeatures = [
  "Задачи от руководителя сотрудникам",
  "Задачи от сотрудников руководству",
  "Ежедневные задачи на смену",
  "Контроль просроченных задач",
  "История выполнения задач",
];

const listingFeatures = [
  "AI анализ склада: какие устройства не опубликованы",
  "Автоматические задачи на публикацию объявлений",
  "Напоминание о перевыкладке через 30 дней",
  "Статус объявления на каждом устройстве",
  "Уведомления руководителю о задержках",
];

const analyticsMetrics = [
  { icon: DollarSign, label: "Выручка", value: "1 250 000 ₽" },
  { icon: TrendingUp, label: "Прибыль", value: "387 500 ₽" },
  { icon: ShoppingCart, label: "Продажи", value: "156" },
  { icon: Package, label: "Касса", value: "89 400 ₽" },
];

const aiExamples = [
  "Какие телефоны лучше продаются",
  "Какие устройства нужно закупить",
  "Какие цены стоит изменить",
  "Какие объявления нужно обновить",
];

const plans = [
  {
    id: "start",
    name: "Старт",
    price: "1 990",
    desc: "Для начинающих предпринимателей",
    trial: "3 дня бесплатно",
    features: [
      { text: "1 магазин", ok: true },
      { text: "2 сотрудника", ok: true },
      { text: "До 30 устройств на складе", ok: true },
      { text: "POS-система и CRM", ok: true },
      { text: "Система задач", ok: true },
      { text: "Базовая аналитика", ok: true },
      { text: "AI ассистент", ok: false },
      { text: "AI-контроль объявлений", ok: false },
      { text: "Модуль ремонта", ok: false },
    ],
  },
  {
    id: "business",
    name: "Бизнес",
    price: "2 990",
    desc: "Для растущего бизнеса",
    trial: "3 дня бесплатно",
    popular: true,
    features: [
      { text: "До 3 магазинов", ok: true },
      { text: "До 20 сотрудников", ok: true },
      { text: "До 200 устройств", ok: true },
      { text: "AI ассистент", ok: true },
      { text: "AI-контроль объявлений", ok: true },
      { text: "Система задач", ok: true },
      { text: "Модуль ремонта", ok: true },
      { text: "Мониторинг цен", ok: true },
      { text: "Telegram-уведомления", ok: true },
    ],
  },
  {
    id: "premier",
    name: "Премьер",
    price: "7 990",
    desc: "Для крупных сетей",
    features: [
      { text: "До 10 магазинов", ok: true },
      { text: "Безлимит сотрудников", ok: true },
      { text: "Безлимит устройств", ok: true },
      { text: "Все функции", ok: true },
      { text: "Приоритетная поддержка", ok: true },
      { text: "Персональный менеджер", ok: true },
    ],
  },
];

/* ── Animated Solutions Grid ── */

const SolutionsGrid = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<Set<number>>(new Set());

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            setVisible((prev) => new Set(prev).add(idx));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    el.querySelectorAll("[data-idx]").forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={gridRef} className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {solutions.map((s, i) => (
        <div
          key={s.text}
          data-idx={i}
          className="flex items-start gap-4 rounded-xl border bg-card p-6 hover:shadow-md transition-all duration-500"
          style={{
            opacity: visible.has(i) ? 1 : 0,
            transform: visible.has(i) ? "translateY(0)" : "translateY(24px)",
            transitionDelay: `${(i % 3) * 100}ms`,
          }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <s.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{s.text}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Component ── */

const LandingPage = () => {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-foreground">FILTER CRM</span>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Возможности</a>
            <a href="#modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Функции</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Тарифы</a>
            <a href="#support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Поддержка</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Войти</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Начать бесплатно</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container relative grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
              CRM система для магазинов смартфонов
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
              Управляйте складом, продажами, задачами сотрудников и объявлениями в одной системе.
            </p>
            <p className="mt-3 text-muted-foreground">
              PhoneCRM объединяет склад, продажи, кассу, скупку, систему задач, AI-контроль объявлений и аналитику бизнеса.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to="/register">
                  Начать бесплатно <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/demo">Посмотреть демо</Link>
              </Button>
            </div>
          </div>
          {/* Mock dashboard screenshot */}
          <div className="relative hidden lg:block">
            <div className="rounded-2xl border bg-card shadow-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-warning/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-muted-foreground">PhoneCRM — Дашборд</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { l: "Продажи сегодня", v: "12", c: "text-primary" },
                  { l: "Выручка", v: "284 500 ₽", c: "text-green-600" },
                  { l: "На складе", v: "87", c: "text-foreground" },
                ].map((m) => (
                  <div key={m.l} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{m.l}</p>
                    <p className={`text-lg font-bold ${m.c}`}>{m.v}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {["iPhone 15 Pro Max 256GB", "Samsung S24 Ultra 512GB", "iPhone 14 128GB"].map((d, i) => (
                  <div key={d} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="text-foreground">{d}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${i === 0 ? "bg-green-100 text-green-700" : i === 1 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {i === 0 ? "В наличии" : i === 1 ? "Резерв" : "Продан"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Problem ─── */}
      <section className="border-y bg-muted/30 py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center sm:text-4xl">
            Почему обычные CRM не подходят для магазинов смартфонов?
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map((p) => (
              <div key={p.text} className="flex flex-col items-center text-center rounded-xl border bg-card p-6">
                <span className="text-3xl mb-3">{p.icon}</span>
                <p className="text-sm font-medium text-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Solution ─── */}
      <section id="features" className="py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center sm:text-4xl">
            PhoneCRM — система, созданная специально для магазинов техники
          </h2>
          <SolutionsGrid />
        </div>
      </section>

      {/* ─── Tasks ─── */}
      <section className="border-y bg-muted/30 py-20">
        <div className="container grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
              <ClipboardList className="h-4 w-4" /> Задачи
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl">Система задач для управления магазином</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Ставьте задачи сотрудникам, контролируйте выполнение и получайте обратную связь от команды.
            </p>
            <ul className="mt-8 space-y-3">
              {taskFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {/* Tasks mock */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="text-sm font-semibold mb-4">Задачи на сегодня</p>
            <div className="space-y-2">
              {[
                { title: "Опубликовать iPhone 14 на Авито", status: "В работе", color: "bg-yellow-100 text-yellow-700" },
                { title: "Сделать переоценку устройств", status: "Новая", color: "bg-blue-100 text-blue-700" },
                { title: "Распечатать ценники", status: "Выполнена", color: "bg-green-100 text-green-700" },
                { title: "Проверить склад", status: "Новая", color: "bg-blue-100 text-blue-700" },
              ].map((t) => (
                <div key={t.title} className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
                  <span className="text-foreground">{t.title}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${t.color}`}>{t.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                <Bell className="inline h-3 w-3 mr-1" />
                Задача от сотрудника: «Нужно заказать коробки»
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── AI Listings ─── */}
      <section className="py-20">
        <div className="container grid gap-12 lg:grid-cols-2 items-center">
          <div className="order-2 lg:order-1">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">AI анализ объявлений</p>
              </div>
              <div className="space-y-2">
                {[
                  { name: "iPhone 15 Pro 256GB", icon: "📢", hint: "Не опубликован — 2 дня" },
                  { name: "Samsung S24 128GB", icon: "✔", hint: "Опубликован на Авито" },
                  { name: "iPhone 13 128GB", icon: "🔄", hint: "Перевыложить (30+ дней)" },
                ].map((d) => (
                  <div key={d.name} className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{d.icon}</span>
                      <span className="font-medium text-foreground">{d.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.hint}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg bg-primary/5 p-2.5 text-xs text-primary">
                <Sparkles className="inline h-3 w-3 mr-1" />
                AI нашёл 5 устройств без объявлений. Задачи созданы автоматически.
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
              <Megaphone className="h-4 w-4" /> Объявления
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl">AI-контроль публикации объявлений</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Система автоматически находит устройства без объявлений и создаёт задачи на публикацию.
            </p>
            <ul className="mt-8 space-y-3">
              {listingFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Mini App ─── */}
      <section id="modules" className="border-y bg-muted/30 py-20">
        <div className="container grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
              <MessageSquare className="h-4 w-4" /> Telegram Mini App
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl">Рабочее приложение для продавцов</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Сотрудники могут продавать устройства, выполнять задачи, работать со складом и кассой прямо со своего телефона.
            </p>
            <ul className="mt-8 space-y-3">
              {miniAppFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {/* Mini App mock */}
          <div className="flex justify-center">
            <div className="w-[280px] rounded-[2rem] border-4 border-foreground/10 bg-card p-4 shadow-xl">
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="text-xs font-semibold text-center text-foreground mb-3">PhoneCRM</p>
                <div className="space-y-2">
                  {["📱 Продажа", "📦 Склад", "💰 Касса", "📋 Задачи", "🔄 Скупка", "📊 Смена"].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-sm border">
                      <span>{item}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Inventory ─── */}
      <section className="py-20">
        <div className="container grid gap-12 lg:grid-cols-2 items-center">
          <div className="order-2 lg:order-1">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold mb-4">Статусы устройств</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {inventoryStatuses.map((s) => (
                  <span key={s.label} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                    <span className={`h-2 w-2 rounded-full ${s.color}`} />
                    {s.label}
                  </span>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { name: "iPhone 15 Pro 256GB", imei: "3590...4821", status: "В наличии", listing: "📢" },
                  { name: "Samsung S24 128GB", imei: "3568...9012", status: "Резерв", listing: "✔" },
                  { name: "iPhone 14 128GB", imei: "3541...7634", status: "Продан", listing: "✔" },
                ].map((d) => (
                  <div key={d.imei} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">IMEI: {d.imei}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span title="Статус объявления">{d.listing}</span>
                      <span className="text-xs text-muted-foreground">{d.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-bold sm:text-4xl">Полный контроль склада устройств</h2>
            <ul className="mt-8 space-y-3">
              {inventoryFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Buyback ─── */}
      <section className="border-y bg-muted/30 py-20">
        <div className="container grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Удобная система скупки устройств</h2>
            <ul className="mt-8 space-y-3">
              {buybackFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <div className="rounded-xl border bg-card p-6 shadow-sm w-full max-w-sm">
              <p className="text-sm font-semibold mb-4">Скупка устройства</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Модель</span><span className="font-medium">iPhone 13 128GB</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Состояние</span><span className="font-medium">Хорошее</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Батарея</span><span className="font-medium">87%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Цена выкупа</span><span className="font-bold text-primary">32 000 ₽</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Analytics ─── */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center sm:text-4xl">Финансы и аналитика</h2>
          <p className="mt-4 text-center text-muted-foreground text-lg max-w-2xl mx-auto">
            Отслеживайте ключевые показатели бизнеса в реальном времени
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {analyticsMetrics.map((m) => (
              <div key={m.label} className="rounded-xl border bg-card p-6 text-center hover:shadow-md transition-shadow">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <m.icon className="h-6 w-6" />
                </div>
                <p className="text-2xl font-bold text-foreground">{m.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{m.label}</p>
              </div>
            ))}
          </div>
          {/* Chart mock */}
          <div className="mt-8 rounded-xl border bg-card p-6">
            <p className="text-sm font-semibold mb-4">Выручка за неделю</p>
            <div className="flex items-end gap-3" style={{ height: 128 }}>
              {[65, 45, 80, 55, 90, 70, 85].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-end h-full justify-end">
                  <div className="w-full rounded-t-md bg-primary" style={{ height: `${h}%`, minHeight: 4 }} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-1">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
                <span key={d} className="flex-1 text-center text-[10px] text-muted-foreground">{d}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── AI ─── */}
      <section className="border-y bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-20">
        <div className="container grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
              <Sparkles className="h-4 w-4" /> AI
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl">Умный помощник для владельца магазина</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              AI анализирует продажи, контролирует объявления и помогает управлять бизнесом.
            </p>
            <ul className="mt-8 space-y-3">
              {aiExamples.map((e) => (
                <li key={e} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                  {e}
                </li>
              ))}
            </ul>
          </div>
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
                  1. iPhone 13 — 127 500 ₽<br />
                  2. Samsung S23 — 89 200 ₽<br />
                  3. iPhone 14 — 76 800 ₽<br /><br />
                  💡 Рекомендую увеличить закупку iPhone 13.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Price Tags ─── */}
      <section className="py-20">
        <div className="container grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Автоматическое создание ценников</h2>
            <ul className="mt-8 space-y-3">
              {["Вертикальный и горизонтальный формат", "Редактор шаблонов", "Массовая печать"].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <div className="rounded-xl border bg-card p-6 shadow-sm w-60 text-center">
              <Printer className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-bold text-foreground">iPhone 15 Pro</p>
              <p className="text-xs text-muted-foreground">256GB / Black Titanium</p>
              <p className="text-2xl font-extrabold text-primary mt-2">89 990 ₽</p>
              <p className="text-[10px] text-muted-foreground mt-1">IMEI: 3590...4821</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="border-t bg-muted/30 py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center sm:text-4xl">Простые и прозрачные тарифы</h2>
          <p className="mt-4 text-center text-muted-foreground text-lg">Попробуйте бесплатно 3 дня</p>
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border bg-card p-8 transition-all ${
                  p.popular
                    ? "ring-2 ring-primary shadow-xl shadow-primary/10 scale-[1.02] z-10"
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
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold">{p.price}</span>
                  <span className="text-muted-foreground"> ₽/мес</span>
                  {p.trial && <p className="mt-2 text-xs font-medium text-green-600">{p.trial}</p>}
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {p.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-2.5 text-sm">
                      {f.ok ? (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={f.ok ? "" : "text-muted-foreground"}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full" size="lg" variant={p.popular ? "default" : "outline"} asChild>
                  <Link to="/register">{p.trial ? "Попробовать бесплатно" : "Выбрать"}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Support ─── */}
      <section id="support" className="py-20">
        <div className="container text-center max-w-2xl mx-auto">
          <Headphones className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold sm:text-4xl">Поддержка</h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Мы всегда на связи. Напишите в поддержку прямо из CRM или свяжитесь с нами через Telegram.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/register">Написать в поддержку</Link>
            </Button>
            <Button variant="outline">
              <Send className="mr-2 h-4 w-4" /> Telegram
            </Button>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="border-t py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl bg-primary p-10 lg:p-14 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold sm:text-4xl">Начните управлять вашим магазином уже сегодня</h2>
            <Button size="lg" variant="secondary" className="mt-8 text-base px-8" asChild>
              <Link to="/register">
                Создать аккаунт <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="mt-4 text-primary-foreground/70 text-sm">
              Уже есть аккаунт? <Link to="/login" className="underline text-primary-foreground">Войти</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t py-12">
        <div className="container flex flex-col items-center justify-between gap-6 sm:flex-row">
          <span className="font-bold text-foreground">PhoneCRM</span>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Возможности</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Тарифы</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Войти</Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 PhoneCRM</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
