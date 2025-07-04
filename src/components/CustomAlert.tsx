import React, { useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface CustomAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  isConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type,
  duration = 5000,
  isConfirm = false,
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();

  // Auto-close after duration (only for non-confirm alerts)
  useEffect(() => {
    if (isOpen && !isConfirm && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, isConfirm, duration, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      case 'warning':
        return 'border-yellow-500';
      case 'info':
        return 'border-blue-500';
      default:
        return 'border-blue-500';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`
        relative max-w-md w-full bg-card border rounded-lg shadow-lg
        ${getBorderColor()}
        ${theme === 'dark' ? 'border-2' : 'border-2'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          {!isConfirm && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-muted-foreground">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-4 border-t border-border">
          {isConfirm ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  type === 'error'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                Confirm
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              OK
            </button>
          )}
        </div>

        {/* Progress bar for auto-close (only for non-confirm alerts) */}
        {!isConfirm && duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-lg overflow-hidden">
            <div 
              className={`h-full transition-all ease-linear ${
                type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}
              style={{
                animation: `shrink ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
