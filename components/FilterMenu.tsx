import React from 'react';
import { Filter } from 'lucide-react';
import { Icons } from './Icons';

interface FilterMenuProps {
    isOpen: boolean;
    onClose: () => void;
    availableTags: string[];
    selectedTags: string[];
    availableLocations: string[];
    selectedLocations: string[];
    selectedSources: string[];

    // New Props for Specialties
    availableSpecialties: string[];
    selectedSpecialties: string[];
    onSpecialtyChange: (specialty: string) => void;

    onTagChange: (tag: string) => void;
    onLocationChange: (location: string) => void;
    onSourceChange: (source: string) => void;
    onClear: () => void;
}

export function FilterMenu({
    isOpen,
    onClose,
    availableTags,
    selectedTags,
    availableLocations,
    selectedLocations,
    selectedSources,

    availableSpecialties,
    selectedSpecialties,
    onSpecialtyChange,

    onTagChange,
    onLocationChange,
    onSourceChange,
    onClear
}: FilterMenuProps) {
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="absolute top-12 right-0 z-50 w-80 bg-background-card/95 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col"
        >
            <div className="max-h-[80vh] overflow-y-auto custom-scrollbar p-6">
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-background-card/50 backdrop-blur-md py-2 -mt-2 border-b border-white/5">
                    <h3 className="text-xs font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                        <Filter size={14} className="text-primary" strokeWidth={3} />
                        Filtros
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/5 rounded-xl transition-all text-text-secondary hover:text-text-primary"
                    >
                        <Icons.X size={16} strokeWidth={3} />
                    </button>
                </div>

                {/* Origem */}
                <div className="mb-8">
                    <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40 mb-4">
                        Origem
                    </h4>
                    <div className="space-y-3">
                        {[
                            { id: 'manual', label: 'Manual' },
                            { id: 'inbound', label: 'Inbound' },
                            { id: 'outbound', label: 'Outbound' },
                            { id: 'ai_finder', label: 'AI Finder' }
                        ].map((source) => (
                            <label
                                key={source.id}
                                className="flex items-center gap-4 cursor-pointer group"
                            >
                                <div className={`
                w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all
                ${selectedSources.includes(source.id)
                                        ? 'bg-primary border-primary shadow-lg shadow-primary/20'
                                        : 'border-white/10 group-hover:border-primary/50 bg-white/5'}
              `}>
                                    {selectedSources.includes(source.id) && (
                                        <svg className="w-3 h-3 text-background-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={selectedSources.includes(source.id)}
                                    onChange={() => onSourceChange(source.id)}
                                    className="hidden"
                                />
                                <span className={`text-sm font-bold transition-colors ${selectedSources.includes(source.id) ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>{source.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Specialties */}
                {availableSpecialties.length > 0 && (
                    <div className="mb-8">
                        <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40 mb-4">
                            Especialidades
                        </h4>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {availableSpecialties.map((specialty) => (
                                <label
                                    key={specialty}
                                    className="flex items-center gap-4 cursor-pointer group"
                                >
                                    <div className={`
                 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0
                 ${selectedSpecialties.includes(specialty)
                                            ? 'bg-primary border-primary shadow-lg shadow-primary/20'
                                            : 'border-white/10 group-hover:border-primary/50 bg-white/5'}
               `}>
                                        {selectedSpecialties.includes(specialty) && (
                                            <svg className="w-3 h-3 text-background-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={selectedSpecialties.includes(specialty)}
                                        onChange={() => onSpecialtyChange(specialty)}
                                        className="hidden"
                                    />
                                    <span className={`text-sm font-bold truncate transition-colors ${selectedSpecialties.includes(specialty) ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>{specialty}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Locations */}
                {availableLocations.length > 0 && (
                    <div className="mb-8">
                        <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40 mb-4">
                            Cidades
                        </h4>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {availableLocations.map((location) => (
                                <label
                                    key={location}
                                    className="flex items-center gap-4 cursor-pointer group"
                                >
                                    <div className={`
                 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0
                 ${selectedLocations.includes(location)
                                            ? 'bg-primary border-primary shadow-lg shadow-primary/20'
                                            : 'border-white/10 group-hover:border-primary/50 bg-white/5'}
               `}>
                                        {selectedLocations.includes(location) && (
                                            <svg className="w-3 h-3 text-background-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={selectedLocations.includes(location)}
                                        onChange={() => onLocationChange(location)}
                                        className="hidden"
                                    />
                                    <span className={`text-sm font-bold truncate transition-colors ${selectedLocations.includes(location) ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>{location}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tags */}
                {availableTags.length > 0 && (
                    <div className="mb-8">
                        <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40 mb-4">
                            Tags
                        </h4>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {availableTags.map((tag) => (
                                <label
                                    key={tag}
                                    className="flex items-center gap-4 cursor-pointer group"
                                >
                                    <div className={`
                 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0
                 ${selectedTags.includes(tag)
                                            ? 'bg-primary border-primary shadow-lg shadow-primary/20'
                                            : 'border-white/10 group-hover:border-primary/50 bg-white/5'}
               `}>
                                        {selectedTags.includes(tag) && (
                                            <svg className="w-3 h-3 text-background-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={selectedTags.includes(tag)}
                                        onChange={() => onTagChange(tag)}
                                        className="hidden"
                                    />
                                    <span className={`text-sm font-bold truncate transition-colors ${selectedTags.includes(tag) ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>{tag}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="pt-6 border-t border-white/5">
                    <button
                        onClick={onClear}
                        className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary hover:text-red-500 hover:bg-red-500/10 py-3 rounded-2xl transition-all border border-transparent hover:border-red-500/20"
                    >
                        Limpar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
}
