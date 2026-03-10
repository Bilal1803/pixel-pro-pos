import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import AISurvey from "./AISurvey";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
const TOOLTIP_DISMISSED_KEY = "ai-tooltip-dismissed";

const AIAssistant = () => {
  const { subscription } = useSubscription();
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(() => !sessionStorage.getItem(TOOLTIP_DISMISSED_KEY));

  const { data: surveyData, isLoading: surveyLoading, refetch: refetchSurvey } = useQuery({
    queryKey: ["ai-survey", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("ai_survey_answers" as any)
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const hasSurvey = !!surveyData;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!subscription.ai_enabled) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Необходимо авторизоваться" }]);
        setIsLoading(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        setMessages((prev) => [...prev, { role: "assistant", content: err.error || "Ошибка сервиса" }]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {}
        }
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Ошибка подключения к AI" }]);
    }
    setIsLoading(false);
  };

  if (!open) {
    const dismissTooltip = () => {
      setShowTooltip(false);
      sessionStorage.setItem(TOOLTIP_DISMISSED_KEY, "1");
    };

    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
        {showTooltip && (
          <div
            className="mb-1 animate-in fade-in slide-in-from-right-2 duration-300 cursor-pointer"
            onClick={() => { dismissTooltip(); setOpen(true); }}
          >
            <div className="relative bg-card border shadow-lg rounded-2xl rounded-br-sm px-4 py-3 max-w-[200px]">
              <button
                onClick={(e) => { e.stopPropagation(); dismissTooltip(); }}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-muted border flex items-center justify-center text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
              <p className="text-sm font-medium text-foreground">👋 Я твой AI-помощник!</p>
              <p className="text-xs text-muted-foreground mt-0.5">Нажми на меня, чтобы начать</p>
            </div>
          </div>
        )}
        <button
          onClick={() => { dismissTooltip(); setOpen(true); }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      </div>
    );
  }

  // Show survey if not completed yet
  if (!surveyLoading && !hasSurvey) {
    return (
      <Card className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] flex flex-col shadow-2xl border">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <AISurvey onComplete={() => refetchSurvey()} />
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] flex flex-col shadow-2xl border">
      <div className="flex items-center justify-between border-b px-4 py-3 bg-primary/5 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">AI Ассистент</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground mt-8 space-y-2">
            <Sparkles className="h-8 w-8 mx-auto text-primary/40" />
            <p>Спросите о продажах, прибыли, рекомендациях по акциям или анализе клиентов</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Задайте вопрос..."
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button size="icon" onClick={send} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AIAssistant;
