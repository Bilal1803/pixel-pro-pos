import { useNavigate } from "react-router-dom";
import { Home, Smartphone, ShoppingCart, Banknote, Clock, HeadphonesIcon, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { to: "/tma", label: "Главная", icon: Home },
  { to: "/tma/inventory", label: "Склад", icon: Smartphone },
  { to: "/tma/sales", label: "Продажи", icon: ShoppingCart },
  { to: "/tma/cash", label: "Касса", icon: Banknote },
  { to: "/tma/shift", label: "Смена", icon: Clock },
];

const TmaMorePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
        {menuItems.map((item) => (
          <button
            key={item.to + item.label}
            onClick={() => navigate(item.to)}
            className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 text-left shadow-sm active:scale-[0.98] transition-transform"
          >
            <item.icon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate("/tma/support")}
        className="w-full flex items-center justify-center gap-2 bg-blue-50 rounded-xl border border-blue-100 p-4 text-blue-600 font-medium text-sm active:scale-[0.98] transition-transform"
      >
        <HeadphonesIcon className="h-5 w-5" /> Поддержка
      </button>
    </div>
  );
};

export default TmaMorePage;
