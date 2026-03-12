import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, FileText, Bot, Send, Loader2, Sparkles, Plus, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

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
  const { user, companyId } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations list
  const { data: conversations = [] } = useQuery({
    queryKey: ["ai-support-conversations", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("ai_support_conversations")
        .select("id, title, created_at, updated_at")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      const { data } = await supabase
        .from("ai_support_messages")
        .select("role, content")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Msg[]);
    };
    loadMessages();
  }, [activeConversationId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveMessage = useCallback(async (conversationId: string, role: string, content: string) => {
    await supabase.from("ai_support_messages").insert({
      conversation_id: conversationId,
      role,
      content,
    });
  }, []);

  const createConversation = useCallback(async (title: string): Promise<string | null> => {
    if (!user || !companyId) return null;
    const { data, error } = await supabase
      .from("ai_support_conversations")
      .insert({ user_id: user.id, company_id: companyId, title })
      .select("id")
      .single();
    if (error || !data) return null;
    queryClient.invalidateQueries({ queryKey: ["ai-support-conversations"] });
    return data.id;
  }, [user, companyId, queryClient]);

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const deleteConversation = async (id: string) => {
    await supabase.from("ai_support_conversations").delete().eq("id", id);
    if (activeConversationId === id) startNewChat();
    queryClient.invalidateQueries({ queryKey: ["ai-support-conversations"] });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    // Create or reuse conversation
    let convId = activeConversationId;
    if (!convId) {
      const title = text.trim().slice(0, 60);
      convId = await createConversation(title);
      if (!convId) {
        toast.error("Не удалось создать чат");
        setIsLoading(false);
        return;
      }
      setActiveConversationId(convId);
    }

    // Save user message
    await saveMessage(convId, "user", text.trim());

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

      // Save assistant response
      if (assistantSoFar && convId) {
        await saveMessage(convId, "assistant", assistantSoFar);
        // Update conversation timestamp
        await supabase.from("ai_support_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
        queryClient.invalidateQueries({ queryKey: ["ai-support-conversations"] });
      }
    } catch (e) {
      console.error(e);
      toast.error("Ошибка подключения к AI");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
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
          <div className="flex gap-4" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
            {/* Sidebar with conversations */}
            <Card className="card-shadow w-64 shrink-0 flex-col hidden md:flex">
              <div className="p-3 border-b">
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={startNewChat}>
                  <Plus className="h-4 w-4" />
                  Новый чат
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                        activeConversationId === conv.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setActiveConversationId(conv.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{conv.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(conv.updated_at), "dd.MM.yy HH:mm")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {conversations.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Нет чатов</p>
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Chat area */}
            <Card className="card-shadow flex-1 flex flex-col min-w-0">
              {/* Mobile conversation selector */}
              <div className="md:hidden border-b p-2 flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={startNewChat}>
                  <Plus className="h-4 w-4" />
                  Новый
                </Button>
                {conversations.length > 0 && (
                  <div className="flex-1 overflow-x-auto">
                    <div className="flex gap-1">
                      {conversations.slice(0, 5).map((conv) => (
                        <Button
                          key={conv.id}
                          variant={activeConversationId === conv.id ? "default" : "ghost"}
                          size="sm"
                          className="text-xs shrink-0 max-w-[120px]"
                          onClick={() => setActiveConversationId(conv.id)}
                        >
                          <span className="truncate">{conv.title}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
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
          </div>
        </TabsContent>

        <TabsContent value="ticket" className="mt-4 space-y-4">
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
            <Card
              className="p-5 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer"
              onClick={() => window.open("https://t.me/pzlllv", "_blank")}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Написать в Telegram</h3>
                  <p className="text-sm text-muted-foreground">Быстрая помощь — @pzlllv</p>
                </div>
              </div>
            </Card>
          </div>

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
