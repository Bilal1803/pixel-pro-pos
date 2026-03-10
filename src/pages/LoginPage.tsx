import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "Ошибка входа", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 card-shadow">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">PhoneCRM</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Вход в систему</h1>
          <p className="mt-1 text-sm text-muted-foreground">Введите данные для входа</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary hover:underline">
            Забыли пароль?
          </Link>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
