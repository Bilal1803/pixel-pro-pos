import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, FileText, Bot, Send, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTED_QUESTIONS = [
  "Как добавить устройство на склад?",
  "Как оформить продажу?",
  "Как добавить сотрудника?",
  "Чем отличаются тарифы?",
  "Как настроить Telegram-уведомления?",
  "Как переместить товар между магазинами?",
];

const SupportPage = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-support`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Ошибка сервера" }));
        toast.error(err.error || "Не удалось получить ответ");
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Ошибка подключения к AI");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Поддержка</h1>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="ai" className="gap-2">
            <Bot className="h-4 w-4" />
            AI помощник
          </TabsTrigger>
          <TabsTrigger value="ticket" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Написать в поддержку
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-4">
          <Card className="card-shadow flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">AI помощник</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Задайте вопрос о работе системы — я помогу разобраться
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <Button
                        key={q}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-2 px-3 whitespace-normal text-left"
                        onClick={() => sendMessage(q)}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Спросите что-нибудь о системе..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ticket" className="mt-4 space-y-4">
          {/* Quick links */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">База знаний</h3>
                  <p className="text-sm text-muted-foreground">Ответы на частые вопросы</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Telegram-чат</h3>
                  <p className="text-sm text-muted-foreground">Быстрая помощь в Telegram</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Contact form */}
          <Card className="p-6 card-shadow">
            <h2 className="text-lg font-semibold">Написать в поддержку</h2>
            <p className="text-sm text-muted-foreground mt-1">Мы ответим в течение 24 часов</p>
            <form className="mt-4 space-y-4">
              <div>
                <Label htmlFor="subject">Тема</Label>
                <Input id="subject" placeholder="Кратко опишите проблему" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="message">Сообщение</Label>
                <Textarea id="message" placeholder="Подробное описание..." rows={5} className="mt-1" />
              </div>
              <Button type="submit">Отправить</Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupportPage;
