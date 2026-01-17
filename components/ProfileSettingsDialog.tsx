
import React, { useState, useRef } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

import { useToast } from '../contexts/ToastContext';
import { translateError } from '../utils/errorTranslations';
import { useScrollLock } from '../hooks/useScrollLock';
import { sanitizeUrl } from '../utils/urlUtils';

export const ProfileSettingsDialog: React.FC<ProfileSettingsDialogProps> = ({ isOpen, onClose }) => {
    useScrollLock(isOpen);
    const { user, profile, signOut, refreshProfile } = useAuth();
    const { addToast } = useToast();
    const { theme, setTheme } = useTheme();
    const [name, setName] = useState(profile?.name || '');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [view, setView] = useState<'profile' | 'password'>('profile');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync state with profile changes if needed
    React.useEffect(() => {
        if (profile?.name) setName(profile.name);
    }, [profile]);

    const handleSignOut = async () => {
        try {
            await signOut();
            onClose();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ name })
                .eq('id', user?.id);

            if (error) throw error;

            await refreshProfile();
            addToast('Perfil atualizado!', 'success');
            onClose();
        } catch (error) {
            console.error('Error updating profile:', error);
            addToast(translateError(error), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user?.id);

            if (updateError) {
                throw updateError;
            }

            await refreshProfile();
            addToast('Foto de perfil atualizada!', 'success');

        } catch (error) {
            console.error('Error uploading avatar:', error);
            addToast(translateError(error), 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast('As senhas não coincidem.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            addToast('A senha deve ter pelo menos 6 caracteres.', 'error');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            addToast('Senha alterada com sucesso!', 'success');
            setView('profile');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Error updating password:', error);
            addToast(translateError(error), 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-main/80 backdrop-blur-md" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-background-card rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/10 overflow-hidden flex flex-col relative"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-cta rounded-full opacity-50" />
                    <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1.5 ml-0.5 opacity-80">Configurações</h4>
                                    <h2 className="text-3xl font-black text-text-primary tracking-tight">
                                        {view === 'profile' ? 'Meu Perfil' : 'Alterar Senha'}
                                    </h2>
                                </div>
                                <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-text-secondary hover:text-text-primary border border-white/5 group">
                                    <Icons.X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            {view === 'profile' ? (
                                <>
                                    <div className="flex flex-col items-center mb-10">
                                        <div
                                            className="relative group cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="w-32 h-32 rounded-full p-1.5 bg-gradient-cta group-hover:scale-105 transition-transform duration-500 shadow-lg shadow-primary/20">
                                                <div className="w-full h-full rounded-full overflow-hidden bg-background-card border-4 border-background-card relative ring-2 ring-white/5">
                                                    {uploading ? (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md text-white">
                                                            <Icons.Loader2 className="animate-spin text-primary" />
                                                        </div>
                                                    ) : profile?.avatar_url ? (
                                                        <img src={sanitizeUrl(profile.avatar_url)} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                                                    ) : (
                                                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-text-secondary text-4xl font-black">
                                                            {profile?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full">
                                                        <Icons.Camera className="text-white transform scale-90 group-hover:scale-100 transition-transform" size={28} />
                                                    </div>
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleAvatarUpload}
                                                className="hidden"
                                                accept="image/*"
                                            />
                                            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-background-card shadow-2xl border border-white/10 flex items-center justify-center text-primary group-hover:rotate-12 transition-transform ring-2 ring-primary/20">
                                                <Icons.Edit3 size={16} />
                                            </div>
                                        </div>
                                        <p className="mt-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-60">Clique para alterar a foto</p>
                                    </div>

                                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="group/input relative">
                                                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Nome Completo</label>
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full px-5 py-4 rounded-[2rem] border-2 border-white/5 bg-white/5 text-text-primary font-bold focus:border-primary/50 focus:bg-white/10 outline-none transition-all placeholder:text-text-secondary/30 sm:text-sm shadow-inner"
                                                    placeholder="Seu nome"
                                                />
                                            </div>

                                            <div className="relative opacity-60 group/disabled">
                                                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Email (Protegido)</label>
                                                <div className="w-full px-5 py-4 rounded-[2rem] border-2 border-white/5 bg-white/5 text-text-secondary/50 font-bold sm:text-sm flex items-center gap-3 cursor-not-allowed">
                                                    <Icons.Mail size={16} className="text-text-secondary/30" />
                                                    {user?.email || ''}
                                                </div>
                                            </div>
                                        </div>



                                        <div>
                                            <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-4 ml-1 opacity-70">Tema da Interface</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { id: 'light', label: 'Claro', icon: Icons.Sun },
                                                    { id: 'dark', label: 'Escuro', icon: Icons.Moon },
                                                    { id: 'system', label: 'Sistema', icon: Icons.Monitor }
                                                ].map((t) => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => setTheme(t.id as any)}
                                                        className={`group relative flex flex-col items-center gap-2.5 p-4 rounded-[1.5rem] border-2 transition-all duration-300 ${theme === t.id
                                                            ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                                                            : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <div className={`p-2.5 rounded-xl transition-all duration-300 ${theme === t.id ? 'bg-primary text-background-main scale-110' : 'bg-white/5 text-text-secondary group-hover:text-text-primary'}`}>
                                                            <t.icon size={20} />
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${theme === t.id ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>{t.label}</span>
                                                        {theme === t.id && (
                                                            <motion.div
                                                                layoutId="theme-active"
                                                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary border-4 border-background-card flex items-center justify-center text-background-main"
                                                            >
                                                                <Icons.Check size={10} strokeWidth={4} />
                                                            </motion.div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-4 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setView('password')}
                                                className="flex-1 py-4 px-6 rounded-[1.5rem] border-2 border-white/5 text-text-secondary text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/5 hover:text-text-primary transition-all flex items-center justify-center gap-2.5 group/btn"
                                            >
                                                <Icons.Key size={14} className="text-text-secondary group-hover/btn:text-primary transition-colors" />
                                                Senha
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSignOut}
                                                className="flex-1 py-4 px-6 rounded-[1.5rem] border-2 border-red-500/10 text-red-500/80 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/5 hover:text-red-500 transition-all flex items-center justify-center gap-2.5 group/btn"
                                            >
                                                <Icons.LogOut size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                                Sair
                                            </button>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-5 px-8 rounded-[1.5rem] bg-gradient-cta text-background-main text-[11px] font-black uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group/save"
                                        >
                                            {loading ? <Icons.Loader2 className="animate-spin" size={20} /> : (
                                                <>
                                                    <span>Salvar Alterações</span>
                                                    <Icons.ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <form onSubmit={handleUpdatePassword} className="space-y-6">
                                    <div className="p-5 rounded-[1.5rem] bg-primary/5 border border-primary/10 text-primary/90 text-xs font-bold leading-relaxed flex gap-4 backdrop-blur-sm">
                                        <Icons.ShieldAlert className="shrink-0 mt-0.5 text-primary" size={18} />
                                        <span>Escolha uma senha forte com pelo menos 6 caracteres para garantir a segurança da sua conta.</span>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="group/input relative">
                                            <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Nova Senha</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full px-5 py-4 rounded-[2rem] border-2 border-white/5 bg-white/5 text-text-primary font-bold focus:border-primary/50 focus:bg-white/10 outline-none transition-all pr-14 text-sm shadow-inner"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-text-secondary hover:text-text-primary transition-colors"
                                                >
                                                    {showPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="group/input relative">
                                            <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Confirmar Senha</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    required
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full px-5 py-4 rounded-[2rem] border-2 border-white/5 bg-white/5 text-text-primary font-bold focus:border-primary/50 focus:bg-white/10 outline-none transition-all pr-14 text-sm shadow-inner"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-text-secondary hover:text-text-primary transition-colors"
                                                >
                                                    {showConfirmPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setView('profile')}
                                            className="flex-1 py-5 px-6 rounded-[1.5rem] border-2 border-white/5 text-text-secondary font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 hover:text-text-primary transition-all"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-[2] py-5 px-8 rounded-[1.5rem] bg-gradient-cta text-background-main font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group/save"
                                        >
                                            {loading ? <Icons.Loader2 className="animate-spin" size={20} /> : (
                                                <>
                                                    <span>Confirmar</span>
                                                    <Icons.CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
