import React, { useState } from 'react';
import { Icons } from './Icons';
import { Lead, TagDefinition } from '../types';
import { TagSelectorPopover } from './TagSelectorPopover';

interface ContextMenuProps {
    x: number;
    y: number;
    lead: Lead;
    onClose: () => void;
    onAddTag: (tag: string, color?: string) => void;
    onRemoveTag: (tag: string) => void;
    onEdit: () => void;
    onDelete: () => void;
    onDeleteTagDef?: (tagId: string) => void; // Optional to not break interface immediately
    tagDefinitions?: TagDefinition[];
}

const TAG_COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#64748b'
];

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x, y, lead, onClose, onAddTag, onRemoveTag, onEdit, onDelete, tagDefinitions = [], onDeleteTagDef
}) => {
    const [showTagSelector, setShowTagSelector] = useState(false);

    const currentTags = lead.tags || [];

    // Map current tags to assignments format expected by TagSelectorPopover
    const tagAssignments = currentTags.map(tagName => {
        const def = tagDefinitions.find(d => d.name === tagName);
        return {
            id: def?.id || 'temp',
            lead_id: lead.id,
            tag_id: def?.id || 'temp',
            tag: def
        };
    });

    const handleToggleTag = (tag: TagDefinition) => {
        const isAssigned = currentTags.includes(tag.name);
        if (isAssigned) {
            onRemoveTag(tag.name);
        } else {
            onAddTag(tag.name, tag.color);
        }
    };

    return (
        <>
            <div
                className="fixed z-50 bg-background-card rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 w-72 animate-in fade-in zoom-in-95 duration-100 origin-top-left backdrop-blur-xl overflow-hidden"
                style={{ top: y, left: x }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                    <div className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-50 truncate">
                        Ações: {lead.businessName}
                    </div>
                </div>

                <div className="p-1.5 space-y-0.5">
                    <div className="relative">
                        <button
                            onClick={() => setShowTagSelector(true)}
                            className="w-full text-left px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-primary hover:bg-white/5 rounded-xl flex items-center justify-between group transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <Icons.Tag size={16} className="text-primary" />
                                Gerenciar Tags
                            </div>
                            <Icons.ChevronRight size={14} className="text-text-secondary opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </button>

                        {/* Tag Selector Popover anchored here */}
                        <div className="absolute left-full top-0 ml-2">
                            <TagSelectorPopover
                                isOpen={showTagSelector}
                                onClose={() => setShowTagSelector(false)}
                                tagDefinitions={tagDefinitions}
                                tagAssignments={tagAssignments as any}
                                onToggleTag={handleToggleTag}
                                onCreateTag={onAddTag}
                                onDeleteTag={onDeleteTagDef || (() => { })}
                                tagColors={TAG_COLORS}
                            />
                        </div>
                    </div>

                    <div className="px-4 pb-3 pt-1 flex flex-wrap gap-1.5 opacity-80">
                        {currentTags.slice(0, 3).map(tag => {
                            const tagDef = tagDefinitions.find(d => d.name === tag);
                            return (
                                <span
                                    key={tag}
                                    className="text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider text-white border border-white/5"
                                    style={{ backgroundColor: tagDef?.color || 'rgba(255,255,255,0.05)' }}
                                >
                                    {tag}
                                </span>
                            );
                        })}
                        {currentTags.length > 3 && (
                            <span className="text-[9px] text-text-secondary font-black self-center tracking-widest opacity-40">
                                +{currentTags.length - 3}
                            </span>
                        )}
                    </div>


                    <button
                        onClick={() => { onEdit(); onClose(); }}
                        className="w-full text-left px-4 py-3 text-[11px] font-black uppercase tracking-wider text-text-primary hover:bg-white/5 rounded-xl flex items-center gap-3 transition-all"
                    >
                        <Icons.Edit size={16} className="text-blue-400" />
                        Editar Lead
                    </button>
                    <div className="h-px bg-white/5 mx-4 my-2" />
                    <button
                        onClick={() => { onDelete(); onClose(); }}
                        className="w-full text-left px-4 py-3 text-[11px] font-black uppercase tracking-wider text-red-500 hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-all"
                    >
                        <Icons.Trash2 size={16} />
                        Excluir Lead
                    </button>
                </div>
            </div>

            {/* Backdrop for closing main context menu if clicking outside */}
            <div className="fixed inset-0 z-40" onClick={onClose} />
        </>
    );
};
