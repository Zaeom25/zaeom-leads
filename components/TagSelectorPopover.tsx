import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';
import { TagDefinition, TagAssignment } from '../types';

interface TagSelectorPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    tagDefinitions: TagDefinition[];
    tagAssignments: TagAssignment[];
    onToggleTag: (tag: TagDefinition) => void;
    onCreateTag: (name: string, color: string) => void;
    onDeleteTag: (id: string) => void;
    onEditTag?: (tagId: string, name: string, color: string) => void;
    tagColors: string[];
}

export const TagSelectorPopover: React.FC<TagSelectorPopoverProps> = ({
    isOpen,
    onClose,
    tagDefinitions,
    tagAssignments,
    onToggleTag,
    onCreateTag,
    onDeleteTag,
    tagColors,
    onEditTag
}) => {
    const [search, setSearch] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingTag, setEditingTag] = useState<TagDefinition | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(tagColors[0]);
    const [tagToDeleteId, setTagToDeleteId] = useState<string | null>(null);

    const filteredTags = useMemo(() => {
        return tagDefinitions.filter(tag =>
            tag.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [tagDefinitions, search]);

    const handleCreate = () => {
        if (!newTagName.trim()) return;
        onCreateTag(newTagName.trim(), newTagColor);
        setNewTagName('');
        setIsCreating(false);
    };

    const handleEditSave = () => {
        if (!editingTag || !newTagName.trim()) return;
        onEditTag?.(editingTag.id, newTagName.trim(), newTagColor);
        setEditingTag(null);
        setNewTagName('');
    };

    const startEditing = (tag: TagDefinition) => {
        setEditingTag(tag);
        setNewTagName(tag.name);
        setNewTagColor(tag.color || tagColors[0]);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop for closing */}
            <div className="fixed inset-0 z-[60]" onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full mt-2 left-0 z-[70] w-72 bg-background-card rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden flex flex-col backdrop-blur-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-50">Etiquetas</span>
                    <button onClick={onClose} className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all">
                        <Icons.X size={14} strokeWidth={3} />
                    </button>
                </div>

                <div className="p-3 space-y-4">
                    {!isCreating && !editingTag ? (
                        <>
                            {/* Search */}
                            <div className="relative">
                                <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50" size={14} strokeWidth={3} />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar etiquetas..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-text-primary focus:bg-white/10 focus:border-primary/50 transition-all outline-none placeholder:text-text-secondary/30"
                                />
                            </div>

                            {/* Tag List */}
                            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-1 -mr-1">
                                {filteredTags.length > 0 ? (
                                    filteredTags.map(tag => {
                                        const isAssigned = tagAssignments.some(a => a.tag_id === tag.id);
                                        return (
                                            <div key={tag.id} className="group flex items-center gap-2">
                                                <button
                                                    onClick={() => onToggleTag(tag)}
                                                    className={`flex-1 flex items-center justify-between p-2.5 rounded-2xl transition-all border-2 ${isAssigned
                                                        ? 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5'
                                                        : 'border-transparent hover:bg-white/5'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="px-2 py-0.5 rounded text-[10px] font-black text-white uppercase tracking-wider border border-transparent"
                                                            style={{ backgroundColor: tag.color }}
                                                        >
                                                            {tag.name}
                                                        </div>
                                                    </div>
                                                    {isAssigned && (
                                                        <div className="bg-primary rounded-full p-0.5 shadow-sm">
                                                            <Icons.Check size={10} className="text-background-main" strokeWidth={4} />
                                                        </div>
                                                    )}
                                                </button>
                                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                                                    {tagToDeleteId === tag.id ? (
                                                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                                                            <button
                                                                onClick={() => {
                                                                    onDeleteTag(tag.id);
                                                                    setTagToDeleteId(null);
                                                                }}
                                                                className="px-2.5 py-1.5 bg-red-500 text-white text-[9px] font-black rounded-lg hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                                            >
                                                                EXCLUIR
                                                            </button>
                                                            <button
                                                                onClick={() => setTagToDeleteId(null)}
                                                                className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                                                            >
                                                                <Icons.X size={12} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => startEditing(tag)}
                                                                className="p-2 text-text-secondary/40 hover:text-primary rounded-xl hover:bg-primary/10 transition-all"
                                                                title="Editar tag"
                                                            >
                                                                <Icons.Edit size={12} strokeWidth={3} />
                                                            </button>
                                                            <button
                                                                onClick={() => setTagToDeleteId(tag.id)}
                                                                className="p-2 text-text-secondary/40 hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-all"
                                                                title="Excluir tag"
                                                            >
                                                                <Icons.Trash2 size={12} strokeWidth={3} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-10 px-4 opacity-30 select-none">
                                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Nenhuma tag encontrada</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setIsCreating(true);
                                    setNewTagName('');
                                    setNewTagColor(tagColors[0]);
                                }}
                                className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase transition-all border border-white/5 active:scale-95 shadow-sm"
                            >
                                Criar uma nova etiqueta
                            </button>
                        </>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setIsCreating(false);
                                        setEditingTag(null);
                                    }}
                                    className="p-2 rounded-xl bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all"
                                >
                                    <Icons.ArrowLeft size={14} strokeWidth={3} />
                                </button>
                                <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-60">
                                    {isCreating ? 'Nova Etiqueta' : 'Editar Etiqueta'}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Nome da etiqueta..."
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (isCreating ? handleCreate() : handleEditSave())}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-text-primary focus:bg-white/10 focus:border-primary/50 transition-all outline-none placeholder:text-text-secondary/30"
                                />

                                <div className="grid grid-cols-6 gap-2">
                                    {tagColors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setNewTagColor(color)}
                                            className={`w-8 h-8 rounded-xl shadow-sm transition-all ring-offset-2 ring-offset-background-main shrink-0 ${newTagColor === color
                                                ? 'ring-2 ring-primary scale-110 shadow-lg shadow-primary/20'
                                                : 'hover:scale-105 active:scale-95 opacity-80 hover:opacity-100'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-white/5">
                                    <button
                                        onClick={isCreating ? handleCreate : handleEditSave}
                                        disabled={!newTagName.trim()}
                                        className="flex-1 py-3 bg-gradient-cta text-background-main rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-30 disabled:shadow-none"
                                    >
                                        SALVAR
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsCreating(false);
                                            setEditingTag(null);
                                        }}
                                        className="flex-1 py-3 bg-white/5 text-text-secondary rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all border border-white/5"
                                    >
                                        CANCELAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </>
    );
};
