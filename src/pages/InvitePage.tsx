import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const InvitePage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setErrorMsg("Неверная ссылка приглашения");
      return;
    }

    const acceptInvite = async () => {
      try {
        // Get Telegram WebApp data if available
        const tg = (window as any).Telegram?.WebApp;
        const telegramId = tg?.initDataUnsafe?.user?.id || null;

        const { data, error } = await supabase.functions.invoke("accept-invite", {
          body: { code, telegramId },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        if (data.session) {
          // Set the session in the client
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

        setStatus("success");

        // Redirect to TMA after 2 seconds
        setTimeout(() => {
          navigate("/tma");
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Произошла ошибка");
      }
    };

    acceptInvite();
  }, [code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h1 className="text-xl font-bold">Подключение к системе...</h1>
            <p className="text-muted-foreground">Подождите, создаём ваш аккаунт</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold">Добро пожаловать!</h1>
            <p className="text-muted-foreground">
              Аккаунт успешно создан. Переход в приложение...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold">Ошибка</h1>
            <p className="text-muted-foreground">{errorMsg}</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              На главную
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
