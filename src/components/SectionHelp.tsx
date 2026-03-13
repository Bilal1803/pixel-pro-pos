import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, ChevronDown, ChevronUp, Lightbulb, Link2, AlertTriangle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SECTION_TO_CATEGORY } from "@/data/knowledgeBase";

export type HelpTip = {
  text: string;
  type?: "info" | "tip" | "dependency" | "warning";
};

interface SectionHelpProps {
  tips: HelpTip[];
  className?: string;
  sectionKey?: string;
}

const iconMap = {
  info: HelpCircle,
  tip: Lightbulb,
  dependency: Link2,
  warning: AlertTriangle,
};

const colorMap = {
  info: "text-primary",
  tip: "text-warning",
  dependency: "text-accent-foreground",
  warning: "text-destructive",
};

const SectionHelp = ({ tips, className, sectionKey }: SectionHelpProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!tips.length) return null;

  const categoryId = sectionKey ? SECTION_TO_CATEGORY[sectionKey] : null;

  return (
    <div className={cn("rounded-lg border bg-muted/30", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="h-4 w-4 text-primary shrink-0" />
        <span>Подсказки и инструкции</span>
        {open ? (
          <ChevronUp className="h-4 w-4 ml-auto" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-auto" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2">
          {tips.map((tip, i) => {
            const type = tip.type || "info";
            const Icon = iconMap[type];
            return (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", colorMap[type])} />
                <span>{tip.text}</span>
              </div>
            );
          })}
          {categoryId && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-primary hover:text-primary mt-1"
              onClick={() => navigate("/dashboard/learning")}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Подробные инструкции
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default SectionHelp;