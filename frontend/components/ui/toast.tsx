import * as React from "react";

import { cn } from "../../lib/utils";

export type ToastVariant = "default" | "success" | "error";

type ToastContextValue = {
  toast: (opts: {
    title?: string;
    description?: string;
    variant?: ToastVariant;
  }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = React.useState<
    Array<{
      id: string;
      title?: string;
      description?: string;
      variant: ToastVariant;
    }>
  >([]);

  const toast = (opts: {
    title?: string;
    description?: string;
    variant?: ToastVariant;
  }) => {
    const id = `${Date.now()}-${Math.random()}`;
    const next = {
      id,
      title: opts.title,
      description: opts.description,
      variant: opts.variant ?? "default",
    };

    setToasts((t) => [next, ...t].slice(0, 4));

    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed right-4 top-4 z-[1000] flex w-[360px] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur",
              t.variant === "success" &&
                "border-green-200/70",
              t.variant === "error" &&
                "border-red-200/70"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                {t.title && (
                  <div className="font-semibold text-foreground">
                    {t.title}
                  </div>
                )}
                {t.description && (
                  <div className="text-sm text-muted-foreground">
                    {t.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx.toast;
}

