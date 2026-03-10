import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Image, Upload, X } from "lucide-react";

interface Story {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  action_url: string | null;
  action_label: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

const emptyForm = { title: "", description: "", image_url: "", action_url: "", action_label: "Перейти", is_active: true };

const AdminStoriesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["admin-stories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Story[];
    },
  });

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("stories").upload(fileName, file, { contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("stories").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let imageUrl = form.image_url;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      if (!imageUrl) throw new Error("Изображение обязательно");

      const payload = {
        title: form.title,
        description: form.description || null,
        image_url: imageUrl,
        action_url: form.action_url || null,
        action_label: form.action_url ? (form.action_label || "Перейти") : null,
        is_active: form.is_active,
      };

      if (editId) {
        const { error } = await supabase.from("stories").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
      setImageFile(null);
      setImagePreview(null);
      setUploading(false);
      toast({ title: editId ? "Story обновлена" : "Story создана" });
    },
    onError: (e: any) => {
      setUploading(false);
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
      toast({ title: "Story удалена" });
    },
  });

  const openEdit = (s: Story) => {
    setEditId(s.id);
    setForm({
      title: s.title,
      description: s.description || "",
      image_url: s.image_url,
      action_url: s.action_url || "",
      action_label: s.action_label || "Перейти",
      is_active: s.is_active,
    });
    setImageFile(null);
    setImagePreview(s.image_url);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setForm({ ...form, image_url: "pending-upload" });
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setForm({ ...form, image_url: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSave = form.title && (imageFile || form.image_url);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stories / Баннеры</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Создать Story</Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : stories.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Image className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p>Нет Stories. Создайте первую!</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <img src={s.image_url} alt={s.title} className="w-full h-40 object-cover" />
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{s.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {s.is_active ? "Активна" : "Скрыта"}
                  </span>
                </div>
                {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                    <Pencil className="h-3 w-3 mr-1" /> Редактировать
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(s.id)} className="text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Редактировать Story" : "Новая Story"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Заголовок *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Изображение (1080×1920) *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium">Нажмите для загрузки</span>
                  <span className="text-xs">JPG, PNG, WebP</span>
                </button>
              )}
            </div>
            <div>
              <Label>URL действия <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
              <Input value={form.action_url} onChange={(e) => setForm({ ...form, action_url: e.target.value })} placeholder="https://..." />
            </div>
            {form.action_url && (
              <div>
                <Label>Текст кнопки</Label>
                <Input value={form.action_label} onChange={(e) => setForm({ ...form, action_label: e.target.value })} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Активна</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!canSave || uploading}>
              {uploading ? "Загрузка..." : editId ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStoriesPage;
