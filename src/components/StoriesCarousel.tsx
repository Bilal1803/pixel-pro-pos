import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Story {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  action_url: string | null;
  action_label: string | null;
  text_color: string | null;
  created_at: string;
}

const StoriesCarousel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeStory, setActiveStory] = useState<Story | null>(null);

  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stories")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return (data || []) as Story[];
    },
  });

  const { data: viewedIds = [] } = useQuery({
    queryKey: ["story-views", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("user_id", user.id);
      return (data || []).map((v: any) => v.story_id);
    },
    enabled: !!user,
  });

  const markViewed = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) return;
      await supabase.from("story_views").upsert({ story_id: storyId, user_id: user.id }, { onConflict: "story_id,user_id" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["story-views"] }),
  });

  const openStory = (story: Story) => {
    setActiveStory(story);
    if (!viewedIds.includes(story.id)) {
      markViewed.mutate(story.id);
    }
  };

  if (stories.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {stories.map((story) => {
          const viewed = viewedIds.includes(story.id);
          return (
            <button
              key={story.id}
              onClick={() => openStory(story)}
              className="flex-shrink-0 group"
            >
              <div
                className={`w-20 h-20 rounded-2xl p-[2.5px] transition-all ${
                  viewed
                    ? "bg-muted"
                    : "bg-gradient-to-br from-primary via-blue-400 to-cyan-400"
                }`}
              >
                <div className="w-full h-full rounded-[14px] overflow-hidden bg-card">
                  <img
                    src={story.thumbnail_url || story.image_url}
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              </div>
              <p className="text-xs text-center mt-1 text-muted-foreground truncate w-20">
                {story.title}
              </p>
            </button>
          );
        })}
      </div>

      <Dialog open={!!activeStory} onOpenChange={(o) => !o && setActiveStory(null)}>
        <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden gap-0 border-0 bg-transparent shadow-none [&>button]:hidden">
          {activeStory && (
            <div className="relative rounded-lg overflow-hidden bg-black" style={{ aspectRatio: "9/16", maxHeight: "85vh" }}>
              <button
                onClick={() => setActiveStory(null)}
                className="absolute top-3 right-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={activeStory.image_url}
                alt={activeStory.title || "Story"}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {(activeStory.title && activeStory.title !== "Story" || activeStory.description || activeStory.action_url) && (
                <div
                  className="absolute inset-x-0 bottom-0 p-5 space-y-3"
                  style={{
                    color: activeStory.text_color || "#ffffff",
                    background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
                  }}
                >
                  {activeStory.title && activeStory.title !== "Story" && (
                    <h3 className="text-lg font-bold">{activeStory.title}</h3>
                  )}
                  {activeStory.description && (
                    <p className="text-sm opacity-90">{activeStory.description}</p>
                  )}
                  {activeStory.action_url && (
                    <Button
                      className="w-full"
                      onClick={() => window.open(activeStory!.action_url!, "_blank")}
                    >
                      {activeStory.action_label || "Перейти"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StoriesCarousel;
