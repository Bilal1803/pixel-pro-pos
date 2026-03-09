import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const SettingsPage = () => {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Настройки</h1>

      {/* Company */}
      <Card className="p-6 card-shadow">
        <h2 className="text-lg font-semibold">Компания</h2>
        <p className="text-sm text-muted-foreground mt-1">Основная информация о компании</p>
        <Separator className="my-4" />
        <div className="space-y-4">
          <div>
            <Label htmlFor="companyName">Название компании</Label>
            <Input id="companyName" defaultValue="Мой магазин" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="phone">Телефон</Label>
            <Input id="phone" defaultValue="+7 (999) 123-45-67" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="address">Адрес</Label>
            <Input id="address" defaultValue="г. Москва, ул. Примерная, д. 1" className="mt-1" />
          </div>
          <Button>Сохранить</Button>
        </div>
      </Card>

      {/* Store */}
      <Card className="p-6 card-shadow">
        <h2 className="text-lg font-semibold">Магазин</h2>
        <p className="text-sm text-muted-foreground mt-1">Настройки текущего магазина</p>
        <Separator className="my-4" />
        <div className="space-y-4">
          <div>
            <Label htmlFor="storeName">Название магазина</Label>
            <Input id="storeName" defaultValue="Магазин на Арбате" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="storeAddress">Адрес магазина</Label>
            <Input id="storeAddress" defaultValue="г. Москва, ул. Арбат, д. 10" className="mt-1" />
          </div>
          <Button>Сохранить</Button>
        </div>
      </Card>

      {/* Subscription */}
      <Card className="p-6 card-shadow">
        <h2 className="text-lg font-semibold">Подписка</h2>
        <p className="text-sm text-muted-foreground mt-1">Текущий тарифный план</p>
        <Separator className="my-4" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Тариф: <span className="text-primary">Магазин</span></p>
            <p className="text-sm text-muted-foreground">1 990 ₽/мес · Продлена до 09.04.2026</p>
          </div>
          <Button variant="outline">Изменить тариф</Button>
        </div>
      </Card>

      {/* Danger */}
      <Card className="p-6 border-destructive/30 card-shadow">
        <h2 className="text-lg font-semibold text-destructive">Опасная зона</h2>
        <p className="text-sm text-muted-foreground mt-1">Необратимые действия</p>
        <Separator className="my-4" />
        <Button variant="destructive">Удалить аккаунт</Button>
      </Card>
    </div>
  );
};

export default SettingsPage;
