/**
 * Toast notification utilities
 * Provides a simple API for showing toast notifications throughout the app
 */

import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
    });
  },

  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
    });
  },

  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
    });
  },

  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
    });
  },

  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return sonnerToast.promise(promise, options);
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },
};

