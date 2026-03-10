import { useNavigate } from "react-router-dom";
import { Settings, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const TmaMorePage = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Ещё</h1>

      {user && (
        <div className="rounded-2xl border bg-card p-4">
          <p className="font-medium text-sm">{user.user_metadata?.full_name || user.email}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={() => navigate("/tma")}
          className="w-full flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all active:scale-[0.98]"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Главная</span>
        </button>
        <button
          onClick={() => navigate("/tma")}
          className="w-full flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all active:scale-[0.98]"
        >
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Помощь</span>
        </button>
      </div>

      <Button variant="outline" className="w-full h-12 rounded-xl text-destructive" onClick={handleLogout}>
        <LogOut className="h-5 w-5 mr-2" /> Выйти
      </Button>
    </div>
  );
};

export default TmaMorePage;
