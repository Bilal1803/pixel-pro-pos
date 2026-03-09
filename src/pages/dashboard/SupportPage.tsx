import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, FileText, ExternalLink } from "lucide-react";

const SupportPage = () => {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Поддержка</h1>

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
    </div>
  );
};

export default SupportPage;
