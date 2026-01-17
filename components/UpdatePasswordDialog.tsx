import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './Icons';
import { translateError } from '../utils/errorTranslations';

import { useToast } from '../contexts/ToastContext';

export const UpdatePasswordDialog: React.FC = () => {
    const { addToast } = useToast();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { updatePassword } = useAuth();
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        setLoading(true);
        setError('');

        try {

            const { data, error } = await updatePassword(password);


            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } catch (err: any) {
            console.error('Erro detalhado:', err);
            // Alert specifically for the user to see the error
            const userMsg = translateError(err);
            addToast(userMsg, 'error');
            setError(userMsg);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
                <div className="bg-background-card border border-white/10 rounded-3xl p-8 max-w-md w-full text-center animate-fade-in shadow-2xl">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20">
                        <Icons.CheckCircle2 className="text-primary w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-text-primary mb-2 uppercase tracking-tighter">Senha Atualizada!</h2>
                    <p className="text-text-secondary">Você já pode usar sua nova senha.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
            <div className="bg-background-card rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in border border-white/10">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                        <Icons.Lock className="text-primary w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black text-text-primary uppercase tracking-tighter">Definir Nova Senha</h2>
                    <p className="text-text-secondary text-sm">Digite sua nova senha de acesso.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div>
                        <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 ml-1">Nova Senha</label>
                        <div className="relative">
                            <Icons.Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className={`w-full pl-12 pr-12 py-3.5 bg-white/5 rounded-2xl border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary/50'} outline-none transition-all text-text-primary placeholder:text-text-secondary/30`}
                                placeholder="Mínimo 6 caracteres"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors focus:outline-none"
                            >
                                {showPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 ml-1">Confirmar Senha</label>
                        <div className="relative">
                            <Icons.Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className={`w-full pl-12 pr-12 py-3.5 bg-white/5 rounded-2xl border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary/50'} outline-none transition-all text-text-primary placeholder:text-text-secondary/30`}
                                placeholder="Repita a nova senha"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors focus:outline-none"
                            >
                                {showConfirmPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                            </button>
                        </div>
                        {error && (
                            <p className="text-red-400 text-xs mt-3 font-bold flex items-center gap-1.5 animate-fade-in px-1">
                                <Icons.AlertCircle size={14} />
                                {error}
                            </p>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-cta text-background-main rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/20 hover:brightness-110 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Icons.Loader2 className="animate-spin" /> : 'Atualizar Senha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
