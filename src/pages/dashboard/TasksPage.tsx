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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, CheckCircle2, Clock, AlertCircle, Calendar, User, Loader2, Pencil, Undo2 } from "lucide-react";
import { format, isToday, isPast, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Label } from "@/components/ui/label";

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
  category: string | null;
  device_id: string | null;
  result_url: string | null;
};

type Profile = { user_id: string; full_name: string };

const TASK_CATEGORIES = [
  { value: "listing", label: "📢 Выложить объявление" },
  { value: "check_prices", label: "💰 Проверить цены" },
  { value: "sale", label: "🛒 Продажа" },
  { value: "buyback", label: "📥 Скупка" },
  { value: "inventory", label: "📦 Склад" },
  { value: "relist", label: "🔄 Перевыложить объявление" },
  { value: "other", label: "📋 Другое" },
];

const getCategoryLabel = (cat: string | null) => {
  return TASK_CATEGORIES.find(c => c.value === cat)?.label || "📋 Другое";
};

const statusConfig = {
  new: { label: "Новая", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  in_progress: { label: "В работе", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  done: { label: "Выполнена", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

const TasksPage = () => {
  const { user, companyId } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [tab, setTab] = useState("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isManagement, setIsManagement] = useState(false);
  const [category, setCategory] = useState("other");

  // Completion dialog for listing tasks
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [resultUrl, setResultUrl] = useState("");

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
        category,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача создана");
      resetForm();
    },
    onError: () => toast.error("Ошибка создания задачи"),
  });

  const editTask = useMutation({
    mutationFn: async () => {
      if (!editingTask) return;
      const { error } = await supabase.from("tasks").update({
        title,
        description: description || null,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        is_management_task: isManagement,
        category,
      } as any).eq("id", editingTask.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача обновлена");
      resetForm();
    },
    onError: () => toast.error("Ошибка сохранения"),
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

  const completeListingTask = useMutation({
    mutationFn: async () => {
      if (!completingTask || !companyId) return;
      
      // 1. Update the task as done with result_url
      const { error: taskError } = await supabase.from("tasks").update({
        status: "done",
        completed_at: new Date().toISOString(),
        completed_by: user!.id,
        result_url: resultUrl,
      } as any).eq("id", completingTask.id);
      if (taskError) throw taskError;

      // 2. If task has device_id, update device listing status
      if (completingTask.device_id) {
        const { error: deviceError } = await supabase.from("devices").update({
          listing_status: "listed",
          listing_url: resultUrl,
          listing_published_at: new Date().toISOString(),
        }).eq("id", completingTask.device_id);
        if (deviceError) throw deviceError;
      }

      // 3. Try to extract model info from task title and create listing
      const titleMatch = completingTask.title.match(/:\s*(.+)/);
      const groupName = titleMatch ? titleMatch[1].trim() : completingTask.title;
      
      // Check if listing with this group already exists
      const { data: existing } = await supabase
        .from("listings")
        .select("id, device_count")
        .eq("company_id", companyId)
        .eq("group_name", groupName)
        .maybeSingle();

      if (existing) {
        // Update existing listing count and URL
        await supabase.from("listings").update({
          device_count: (existing.device_count || 0) + 1,
          avito_url: resultUrl,
          last_refreshed: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        // Create new listing
        await supabase.from("listings").insert({
          company_id: companyId,
          group_name: groupName,
          avito_url: resultUrl,
          device_count: 1,
          last_refreshed: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["devices"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Объявление опубликовано, склад обновлён");
      setCompleteDialogOpen(false);
      setCompletingTask(null);
      setResultUrl("");
    },
    onError: () => toast.error("Ошибка выполнения"),
  });

  const handleComplete = (task: Task) => {
    const isListingTask = task.category === "listing" || task.category === "relist" 
      || task.title.includes("Опубликовать") || task.title.includes("Перевыложить");
    
    if (isListingTask) {
      setCompletingTask(task);
      setResultUrl(task.result_url || "");
      setCompleteDialogOpen(true);
    } else {
      updateStatus.mutate({ id: task.id, status: "done" });
    }
  };

  const resetForm = () => {
    setDialogOpen(false);
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setDueDate("");
    setIsManagement(false);
    setCategory("other");
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setAssignedTo(task.assigned_to || "");
    setDueDate(task.due_date || "");
    setIsManagement(task.is_management_task);
    setCategory(task.category || "other");
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setDueDate("");
    setIsManagement(false);
    setCategory("other");
    setDialogOpen(true);
  };

  const getName = (uid: string | null) => {
    if (!uid) return "—";
    return employees.find((e) => e.user_id === uid)?.full_name || "—";
  };

  const filtered = tasks.filter((t) => {
    if (tab === "today") return t.due_date && isToday(parseISO(t.due_date)) && t.status !== "done";
    if (tab === "listings") return (t.category === "listing" || t.category === "relist" || t.title.includes("Опубликовать") || t.title.includes("Перевыложить")) && t.status !== "done";
    if (tab === "management") return t.is_management_task;
    if (tab === "overdue") return t.due_date && isPast(parseISO(t.due_date)) && t.status !== "done";
    if (tab === "done") return t.status === "done";
    return t.status !== "done";
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Задачи</h1>
        <Button onClick={openCreate}>
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
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(task)} title="Редактировать">
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Badge variant="secondary" className={`text-[10px] ${cfg.color}`}>
                        <Icon className="h-3 w-3 mr-1" /> {cfg.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {getCategoryLabel(task.category)}
                    </Badge>
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
                  {task.result_url && task.status === "done" && (
                    <a href={task.result_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block truncate">
                      🔗 {task.result_url}
                    </a>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    Создал: {getName(task.created_by)} · {format(parseISO(task.created_at), "d MMM HH:mm", { locale: ru })}
                  </div>
                  {task.status === "done" && task.completed_at && (
                    <div className="text-[10px] text-green-600">
                      Выполнил: {getName(task.completed_by)} · {format(parseISO(task.completed_at), "d MMM HH:mm", { locale: ru })}
                    </div>
                  )}
                  <div className="flex gap-1 pt-1">
                    {task.status === "done" ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: task.id, status: "in_progress" })}>
                        <Undo2 className="h-3 w-3 mr-1" /> Вернуть в работу
                      </Button>
                    ) : (
                      <>
                        {task.status === "new" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: task.id, status: "in_progress" })}>
                            В работу
                          </Button>
                        )}
                        {task.status === "in_progress" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: task.id, status: "new" })}>
                            <Undo2 className="h-3 w-3 mr-1" /> Назад
                          </Button>
                        )}
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleComplete(task)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Выполнена
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); else setDialogOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Редактировать задачу" : "Новая задача"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-1.5 block">Категория</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Button
              className="w-full"
              disabled={!title.trim() || createTask.isPending || editTask.isPending}
              onClick={() => editingTask ? editTask.mutate() : createTask.mutate()}
            >
              {(createTask.isPending || editTask.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingTask ? "Сохранить" : "Создать задачу"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completion dialog for listing tasks */}
      <Dialog open={completeDialogOpen} onOpenChange={(v) => { if (!v) { setCompleteDialogOpen(false); setCompletingTask(null); setResultUrl(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Завершение задачи</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Вставьте ссылку на опубликованное объявление. Статус устройства на складе будет автоматически обновлён.
            </p>
            <div>
              <Label className="text-sm mb-1.5 block">Ссылка на объявление</Label>
              <Input
                placeholder="https://avito.ru/..."
                value={resultUrl}
                onChange={(e) => setResultUrl(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!resultUrl.trim() || completeListingTask.isPending}
              onClick={() => completeListingTask.mutate()}
            >
              {completeListingTask.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Подтвердить публикацию
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;
