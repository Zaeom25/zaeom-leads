import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Icons } from './Icons';
import { CATEGORIES } from '../types';
import { fetchMunicipios } from '../services/locationService';

interface SearchPanelProps {
  onSearch: (niche: string, location: string) => void;
  isLoading: boolean;
  progress?: number;
  status?: string;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, isLoading, progress = 0, status = '' }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customNiche, setCustomNiche] = useState('');
  const [location, setLocation] = useState('');

  // Autocomplete State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleLocationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocation(value);

    if (value.length >= 3) {
      const cities = await fetchMunicipios(value);
      setSuggestions(cities);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectCity = (city: string) => {
    setLocation(city);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const selected = CATEGORIES.find(c => c.id === selectedCategory);
    const niche = selectedCategory === 'outro' ? customNiche : (selected?.term || selected?.label || '');
    if (niche && location) {
      onSearch(niche, location);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto fade-in">
      <div className="text-center mb-10 md:mb-14 relative z-10">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-text-primary mb-6 max-w-4xl mx-auto [text-wrap:balance]">
          Localize hoje mesmo seus próximos <span className="text-gradient">clientes ideais</span>
        </h1>

        <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed [text-wrap:balance]">
          Use inteligência artificial de ponta para localizar, qualificar e enriquecer seus leads em poucos segundos.
        </p>
      </div>

      <div className="glass-panel rounded-3xl p-6 md:p-8 relative overflow-visible transition-all duration-300 hover:shadow-glow/20">

        <form onSubmit={handleSearch} className="flex flex-col gap-6">

          {/* Grid Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* NICHE SELECTOR */}
            <div className="relative group">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">
                1. O que você procura?
              </label>

              {/* Category Dropdown */}
              <div className="mb-3 relative group/select">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-4 pr-10 py-4 rounded-xl border border-white/10 bg-white/5 text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                  disabled={isLoading}
                >
                  <option value="" disabled>Selecione um nicho...</option>

                  {/* Grouped Categories */}
                  <optgroup label="Saúde e Bem-Estar">
                    {CATEGORIES.filter(c => c.group === 'Saúde e Bem-Estar').map(category => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </optgroup>

                  <optgroup label="Serviços Profissionais">
                    {CATEGORIES.filter(c => c.group === 'Serviços Profissionais').map(category => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </optgroup>

                  <optgroup label="Casa e Construção">
                    {CATEGORIES.filter(c => c.group === 'Casa e Construção').map(category => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </optgroup>

                  <optgroup label="Gastronomia e Comércio">
                    {CATEGORIES.filter(c => c.group === 'Gastronomia e Comércio').map(category => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </optgroup>

                  <optgroup label="Outros">
                    {CATEGORIES.filter(c => c.group === 'Outros').map(category => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </optgroup>
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-text-secondary group-focus-within/select:text-primary transition-colors">
                  <Icons.ChevronDown className="h-5 w-5" />
                </div>
              </div>

              {/* Custom Niche Input (Conditional) */}
              {selectedCategory === 'outro' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <input
                    type="text"
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                    placeholder="Digite o nicho específico..."
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-white/20"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* LOCATION SELECTOR */}
            <div className="relative group">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">
                2. Onde procurar?
              </label>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icons.MapPin className="h-5 w-5 text-text-secondary group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={handleLocationChange}
                    onFocus={() => location.length >= 3 && setShowSuggestions(true)}
                    placeholder="Ex: São Paulo"
                    className="w-full pl-10 pr-4 py-4 rounded-xl border border-white/10 bg-white/5 text-text-primary placeholder-white/20 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-background-card rounded-xl shadow-xl border border-white/10 max-h-60 overflow-y-auto animate-fade-in custom-scrollbar">
                  {suggestions.map((city, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectCity(city)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 text-text-primary hover:text-primary text-sm transition-colors border-b border-white/5 last:border-0 flex items-center gap-2"
                    >
                      <Icons.MapPin size={14} className="text-text-secondary" />
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SEARCH BUTTON & PROGRESS */}
          <div className="space-y-4">
            <button
              type="submit"
              disabled={isLoading || !selectedCategory || !location}
              className={`w-full py-5 btn-primary rounded-[2rem] text-xs md:text-sm flex items-center justify-center gap-3 group/search ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {isLoading ? (
                <>
                  <Icons.Loader2 className="animate-spin" size={24} strokeWidth={3} />
                  <span>PROCESSANDO...</span>
                </>
              ) : (
                <>
                  <Icons.Search className="group-hover/search:scale-110 group-hover/search:rotate-12 transition-transform" size={24} strokeWidth={3} />
                  BUSCAR LEADS QUALIFICADOS
                </>
              )}
            </button>

            {isLoading && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest mb-1">
                      Status da IA
                    </span>
                    <span className="text-sm font-medium text-text-primary animate-pulse">
                      {status}
                    </span>
                  </div>
                  <span className="text-sm font-black text-text-secondary">
                    {Math.round(progress)}%
                  </span>
                </div>

                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear" }}
                    className="h-full bg-gradient-cta rounded-full shadow-[0_0_15px_rgba(57,242,101,0.5)]"
                  />
                </div>

                <p className="mt-3 text-[10px] text-center text-text-secondary italic">
                  Isso pode levar alguns segundos enquanto nossa IA varre a web por links e perfis...
                </p>
              </div>
            )}
          </div>

        </form>
      </div>

      {!isLoading && (
        <div className="mt-6 text-center text-text-secondary text-sm flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
          <span className="flex items-center gap-2 whitespace-nowrap"><Icons.CheckCircle2 size={16} className="text-primary" /> Dados atualizados via Google Maps</span>
          <span className="flex items-center gap-2 whitespace-nowrap"><Icons.CheckCircle2 size={16} className="text-primary" /> Enriquecimento com IA</span>
        </div>
      )}
    </div>
  );
};