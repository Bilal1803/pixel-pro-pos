import { Store, ChevronDown } from "lucide-react";
import { useStoreContext } from "@/contexts/StoreContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const StoreSelector = () => {
  const { stores, activeStoreId, setActiveStoreId, activeStore } = useStoreContext();

  if (stores.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[200px]">
          <Store className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {activeStore ? activeStore.name : "Все магазины"}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => setActiveStoreId(null)}
          className={!activeStoreId ? "bg-primary/10 text-primary" : ""}
        >
          <Store className="h-4 w-4 mr-2" />
          Все магазины
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {stores.length}
          </Badge>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => setActiveStoreId(store.id)}
            className={activeStoreId === store.id ? "bg-primary/10 text-primary" : ""}
          >
            {store.name}
            {store.address && (
              <span className="ml-auto text-xs text-muted-foreground truncate max-w-[100px]">
                {store.address}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StoreSelector;
