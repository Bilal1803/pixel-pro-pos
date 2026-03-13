// Global error handler that logs client-side errors to the system_errors table
import { supabase } from "@/integrations/supabase/client";

let isInitialized = false;

export const initErrorLogger = () => {
  if (isInitialized) return;
  isInitialized = true;

  const logError = async (
    message: string,
    source?: string,
    lineno?: number,
    colno?: number,
    stack?: string,
    errorType = "runtime"
  ) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      await supabase.from("system_errors").insert({
        error_type: errorType,
        message: message.slice(0, 2000),
        stack: stack?.slice(0, 5000) || null,
        file_name: source || null,
        line_number: lineno || null,
        column_number: colno || null,
        user_id: user?.id || null,
        user_email: user?.email || null,
        url: window.location.href,
        user_agent: navigator.userAgent?.slice(0, 500) || null,
      } as any);
    } catch {
      // Silently fail - don't create error loops
    }
  };

  // Global error handler
  window.addEventListener("error", (event) => {
    logError(
      event.message || "Unknown error",
      event.filename,
      event.lineno,
      event.colno,
      event.error?.stack,
      "runtime"
    );
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason) || "Unhandled promise rejection";
    logError(message, undefined, undefined, undefined, reason?.stack, "promise");
  });
};
