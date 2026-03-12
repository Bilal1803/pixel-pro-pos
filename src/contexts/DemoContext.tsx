import { createContext, useContext, ReactNode } from "react";

export interface DemoDevice {
  id: string;
  model: string;
  brand: string;
  memory: string;
  color: string;
  imei: string;
  status: string;
  purchase_price: number;
  sale_price: number;
  battery_health: string;
  listing_status: string;
  listing_url: string | null;
  created_at: string;
}

export interface DemoSale {
  id: string;
  device: string;
  total: number;
  payment_method: string;
  client: string | null;
  created_at: string;
  profit: number;
}

export interface DemoTask {
  id: string;
  title: string;
  status: string;
  category: string;
  created_at: string;
  due_date: string | null;
}

export interface DemoCashOp {
  id: string;
  type: string;
  amount: number;
  reason: string;
  created_at: string;
}

export interface DemoExpense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface DemoContextType {
  isDemo: true;
  devices: DemoDevice[];
  sales: DemoSale[];
  tasks: DemoTask[];
  cashOps: DemoCashOp[];
  expenses: DemoExpense[];
  stats: {
    todayRevenue: number;
    todayProfit: number;
    inStock: number;
    totalSales: number;
    avgCheck: number;
    currentCash: number;
  };
}

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const devices: DemoDevice[] = [
  { id: "d1", model: "iPhone 15 Pro Max", brand: "Apple", memory: "256GB", color: "Titanium Black", imei: "359012345678901", status: "available", purchase_price: 85000, sale_price: 109990, battery_health: "100%", listing_status: "listed", listing_url: "https://avito.ru/example1", created_at: `${yesterday}T10:00:00Z` },
  { id: "d2", model: "iPhone 14", brand: "Apple", memory: "128GB", color: "Blue", imei: "359012345678902", status: "available", purchase_price: 42000, sale_price: 54990, battery_health: "92%", listing_status: "not_listed", listing_url: null, created_at: `${yesterday}T11:00:00Z` },
  { id: "d3", model: "iPhone 13", brand: "Apple", memory: "128GB", color: "Midnight", imei: "359012345678903", status: "available", purchase_price: 30000, sale_price: 39990, battery_health: "87%", listing_status: "needs_relist", listing_url: "https://avito.ru/example3", created_at: `${yesterday}T12:00:00Z` },
  { id: "d4", model: "Samsung Galaxy S24 Ultra", brand: "Samsung", memory: "512GB", color: "Titanium Gray", imei: "359012345678904", status: "reserved", purchase_price: 92000, sale_price: 119990, battery_health: "100%", listing_status: "listed", listing_url: "https://avito.ru/example4", created_at: `${yesterday}T13:00:00Z` },
  { id: "d5", model: "Samsung Galaxy S23", brand: "Samsung", memory: "256GB", color: "Phantom Black", imei: "359012345678905", status: "sold", purchase_price: 48000, sale_price: 62990, battery_health: "95%", listing_status: "listed", listing_url: null, created_at: `${yesterday}T14:00:00Z` },
  { id: "d6", model: "iPhone 15", brand: "Apple", memory: "128GB", color: "Pink", imei: "359012345678906", status: "available", purchase_price: 55000, sale_price: 69990, battery_health: "100%", listing_status: "not_listed", listing_url: null, created_at: `${today}T09:00:00Z` },
  { id: "d7", model: "iPhone 12", brand: "Apple", memory: "64GB", color: "White", imei: "359012345678907", status: "testing", purchase_price: 22000, sale_price: 29990, battery_health: "82%", listing_status: "not_listed", listing_url: null, created_at: `${today}T10:00:00Z` },
  { id: "d8", model: "Xiaomi 14 Ultra", brand: "Xiaomi", memory: "512GB", color: "Black", imei: "359012345678908", status: "available", purchase_price: 60000, sale_price: 79990, battery_health: "100%", listing_status: "listed", listing_url: "https://avito.ru/example8", created_at: `${today}T11:00:00Z` },
  { id: "d9", model: "Google Pixel 8 Pro", brand: "Google", memory: "256GB", color: "Obsidian", imei: "359012345678909", status: "available", purchase_price: 45000, sale_price: 59990, battery_health: "100%", listing_status: "not_listed", listing_url: null, created_at: `${today}T08:00:00Z` },
  { id: "d10", model: "iPhone 14 Pro", brand: "Apple", memory: "256GB", color: "Deep Purple", imei: "359012345678910", status: "sold", purchase_price: 58000, sale_price: 74990, battery_health: "90%", listing_status: "listed", listing_url: null, created_at: `${yesterday}T09:00:00Z` },
];

