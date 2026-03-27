import { toast } from 'sonner';

/**
 * Custom hook for toast notifications
 * Provides a consistent interface for showing success, error, and info messages
 */
export function useToast() {
  return {
    success: (message: string, description?: string) => {
      toast.success(message, {
        description,
        duration: 4000,
      });
    },
    error: (message: string, description?: string) => {
      toast.error(message, {
        description,
        duration: 4000,
      });
    },
    info: (message: string, description?: string) => {
      toast.info(message, {
        description,
        duration: 4000,
      });
    },
    warning: (message: string, description?: string) => {
      toast.warning(message, {
        description,
        duration: 4000,
      });
    },
    loading: (message: string) => {
      return toast.loading(message);
    },
    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      }
    ) => {
      return toast.promise(promise, messages);
    },
  };
}
