
import React from 'react';
import { AppNotification } from '../types';
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface NotificationHubProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationHub: React.FC<NotificationHubProps> = ({ notifications, onDismiss }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="text-red-500" size={20} />;
      case 'success': return <CheckCircle2 className="text-emerald-500" size={20} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'error': return 'border-red-200/60 bg-white';
      case 'success': return 'border-emerald-200/60 bg-white';
      case 'warning': return 'border-amber-200/60 bg-white';
      default: return 'border-blue-200/60 bg-white';
    }
  };

  const getProgressColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-500';
      case 'success': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div
      className="fixed left-4 right-4 bottom-5 z-[100] flex flex-col items-end space-y-3 pointer-events-none sm:left-auto sm:right-5 sm:w-full sm:max-w-md"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div 
            key={n.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }}
            layout
            className={`w-full pointer-events-auto flex flex-col rounded-lg border shadow-xl shadow-black/10 overflow-hidden ${getBgColor(n.type)}`}
          >
            <div className="flex items-start p-4 gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                {n.title && <p className="text-sm font-bold text-slate-900 mb-0.5 truncate">{n.title}</p>}
                <p className="text-sm text-slate-600 leading-relaxed">{n.message}</p>
              </div>
              <button 
                onClick={() => onDismiss(n.id)}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                aria-label="Cerrar notificación"
              >
                <X size={14} />
              </button>
            </div>
            {/* Auto-dismiss progress bar */}
            {(n.type === 'success' || n.type === 'info') && (
              <div className="h-[2px] w-full bg-slate-100" aria-hidden="true">
                <div className={`h-full notif-progress-bar rounded-full ${getProgressColor(n.type)}`} />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
