import { useState, useCallback } from 'react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertState {
  isOpen: boolean;
  title?: string;
  message: string;
  type: AlertType;
  duration?: number;
  isConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface UseCustomAlertReturn {
  alertState: AlertState;
  showAlert: (message: string, options?: {
    title?: string;
    type?: AlertType;
    duration?: number;
  }) => void;
  showConfirm: (message: string, options?: {
    title?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  closeAlert: () => void;
}

export const useCustomAlert = (): UseCustomAlertReturn => {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    message: '',
    type: 'info',
    duration: 5000,
    isConfirm: false,
  });

  const showAlert = useCallback((
    message: string,
    options: {
      title?: string;
      type?: AlertType;
      duration?: number;
    } = {}
  ) => {
    setAlertState({
      isOpen: true,
      message,
      title: options.title,
      type: options.type || 'info',
      duration: options.duration !== undefined ? options.duration : 5000,
      isConfirm: false,
    });
  }, []);

  const showConfirm = useCallback((
    message: string,
    options: {
      title?: string;
      onConfirm?: () => void;
      onCancel?: () => void;
    } = {}
  ) => {
    setAlertState({
      isOpen: true,
      message,
      title: options.title || 'Confirm Action',
      type: 'warning',
      duration: 0, // Manual close only for confirm dialogs
      isConfirm: true,
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    showAlert(message, { type: 'success', title });
  }, [showAlert]);

  const showError = useCallback((message: string, title?: string) => {
    showAlert(message, { type: 'error', title, duration: 7000 }); // Errors stay longer
  }, [showAlert]);

  const showWarning = useCallback((message: string, title?: string) => {
    showAlert(message, { type: 'warning', title });
  }, [showAlert]);

  const showInfo = useCallback((message: string, title?: string) => {
    showAlert(message, { type: 'info', title });
  }, [showAlert]);

  const closeAlert = useCallback(() => {
    setAlertState(prev => ({ 
      ...prev, 
      isOpen: false,
      isConfirm: false,
      onConfirm: undefined,
      onCancel: undefined,
    }));
  }, []);

  return {
    alertState,
    showAlert,
    showConfirm,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    closeAlert,
  };
};

export default useCustomAlert;
