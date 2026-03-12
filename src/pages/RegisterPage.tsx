import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password, companyName, fullName);
    setLoading(false);
    if (error) {
      toast({ title: "Ошибка регистрации", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Добро пожаловать!", description: "Аккаунт успешно создан" });
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 card-shadow">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/pwa-icon-512.png" alt="FILTER CRM" className="h-10 w-10 rounded-lg" />
            <span className="text-xl font-bold">FILTER CRM</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Регистрация</h1>
          <p className="mt-1 text-sm text-muted-foreground">Создайте аккаунт компании</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="company">Название компании</Label>
            <Input id="company" placeholder="Мой магазин" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="fullName">Ваше имя</Label>
            <Input id="fullName" placeholder="Иван Иванов" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" placeholder="Минимум 6 символов" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Нажимая «Создать аккаунт», вы соглашаетесь с{" "}
            <Link to="/terms" className="text-primary hover:underline">политикой использования</Link>
            {" "}и{" "}
            <Link to="/privacy" className="text-primary hover:underline">политикой обработки персональных данных</Link>.
          </p>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Создание..." : "Создать аккаунт"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Войти</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
