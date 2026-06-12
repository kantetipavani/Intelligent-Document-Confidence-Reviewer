import * as React from "react";
import { ToastProvider } from "./toast";

export function Toaster() {
  return <ToastProvider>{null}</ToastProvider>;
}

// Convenience wrapper if you prefer <Toaster /> at app root.
export function AppToaster({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}

