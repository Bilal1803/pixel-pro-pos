import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, CheckCircle2, Clock, AlertCircle, Calendar, User, Loader2 } from "lucide-react";
import { format, isToday, isPast, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "new" | "in_progress" | "done";
  created_by: string;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  is_management_task: boolean;
  created_at: string;
  store_id: string | null;
  company_id: string;
};

type Profile = { user_id: string; full_name: string };

const statusConfig = {
  new: { label: "Новая", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  in_progress: { label: "В работе", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  done: { label: "Выполнена", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

const TasksPage = () => {
  const { user, companyId } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isManagement, setIsManagement] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!companyId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("company_id", companyId!);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!companyId,
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        company_id: companyId!,
        title,
        description: description || null,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        is_management_task: isManagement,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача создана");
      resetForm();
    },
    onError: () => toast.error("Ошибка создания задачи"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "done") {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = user!.id;
      } else {
        updates.completed_at = null;
        updates.completed_by = null;
      }
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Статус обновлён");
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setDueDate("");
    setIsManagement(false);
  };

  const getName = (uid: string | null) => {
    if (!uid) return "—";
    return employees.find((e) => e.user_id === uid)?.full_name || "—";
  };

  const filtered = tasks.filter((t) => {
    if (tab === "today") return t.due_date && isToday(parseISO(t.due_date)) && t.status !== "done";
    if (tab === "management") return t.is_management_task;
    if (tab === "overdue") return t.due_date && isPast(parseISO(t.due_date)) && t.status !== "done";
    if (tab === "done") return t.status === "done";
    return t.status !== "done";
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Задачи</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Новая задача
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Активные</TabsTrigger>
          <TabsTrigger value="today">На сегодня</TabsTrigger>
          <TabsTrigger value="listings">Объявления</TabsTrigger>
          <TabsTrigger value="management">Руководству</TabsTrigger>
          <TabsTrigger value="overdue">Просроченные</TabsTrigger>
          <TabsTrigger value="done">Выполненные</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Нет задач</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((task) => {
            const cfg = statusConfig[task.status];
            const Icon = cfg.icon;
            const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== "done";
            return (
              <Card key={task.id} className={overdue ? "border-destructive/50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold leading-tight">{task.title}</CardTitle>
                    <Badge variant="secondary" className={`shrink-0 text-[10px] ${cfg.color}`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {task.assigned_to && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {getName(task.assigned_to)}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={`flex items-center gap-1 ${overdue ? "text-destructive font-medium" : ""}`}>
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(task.due_date), "d MMM", { locale: ru })}
                      </span>
                    )}
                    {task.is_management_task && (
                      <Badge variant="outline" className="text-[10px]">Руководству</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    Создал: {getName(task.created_by)} · {format(parseISO(task.created_at), "d MMM HH:mm", { locale: ru })}
                  </div>
                  {task.status === "done" && task.completed_at && (
                    <div className="text-[10px] text-green-600">
                      Выполнил: {getName(task.completed_by)} · {format(parseISO(task.completed_at), "d MMM HH:mm", { locale: ru })}
                    </div>
                  )}
                  {task.status !== "done" && (
                    <div className="flex gap-1 pt-1">
                      {task.status === "new" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: task.id, status: "in_progress" })}>
                          В работу
                        </Button>
                      )}
                      <Button size="sm" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: task.id, status: "done" })}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Выполнена
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая задача</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Название задачи" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Описание (необязательно)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Ответственный" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isManagement} onChange={(e) => setIsManagement(e.target.checked)} className="rounded" />
              Задача для руководства
            </label>
            <Button className="w-full" disabled={!title.trim() || createTask.isPending} onClick={() => createTask.mutate()}>
              {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Создать задачу
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;
