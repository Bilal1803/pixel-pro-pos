export type CatalogModel = {
  name: string;
  memories: string[];
  colors: string[];
};

export const IPHONE_CATALOG: CatalogModel[] = [
  { name: "iPhone X", memories: ["64GB", "256GB"], colors: ["Серебристый", "Серый космос"] },
  { name: "iPhone XR", memories: ["64GB", "128GB", "256GB"], colors: ["Белый", "Чёрный", "Синий", "Жёлтый", "Коралловый", "Красный"] },
  { name: "iPhone XS", memories: ["64GB", "256GB", "512GB"], colors: ["Серебристый", "Серый космос", "Золотой"] },
  { name: "iPhone XS Max", memories: ["64GB", "256GB", "512GB"], colors: ["Серебристый", "Серый космос", "Золотой"] },
  { name: "iPhone 11", memories: ["64GB", "128GB", "256GB"], colors: ["Белый", "Чёрный", "Зелёный", "Жёлтый", "Фиолетовый", "Красный"] },
  { name: "iPhone 11 Pro", memories: ["64GB", "256GB", "512GB"], colors: ["Серебристый", "Серый космос", "Золотой", "Тёмно-зелёный"] },
  { name: "iPhone 11 Pro Max", memories: ["64GB", "256GB", "512GB"], colors: ["Серебристый", "Серый космос", "Золотой", "Тёмно-зелёный"] },
  { name: "iPhone SE (2020)", memories: ["64GB", "128GB", "256GB"], colors: ["Белый", "Чёрный", "Красный"] },
  { name: "iPhone 12 mini", memories: ["64GB", "128GB", "256GB"], colors: ["Белый", "Чёрный", "Синий", "Зелёный", "Красный", "Фиолетовый"] },
  { name: "iPhone 12", memories: ["64GB", "128GB", "256GB"], colors: ["Белый", "Чёрный", "Синий", "Зелёный", "Красный", "Фиолетовый"] },
  { name: "iPhone 12 Pro", memories: ["128GB", "256GB", "512GB"], colors: ["Серебристый", "Графитовый", "Золотой", "Тихоокеанский синий"] },
  { name: "iPhone 12 Pro Max", memories: ["128GB", "256GB", "512GB"], colors: ["Серебристый", "Графитовый", "Золотой", "Тихоокеанский синий"] },
  { name: "iPhone 13 mini", memories: ["128GB", "256GB", "512GB"], colors: ["Сияющая звезда", "Тёмная ночь", "Синий", "Розовый", "Зелёный", "Красный"] },
  { name: "iPhone 13", memories: ["128GB", "256GB", "512GB"], colors: ["Сияющая звезда", "Тёмная ночь", "Синий", "Розовый", "Зелёный", "Красный"] },
  { name: "iPhone 13 Pro", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Серебристый", "Графитовый", "Золотой", "Небесно-голубой", "Альпийский зелёный"] },
  { name: "iPhone 13 Pro Max", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Серебристый", "Графитовый", "Золотой", "Небесно-голубой", "Альпийский зелёный"] },
  { name: "iPhone SE (2022)", memories: ["64GB", "128GB", "256GB"], colors: ["Сияющая звезда", "Тёмная ночь", "Красный"] },
  { name: "iPhone 14", memories: ["128GB", "256GB", "512GB"], colors: ["Сияющая звезда", "Тёмная ночь", "Синий", "Фиолетовый", "Красный", "Жёлтый"] },
  { name: "iPhone 14 Plus", memories: ["128GB", "256GB", "512GB"], colors: ["Сияющая звезда", "Тёмная ночь", "Синий", "Фиолетовый", "Красный", "Жёлтый"] },
  { name: "iPhone 14 Pro", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Серебристый", "Космический чёрный", "Золотой", "Глубокий фиолетовый"] },
  { name: "iPhone 14 Pro Max", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Серебристый", "Космический чёрный", "Золотой", "Глубокий фиолетовый"] },
  { name: "iPhone 15", memories: ["128GB", "256GB", "512GB"], colors: ["Чёрный", "Синий", "Зелёный", "Жёлтый", "Розовый"] },
  { name: "iPhone 15 Plus", memories: ["128GB", "256GB", "512GB"], colors: ["Чёрный", "Синий", "Зелёный", "Жёлтый", "Розовый"] },
  { name: "iPhone 15 Pro", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Титановый натуральный", "Титановый синий", "Титановый белый", "Титановый чёрный"] },
  { name: "iPhone 15 Pro Max", memories: ["256GB", "512GB", "1TB"], colors: ["Титановый натуральный", "Титановый синий", "Титановый белый", "Титановый чёрный"] },
  { name: "iPhone 16", memories: ["128GB", "256GB", "512GB"], colors: ["Чёрный", "Белый", "Розовый", "Бирюзовый", "Ультрамарин"] },
  { name: "iPhone 16 Plus", memories: ["128GB", "256GB", "512GB"], colors: ["Чёрный", "Белый", "Розовый", "Бирюзовый", "Ультрамарин"] },
  { name: "iPhone 16 Pro", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Титановый натуральный", "Титановый белый", "Титановый чёрный", "Титановый песочный"] },
  { name: "iPhone 16 Pro Max", memories: ["256GB", "512GB", "1TB"], colors: ["Титановый натуральный", "Титановый белый", "Титановый чёрный", "Титановый песочный"] },
  { name: "iPhone 16e", memories: ["128GB", "256GB", "512GB"], colors: ["Чёрный", "Белый"] },
  { name: "iPhone 17", memories: ["128GB", "256GB", "512GB"], colors: ["Чёрный", "Белый", "Зелёный", "Розовый"] },
  { name: "iPhone 17 Air", memories: ["256GB", "512GB"], colors: ["Чёрный", "Белый"] },
  { name: "iPhone 17 Pro", memories: ["256GB", "512GB", "1TB"], colors: ["Титановый натуральный", "Титановый белый", "Титановый чёрный", "Титановый зелёный"] },
  { name: "iPhone 17 Pro Max", memories: ["256GB", "512GB", "1TB"], colors: ["Титановый натуральный", "Титановый белый", "Титановый чёрный", "Титановый зелёный"] },
];

export const PRESET_BRANDS = ["Apple", "Samsung", "Xiaomi", "Google", "Sony PS", "Dyson"];

export const ALL_CATALOG_MODELS = IPHONE_CATALOG.map(m => m.name);

export const ALL_CATALOG_MEMORIES = [...new Set(IPHONE_CATALOG.flatMap(m => m.memories))].sort((a, b) => {
  const parseSize = (s: string) => s.includes("TB") ? parseFloat(s) * 1024 : parseFloat(s);
  return parseSize(a) - parseSize(b);
});

export const ALL_CATALOG_COLORS = [...new Set(IPHONE_CATALOG.flatMap(m => m.colors))].sort();

export function getModelData(modelName: string): CatalogModel | undefined {
  return IPHONE_CATALOG.find(m => m.name === modelName);
}
