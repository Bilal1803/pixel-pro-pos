import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FileText, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const DEFAULT_TEMPLATE = `📱 {модель} {память} {цвет}

Состояние: {состояние}
АКБ: {акб}
{информация_о_замене}

Магазин: {название_магазина}
{гарантия}`;

const ListingTemplateCard = ({ companyId }: { companyId: string | null }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ["listing-template", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from("listing_templates").select("*").eq("company_id", companyId).order("is_default", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const [text, setText] = useState("");

  useEffect(() => {
    setText(template?.template_text || DEFAULT_TEMPLATE);
  }, [template]);

  const saveTemplate = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Нет компании");
      if (template) {
        const { error } = await supabase.from("listing_templates").update({ template_text: text }).eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("listing_templates").insert({ company_id: companyId, template_text: text, is_default: true, name: "Основной" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing-template"] });
      toast({ title: "Шаблон сохранён" });
    },
    onError: (e: unknown) => toast({ title: "Ошибка", description: e instanceof Error ? e.message : "Неизвестная ошибка", variant: "destructive" }),
  });

  if (isLoading) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="card-shadow overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Шаблон объявления</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Текст объявления автоматически генерируется при добавлении устройства
                </p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <div className="p-6 pt-4 space-y-4">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[200px] font-mono text-sm" />
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Доступные переменные:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <span><code className="text-primary">{"{модель}"}</code> — название модели</span>
                <span><code className="text-primary">{"{память}"}</code> — объём памяти</span>
                <span><code className="text-primary">{"{цвет}"}</code> — цвет устройства</span>
                <span><code className="text-primary">{"{состояние}"}</code> — грейд состояния</span>
                <span><code className="text-primary">{"{акб}"}</code> — здоровье батареи</span>
                <span><code className="text-primary">{"{информация_о_замене}"}</code> — о заменах</span>
                <span><code className="text-primary">{"{название_магазина}"}</code> — компания</span>
                <span><code className="text-primary">{"{гарантия}"}</code> — условия гарантии</span>
              </div>
            </div>
            <Button onClick={() => saveTemplate.mutate()} disabled={saveTemplate.isPending}>
              {saveTemplate.isPending ? "Сохранение..." : "Сохранить шаблон"}
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default ListingTemplateCard;
