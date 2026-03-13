import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Clock, AlertCircle, Plus, Loader2, Pencil, Undo2 } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "new" | "in_progress" | "done";
  created_by: string;
  assigned_to: string | null;
  due_date: string | null;
  is_management_task: boolean;
  created_at: string;
  completed_at: string | null;
  company_id: string;
};

const statusIcon = { new: AlertCircle, in_progress: Clock, done: CheckCircle2 };
const statusLabel = { new: "Новая", in_progress: "В работе", done: "Выполнена" };
const statusColor = { new: "bg-blue-100 text-blue-700", in_progress: "bg-yellow-100 text-yellow-700", done: "bg-green-100 text-green-700" };

const TmaTasksPage = () => {
  const { user, companyId } = useAuth();
  const qc = useQueryClient();
  const [showDone, setShowDone] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

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

  const myTasks = tasks.filter((t) => t.assigned_to === user?.id || t.created_by === user?.id);
  const todayTasks = myTasks.filter((t) => t.due_date && isToday(parseISO(t.due_date)) && t.status !== "done");
  const activeTasks = myTasks.filter((t) => t.status !== "done");
  const doneTasks = myTasks.filter((t) => t.status === "done");

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
      toast.success("Готово");
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        company_id: companyId!,
        title,
        description: description || null,
        is_management_task: true,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача отправлена руководству");
      resetForm();
    },
  });

  const editTask = useMutation({
    mutationFn: async () => {
      if (!editingTask) return;
      const { error } = await supabase.from("tasks").update({
        title,
        description: description || null,
      }).eq("id", editingTask.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача обновлена");
      resetForm();
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingTask(null);
    setTitle("");
    setDescription("");
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setDialogOpen(true);
  };

  const displayed = showDone ? doneTasks : activeTasks;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Задачи</h1>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Руководству
        </Button>
      </div>

      {todayTasks.length > 0 && !showDone && (
        <div className="bg-blue-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-700">Задачи на сегодня</p>
          {todayTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-white rounded-lg p-2.5 shadow-sm">
              <span className="text-sm font-medium text-gray-800 flex-1">{t.title}</span>
              <Button size="sm" className="h-7 text-xs rounded-lg ml-2" onClick={() => updateStatus.mutate({ id: t.id, status: "done" })}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Готово
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setShowDone(false)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!showDone ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          Активные ({activeTasks.length})
        </button>
        <button
          onClick={() => setShowDone(true)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showDone ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          Выполненные ({doneTasks.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <p className="text-center text-gray-400 py-10 text-sm">Нет задач</p>
      ) : (
        <div className="space-y-2">
          {displayed.map((task) => {
            const Icon = statusIcon[task.status];
            return (
              <div key={task.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 flex-1">{task.title}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(task)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Редактировать"
                    >
                      <Pencil className="h-3 w-3 text-gray-400" />
                    </button>
                    <Badge className={`text-[10px] ${statusColor[task.status]}`}>
                      <Icon className="h-3 w-3 mr-0.5" /> {statusLabel[task.status]}
                    </Badge>
                  </div>
                </div>
                {task.description && <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>}
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  {task.due_date && <span>{format(parseISO(task.due_date), "d MMM", { locale: ru })}</span>}
                  {task.is_management_task && <Badge variant="outline" className="text-[9px]">Руководству</Badge>}
                  <span>{format(parseISO(task.created_at), "d MMM HH:mm", { locale: ru })}</span>
                </div>
                <div className="flex gap-1.5">
                  {task.status === "done" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs rounded-lg"
                      onClick={() => updateStatus.mutate({ id: task.id, status: "in_progress" })}
                    >
                      <Undo2 className="h-3 w-3 mr-1" /> Вернуть в работу
                    </Button>
                  ) : (
                    <>
                      {task.status === "new" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => updateStatus.mutate({ id: task.id, status: "in_progress" })}>
                          В работу
                        </Button>
                      )}
                      {task.status === "in_progress" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => updateStatus.mutate({ id: task.id, status: "new" })}>
                          <Undo2 className="h-3 w-3 mr-1" /> Назад
                        </Button>
                      )}
                      <Button size="sm" className="h-7 text-xs rounded-lg" onClick={() => updateStatus.mutate({ id: task.id, status: "done" })}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Выполнена
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); else setDialogOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Редактировать задачу" : "Задача руководству"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Что нужно сделать?" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Подробности (необязательно)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            <Button
              className="w-full"
              disabled={!title.trim() || createTask.isPending || editTask.isPending}
              onClick={() => editingTask ? editTask.mutate() : createTask.mutate()}
            >
              {(createTask.isPending || editTask.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingTask ? "Сохранить" : "Отправить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TmaTasksPage;
