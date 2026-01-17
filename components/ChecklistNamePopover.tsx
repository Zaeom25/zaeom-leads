import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icons } from './Icons';

interface ChecklistNamePopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}

export const ChecklistNamePopover: React.FC<ChecklistNamePopoverProps> = ({
    isOpen,
    onClose,
    onCreate,
}) => {
    const [name, setName] = useState('');

    const handleCreate = () => {
        if (!name.trim()) return;
        onCreate(name.trim());
        setName('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[60]" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full mt-2 left-0 z-[70] w-72 bg-background-card rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden flex flex-col backdrop-blur-xl p-5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-50">Novo Checklist</span>
                    <button onClick={onClose} className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all">
                        <Icons.X size={14} strokeWidth={3} />
                    </button>
                </div>

                <div className="space-y-4">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Nome da lista..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-text-primary focus:bg-white/10 focus:border-primary/50 transition-all outline-none placeholder:text-text-secondary/30"
                    />

                    <div className="flex gap-3">
                        <button
                            onClick={handleCreate}
                            disabled={!name.trim()}
                            className="flex-1 py-3 bg-gradient-cta text-background-main rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-30 disabled:shadow-none"
                        >
                            CRIAR
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-white/5 text-text-secondary rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all border border-white/5"
                        >
                            CANCELAR
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
};