const sales: DemoSale[] = [
  { id: "s1", device: "Samsung Galaxy S23 256GB", total: 62990, payment_method: "card", client: "Алексей М.", created_at: `${today}T12:30:00Z`, profit: 14990 },
  { id: "s2", device: "iPhone 14 Pro 256GB", total: 74990, payment_method: "cash", client: null, created_at: `${today}T11:15:00Z`, profit: 16990 },
  { id: "s3", device: "iPhone 13 128GB", total: 38990, payment_method: "transfer", client: "Мария К.", created_at: `${today}T10:00:00Z`, profit: 8990 },
  { id: "s4", device: "Samsung Galaxy A54", total: 24990, payment_method: "card", client: null, created_at: `${yesterday}T16:00:00Z`, profit: 7490 },
  { id: "s5", device: "iPhone 12 64GB", total: 28990, payment_method: "cash", client: "Иван Д.", created_at: `${yesterday}T14:30:00Z`, profit: 6990 },
  { id: "s6", device: "Xiaomi 13T", total: 32990, payment_method: "installments", client: null, created_at: `${yesterday}T12:00:00Z`, profit: 9490 },
];

const tasks: DemoTask[] = [
  { id: "t1", title: "Опубликовать iPhone 14 128GB на Авито", status: "new", category: "listing", created_at: `${today}T08:00:00Z`, due_date: today },
  { id: "t2", title: "Опубликовать iPhone 15 128GB на Авито", status: "new", category: "listing", created_at: `${today}T08:00:00Z`, due_date: today },
  { id: "t3", title: "Перевыложить iPhone 13 128GB", status: "new", category: "listing", created_at: `${today}T08:00:00Z`, due_date: today },
  { id: "t4", title: "Распечатать ценники для новых устройств", status: "in_progress", category: "general", created_at: `${today}T09:00:00Z`, due_date: today },
  { id: "t5", title: "Сделать переоценку Samsung S23", status: "done", category: "general", created_at: `${yesterday}T10:00:00Z`, due_date: yesterday },
  { id: "t6", title: "Проверить состояние iPhone 12", status: "in_progress", category: "general", created_at: `${today}T10:00:00Z`, due_date: today },
  { id: "t7", title: "Опубликовать Google Pixel 8 Pro на Авито", status: "new", category: "listing", created_at: `${today}T08:00:00Z`, due_date: today },
];

const cashOps: DemoCashOp[] = [
  { id: "c1", type: "sale", amount: 74990, reason: "Продажа iPhone 14 Pro", created_at: `${today}T11:15:00Z` },
  { id: "c2", type: "expense", amount: -2500, reason: "Канцелярия", created_at: `${today}T10:30:00Z` },
  { id: "c3", type: "sale", amount: 38990, reason: "Продажа iPhone 13", created_at: `${today}T10:00:00Z` },
  { id: "c4", type: "deposit", amount: 50000, reason: "Внесение", created_at: `${today}T09:00:00Z` },
];

const expenses: DemoExpense[] = [
  { id: "e1", category: "Аренда", amount: 85000, description: "Аренда помещения", date: today },
  { id: "e2", category: "ЗП", amount: 120000, description: "Зарплата сотрудникам", date: today },
  { id: "e3", category: "Реклама", amount: 25000, description: "Авито продвижение", date: today },
  { id: "e4", category: "Расходники", amount: 8500, description: "Плёнки, чехлы, коробки", date: yesterday },
  { id: "e5", category: "Прочее", amount: 4200, description: "Канцелярия, уборка", date: yesterday },
];

const todaySales = sales.filter((s) => s.created_at.startsWith(today));

const demoData: DemoContextType = {
  isDemo: true,
  devices,
  sales,
  tasks,
  cashOps,
  expenses,
  stats: {
    todayRevenue: todaySales.reduce((s, v) => s + v.total, 0),
    todayProfit: todaySales.reduce((s, v) => s + v.profit, 0),
    inStock: devices.filter((d) => d.status === "available").length,
    totalSales: sales.length,
    avgCheck: Math.round(todaySales.reduce((s, v) => s + v.total, 0) / (todaySales.length || 1)),
    currentCash: 161480,
  },
};

const DemoContext = createContext<DemoContextType>(demoData);

export const DemoProvider = ({ children }: { children: ReactNode }) => (
  <DemoContext.Provider value={demoData}>{children}</DemoContext.Provider>
);

export const useDemo = () => useContext(DemoContext);
