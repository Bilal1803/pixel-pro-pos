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
  thumbnail_url: string | null;
  action_url: string | null;
  action_label: string | null;
  text_color: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

const emptyForm = { title: "", description: "", image_url: "", thumbnail_url: "", action_url: "", action_label: "Перейти", text_color: "#ffffff", is_active: true };

const AdminStoriesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Thumbnail (1:1)
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Full story image
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);

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

  const uploadImage = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("stories").upload(fileName, file, { contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("stories").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);

      let storyImageUrl = form.image_url;
      let thumbnailUrl = form.thumbnail_url;

      if (storyFile) {
        storyImageUrl = await uploadImage(storyFile, "full");
      }
      if (thumbFile) {
        thumbnailUrl = await uploadImage(thumbFile, "thumbs");
      }

      if (!storyImageUrl || storyImageUrl === "pending-upload") throw new Error("Изображение Story обязательно");
      if (!thumbnailUrl || thumbnailUrl === "pending-upload") throw new Error("Превью обязательно");

      const payload = {
        title: form.title,
        description: form.description || null,
        image_url: storyImageUrl,
        thumbnail_url: thumbnailUrl,
        action_url: form.action_url || null,
        action_label: form.action_url ? (form.action_label || "Перейти") : null,
        text_color: form.text_color || "#ffffff",
        is_active: form.is_active,
      } as any;

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
      resetForm();
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

  const resetForm = () => {
    setEditId(null);
    setForm(emptyForm);
    setThumbFile(null);
    setThumbPreview(null);
    setStoryFile(null);
    setStoryPreview(null);
    setUploading(false);
  };

  const openEdit = (s: Story) => {
    setEditId(s.id);
    setForm({
      title: s.title,
      description: s.description || "",
      image_url: s.image_url,
      thumbnail_url: (s as any).thumbnail_url || "",
      action_url: s.action_url || "",
      action_label: s.action_label || "Перейти",
      text_color: (s as any).text_color || "#ffffff",
      is_active: s.is_active,
    });
    setThumbFile(null);
    setThumbPreview((s as any).thumbnail_url || s.image_url);
    setStoryFile(null);
    setStoryPreview(s.image_url);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
    formKey: "image_url" | "thumbnail_url",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setForm((prev) => ({ ...prev, [formKey]: "pending-upload" }));
  };

  const removeFile = (
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
    formKey: "image_url" | "thumbnail_url",
    inputRef: React.RefObject<HTMLInputElement>,
  ) => {
    setFile(null);
    setPreview(null);
    setForm((prev) => ({ ...prev, [formKey]: "" }));
    if (inputRef.current) inputRef.current.value = "";
  };

  const canSave = form.title && (thumbFile || form.thumbnail_url) && (storyFile || form.image_url);

  const renderUploader = (
    label: string,
    aspect: string,
    preview: string | null,
    inputRef: React.RefObject<HTMLInputElement>,
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onRemove: () => void,
    aspectClass: string,
  ) => (
    <div>
      <Label>{label}</Label>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      {preview ? (
        <div className={`relative mt-2 rounded-lg overflow-hidden border border-border ${aspectClass}`}>
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          <Upload className="h-6 w-6" />
          <span className="text-sm font-medium">Загрузить ({aspect})</span>
          <span className="text-xs">JPG, PNG, WebP</span>
        </button>
      )}
    </div>
  );

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
              <img src={(s as any).thumbnail_url || s.image_url} alt={s.title} className="w-full h-40 object-cover" />
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Редактировать Story" : "Новая Story"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Заголовок <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Описание <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {renderUploader(
                "Превью (1:1) *",
                "1:1",
                thumbPreview,
                thumbInputRef,
                (e) => handleFile(e, setThumbFile, setThumbPreview, "thumbnail_url"),
                () => removeFile(setThumbFile, setThumbPreview, "thumbnail_url", thumbInputRef),
                "aspect-square max-h-48",
              )}
              {renderUploader(
                "Изображение Story *",
                "9:16",
                storyPreview,
                storyInputRef,
                (e) => handleFile(e, setStoryFile, setStoryPreview, "image_url"),
                () => removeFile(setStoryFile, setStoryPreview, "image_url", storyInputRef),
                "aspect-[9/16] max-h-48",
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
            <div>
              <Label>Цвет текста</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.text_color}
                  onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={form.text_color}
                  onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                  className="w-28"
                  placeholder="#ffffff"
                />
              </div>
            </div>
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
