export type CatalogModel = {
  name: string;
  memories: string[];
  colors: string[];
};

export const IPHONE_CATALOG: CatalogModel[] = [
  { name: "iPhone X", memories: ["64GB", "256GB"], colors: ["Silver", "Space Gray"] },
  { name: "iPhone XR", memories: ["64GB", "128GB", "256GB"], colors: ["White", "Black", "Blue", "Yellow", "Coral", "Red"] },
  { name: "iPhone XS", memories: ["64GB", "256GB", "512GB"], colors: ["Silver", "Space Gray", "Gold"] },
  { name: "iPhone XS Max", memories: ["64GB", "256GB", "512GB"], colors: ["Silver", "Space Gray", "Gold"] },
  { name: "iPhone 11", memories: ["64GB", "128GB", "256GB"], colors: ["White", "Black", "Green", "Yellow", "Purple", "Red"] },
  { name: "iPhone 11 Pro", memories: ["64GB", "256GB", "512GB"], colors: ["Silver", "Space Gray", "Gold", "Midnight Green"] },
  { name: "iPhone 11 Pro Max", memories: ["64GB", "256GB", "512GB"], colors: ["Silver", "Space Gray", "Gold", "Midnight Green"] },
  { name: "iPhone SE (2020)", memories: ["64GB", "128GB", "256GB"], colors: ["White", "Black", "Red"] },
  { name: "iPhone 12 mini", memories: ["64GB", "128GB", "256GB"], colors: ["White", "Black", "Blue", "Green", "Red", "Purple"] },
  { name: "iPhone 12", memories: ["64GB", "128GB", "256GB"], colors: ["White", "Black", "Blue", "Green", "Red", "Purple"] },
  { name: "iPhone 12 Pro", memories: ["128GB", "256GB", "512GB"], colors: ["Silver", "Graphite", "Gold", "Pacific Blue"] },
  { name: "iPhone 12 Pro Max", memories: ["128GB", "256GB", "512GB"], colors: ["Silver", "Graphite", "Gold", "Pacific Blue"] },
  { name: "iPhone 13 mini", memories: ["128GB", "256GB", "512GB"], colors: ["Starlight", "Midnight", "Blue", "Pink", "Green", "Red"] },
  { name: "iPhone 13", memories: ["128GB", "256GB", "512GB"], colors: ["Starlight", "Midnight", "Blue", "Pink", "Green", "Red"] },
  { name: "iPhone 13 Pro", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Silver", "Graphite", "Gold", "Sierra Blue", "Alpine Green"] },
  { name: "iPhone 13 Pro Max", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Silver", "Graphite", "Gold", "Sierra Blue", "Alpine Green"] },
  { name: "iPhone SE (2022)", memories: ["64GB", "128GB", "256GB"], colors: ["Starlight", "Midnight", "Red"] },
  { name: "iPhone 14", memories: ["128GB", "256GB", "512GB"], colors: ["Starlight", "Midnight", "Blue", "Purple", "Red", "Yellow"] },
  { name: "iPhone 14 Plus", memories: ["128GB", "256GB", "512GB"], colors: ["Starlight", "Midnight", "Blue", "Purple", "Red", "Yellow"] },
  { name: "iPhone 14 Pro", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Silver", "Space Black", "Gold", "Deep Purple"] },
  { name: "iPhone 14 Pro Max", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Silver", "Space Black", "Gold", "Deep Purple"] },
  { name: "iPhone 15", memories: ["128GB", "256GB", "512GB"], colors: ["Black", "Blue", "Green", "Yellow", "Pink"] },
  { name: "iPhone 15 Plus", memories: ["128GB", "256GB", "512GB"], colors: ["Black", "Blue", "Green", "Yellow", "Pink"] },
  { name: "iPhone 15 Pro", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Natural Titanium", "Blue Titanium", "White Titanium", "Black Titanium"] },
  { name: "iPhone 15 Pro Max", memories: ["256GB", "512GB", "1TB"], colors: ["Natural Titanium", "Blue Titanium", "White Titanium", "Black Titanium"] },
  { name: "iPhone 16", memories: ["128GB", "256GB", "512GB"], colors: ["Black", "White", "Pink", "Teal", "Ultramarine"] },
  { name: "iPhone 16 Plus", memories: ["128GB", "256GB", "512GB"], colors: ["Black", "White", "Pink", "Teal", "Ultramarine"] },
  { name: "iPhone 16 Pro", memories: ["128GB", "256GB", "512GB", "1TB"], colors: ["Natural Titanium", "White Titanium", "Black Titanium", "Desert Titanium"] },
  { name: "iPhone 16 Pro Max", memories: ["256GB", "512GB", "1TB"], colors: ["Natural Titanium", "White Titanium", "Black Titanium", "Desert Titanium"] },
  { name: "iPhone 16e", memories: ["128GB", "256GB", "512GB"], colors: ["Black", "White"] },
  { name: "iPhone 17", memories: ["128GB", "256GB", "512GB"], colors: ["Black", "White", "Green", "Pink"] },
  { name: "iPhone 17 Air", memories: ["256GB", "512GB"], colors: ["Black", "White"] },
  { name: "iPhone 17 Pro", memories: ["256GB", "512GB", "1TB"], colors: ["Natural Titanium", "White Titanium", "Black Titanium", "Green Titanium"] },
  { name: "iPhone 17 Pro Max", memories: ["256GB", "512GB", "1TB"], colors: ["Natural Titanium", "White Titanium", "Black Titanium", "Green Titanium"] },
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
