import { useState, useCallback } from "react";
import { HeadphonesIcon, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TmaSupportPage = () => {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!subject.trim() || !message.trim() || !user || !companyId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        subject: subject.trim(),
        message: message.trim(),
        user_id: user.id,
        company_id: companyId,
      });
      if (error) throw error;
      toast({ title: "Отправлено", description: "Мы ответим вам в ближайшее время." });
      setSubject("");
      setMessage("");
    } catch {
      toast({ title: "Ошибка", description: "Не удалось отправить обращение", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [subject, message, user, companyId, toast]);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-900">Поддержка</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <HeadphonesIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Напишите нам</p>
            <p className="text-xs text-gray-500">Мы ответим в течение 24 часов</p>
          </div>
        </div>

        <Input
          placeholder="Тема обращения"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-11 rounded-xl border-gray-200 text-sm"
          disabled={loading}
        />

        <Textarea
          placeholder="Опишите вашу проблему..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[120px] rounded-xl border-gray-200 text-sm resize-none"
          disabled={loading}
        />

        <Button
          onClick={handleSubmit}
          disabled={!subject.trim() || !message.trim() || loading}
          className="w-full h-11 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Отправить
        </Button>
      </div>
    </div>
  );
};

export default TmaSupportPage;
