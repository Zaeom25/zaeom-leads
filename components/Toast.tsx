
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onClose: (id: string) => void;
}

const toastStyles = {
    success: 'bg-white border-l-4 border-emerald-500 text-emerald-900',
    error: 'bg-white border-l-4 border-rose-500 text-rose-900',
    info: 'bg-white border-l-4 border-blue-500 text-blue-900',
};

const toastIcons = {
    success: <Icons.CheckCircle className="text-emerald-500" size={20} />,
    error: <Icons.AlertCircle className="text-rose-500" size={20} />,
    info: <Icons.Info className="text-blue-500" size={20} />,
};

export const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, 5000); // Auto close after 5s

        return () => clearTimeout(timer);
    }, [id, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            layout
            className={`p-4 rounded-lg shadow-lg shadow-slate-200/50 flex items-start gap-3 min-w-[300px] max-w-md pointer-events-auto ${toastStyles[type]}`}
        >
            <div className="shrink-0 pt-0.5">{toastIcons[type]}</div>
            <div className="flex-1 text-sm font-medium">{message}</div>
            <button
                onClick={() => onClose(id)}
                className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <Icons.X size={16} />
            </button>
        </motion.div>
    );
};
