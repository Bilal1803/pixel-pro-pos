import { useNavigate } from "react-router-dom";
import { Home, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TmaMorePage = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Ещё</h1>

      {user && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="font-semibold text-sm text-gray-900">{user.user_metadata?.full_name || user.email}</p>
          <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <button
          onClick={() => navigate("/tma")}
          className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 text-left shadow-sm active:scale-[0.98] transition-transform"
        >
          <Home className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Главная</span>
        </button>
        <button
          onClick={() => navigate("/tma")}
          className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 text-left shadow-sm active:scale-[0.98] transition-transform"
        >
          <HelpCircle className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Помощь</span>
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-white rounded-xl border border-gray-200 p-4 text-red-500 font-medium text-sm active:scale-[0.98] transition-transform"
      >
        <LogOut className="h-5 w-5" /> Выйти
      </button>
    </div>
  );
};

export default TmaMorePage;
