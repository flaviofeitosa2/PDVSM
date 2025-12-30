
import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-5 right-5 z-[200] flex items-center justify-center pointer-events-none">
      <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border-l-4 border-[#10b981] pointer-events-auto transition-all transform animate-bounce">
        <div className="bg-[#10b981] rounded-full p-1">
            <CheckCircle size={14} className="text-white" />
        </div>
        <span className="font-medium text-sm">{message}</span>
        <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
