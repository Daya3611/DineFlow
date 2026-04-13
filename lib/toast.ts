import { create } from "zustand";

type ToastType = "success" | "error" | "warning";

interface ToastOptions {
  position?: "top-center" | "bottom-center" | "top-right";
}

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  position?: "top-center" | "bottom-center" | "top-right";
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string, options?: ToastOptions) => useToastStore.getState().addToast({ type: "success", message, ...options }),
  error: (message: string, options?: ToastOptions) => useToastStore.getState().addToast({ type: "error", message, ...options }),
  warning: (message: string, options?: ToastOptions) => useToastStore.getState().addToast({ type: "warning", message, ...options }),
};
