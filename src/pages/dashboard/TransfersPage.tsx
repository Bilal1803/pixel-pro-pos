import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useStoreContext } from "@/contexts/StoreContext";

const TransfersPage = () => {
  const { companyId, user } = useAuth();
  const { stores } = useStoreContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [targetStore, setTargetStore] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const { data: devices = [] } = useQuery({
    queryKey: ["transfer-devices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("devices")
        .select("id, model, memory, color, imei, store_id, status")
        .eq("company_id", companyId)
        .in("status", ["available", "testing", "reserved"]);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["device-transfers", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("device_transfers")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!companyId,
  });

  const transferDevice = useMutation({
    mutationFn: async () => {
      if (!companyId || !user?.id || !selectedDevice || !targetStore) throw new Error("Заполните все поля");

      const device = devices.find((d) => d.id === selectedDevice);
      if (!device) throw new Error("Устройство не найдено");

      // Create transfer record
      const { error: transferError } = await supabase.from("device_transfers").insert({
        company_id: companyId,
        device_id: selectedDevice,
        from_store_id: device.store_id,
        to_store_id: targetStore,
        transferred_by: user.id,
        notes: notes || null,
      });
      if (transferError) throw transferError;

      // Update device store
      const { error: updateError } = await supabase
        .from("devices")
        .update({ store_id: targetStore })
        .eq("id", selectedDevice);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer-devices"] });
      queryClient.invalidateQueries({ queryKey: ["device-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Устройство перемещено" });
      setOpen(false);
      setSelectedDevice("");
      setTargetStore("");
      setNotes("");
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const getStoreName = (id: string | null) => stores.find((s) => s.id === id)?.name || "—";

  const filteredDevices = devices.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.model.toLowerCase().includes(q) || d.imei.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Перемещение товаров</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Переместить
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Перемещение устройства</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Устройство</label>
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите устройство" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <div className="p-2">
                      <Input
                        placeholder="Поиск по модели или IMEI..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    {filteredDevices.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.model} {d.memory || ""} — {getStoreName(d.store_id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Магазин назначения</label>
                <Select value={targetStore} onValueChange={setTargetStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите магазин" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores
                      .filter((s) => {
                        const dev = devices.find((d) => d.id === selectedDevice);
                        return dev ? s.id !== dev.store_id : true;
                      })
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Примечание</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Необязательно"
                />
              </div>

              <Button
                onClick={() => transferDevice.mutate()}
                disabled={!selectedDevice || !targetStore || transferDevice.isPending}
                className="w-full"
              >
                {transferDevice.isPending ? "Перемещение..." : "Переместить"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transfer history */}
      <Card className="card-shadow">
        <div className="border-b p-4">
          <h3 className="font-semibold">История перемещений</h3>
        </div>
        {transfers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет перемещений</div>
        ) : (
          <div className="divide-y">
            {transfers.map((t: any) => (
              <div key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {getStoreName(t.from_store_id)} → {getStoreName(t.to_store_id)}
                  </p>
                  {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("ru")}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TransfersPage;
