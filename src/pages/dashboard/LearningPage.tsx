import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, ArrowLeft, BookOpen, Rocket, Smartphone, ShoppingCart,
  ArrowDownUp, TrendingUp, Banknote, UserCog, ClipboardList,
  FileBarChart, Settings, Shield, UserCheck,
} from "lucide-react";
import { KNOWLEDGE_BASE, KBCategory, KBArticle } from "@/data/knowledgeBase";

const ICON_MAP: Record<string, React.ElementType> = {
  Rocket, Smartphone, ShoppingCart, ArrowDownUp, TrendingUp,
  Banknote, UserCog, ClipboardList, FileBarChart, Settings,
  Shield, UserCheck,
};

const LearningPage = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<KBCategory | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: { category: KBCategory; article: KBArticle }[] = [];
    for (const cat of KNOWLEDGE_BASE) {
      for (const art of cat.articles) {
        if (
          art.title.toLowerCase().includes(q) ||
          art.description.toLowerCase().includes(q) ||
          art.tags.some((t) => t.includes(q))
        ) {
          results.push({ category: cat, article: art });
        }
      }
    }
    return results;
  }, [search]);

  const openArticle = (cat: KBCategory, art: KBArticle) => {
    setSelectedCategory(cat);
    setSelectedArticle(art);
    setSearch("");
  };

  const goBack = () => {
    if (selectedArticle) {
      setSelectedArticle(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  };

  // Article view
  if (selectedArticle && selectedCategory) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> {selectedCategory.title}
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{selectedArticle.title}</h1>
          <p className="text-muted-foreground mt-2">{selectedArticle.description}</p>
        </div>
        {selectedArticle.steps && selectedArticle.steps.length > 0 && (
          <Card className="p-6 card-shadow">
            <h3 className="font-semibold mb-4">Пошаговая инструкция</h3>
            <ol className="space-y-3">
              {selectedArticle.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
        <div className="flex flex-wrap gap-2">
          {selectedArticle.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </div>
    );
  }

  // Category view
  if (selectedCategory) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Все категории
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{selectedCategory.title}</h1>
          <p className="text-muted-foreground mt-1">{selectedCategory.description}</p>
        </div>
        <div className="space-y-3">
          {selectedCategory.articles.map((art) => (
            <Card
              key={art.id}
              className="p-4 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer"
              onClick={() => setSelectedArticle(art)}
            >
              <h3 className="font-semibold text-sm">{art.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{art.description}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Main view — categories + search
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Обучение</h1>
        <p className="text-muted-foreground mt-1">Центр обучения работе с FILTER CRM</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск по инструкциям..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Search results */}
      {searchResults && (
        <div className="space-y-3">
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Ничего не найдено. Попробуйте другой запрос.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Найдено: {searchResults.length} {searchResults.length === 1 ? "инструкция" : searchResults.length < 5 ? "инструкции" : "инструкций"}
              </p>
              {searchResults.map(({ category, article }) => (
                <Card
                  key={article.id}
                  className="p-4 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer"
                  onClick={() => openArticle(category, article)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{article.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{category.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{article.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* Categories grid */}
      {!searchResults && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KNOWLEDGE_BASE.map((cat) => {
            const Icon = ICON_MAP[cat.icon] || BookOpen;
            return (
              <Card
                key={cat.id}
                className="p-5 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer group"
                onClick={() => setSelectedCategory(cat)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{cat.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                    <p className="text-xs text-primary mt-2 font-medium">
                      {cat.articles.length} {cat.articles.length === 1 ? "статья" : cat.articles.length < 5 ? "статьи" : "статей"}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LearningPage;