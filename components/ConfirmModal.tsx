import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "CONFIRMAR",
    cancelText = "CANCELAR"
}) => {
    useScrollLock(isOpen);
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-main/80 backdrop-blur-md" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-background-card rounded-[2rem] shadow-2xl max-w-sm w-full border border-white/10 overflow-hidden relative"
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-cta rounded-full opacity-50" />
                    <div className="max-h-[90vh] overflow-y-auto custom-scrollbar p-8">
                        <h3 className="text-xl font-black text-text-primary mb-3 tracking-tight">{title}</h3>
                        <p className="text-text-secondary text-sm mb-8 leading-relaxed font-medium opacity-80">{message}</p>
                        <div className="flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 btn-secondary py-4 rounded-[1.25rem]"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className="flex-[1.2] btn-primary py-4 rounded-[1.25rem]"
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
