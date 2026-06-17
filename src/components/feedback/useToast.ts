import { useContext } from "react";
import { ToastContext } from "./ToastProvider";

export function useToast(): {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
} {
  const ctx = useContext(ToastContext);
  const addToast = ctx?.addToast;

  const noop = (_message: string) => {};

  return {
    success: addToast ? (message: string) => addToast("success", message) : noop,
    error: addToast ? (message: string) => addToast("error", message) : noop,
    info: addToast ? (message: string) => addToast("info", message) : noop,
    warning: addToast ? (message: string) => addToast("warning", message) : noop,
  };
}
