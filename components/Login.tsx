import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './Icons';
import { useBranding } from '../contexts/BrandingContext';
import { translateError } from '../utils/errorTranslations';
import { sanitizeUrl } from '../utils/urlUtils';

export const Login: React.FC = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [isForgot, setIsForgot] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [otp, setOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [imageError, setImageError] = useState(false);
    const { signIn, signUp, verifyOtp, resendOtp, resetPassword, signInWithGoogle } = useAuth();
    const { logoUrl, siteName, loading: brandingLoading } = useBranding();

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const { error } = await signInWithGoogle();
            if (error) throw error;
        } catch (err: any) {
            setError(translateError(err));
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (isForgot) {
                const { error } = await resetPassword(email);
                if (error) throw error;
                setSuccessMsg('Email de recuperação enviado! Verifique sua caixa de entrada.');
            } else if (isRegister) {
                const { error, data } = await signUp(email, password, { full_name: fullName.trim() });
                if (error) throw error;
                if (data?.user?.identities?.length === 0) {
                    setError('Este email já está cadastrado. Tente fazer login.');
                } else {
                    setSuccessMsg('Conta criada! Enviamos um código de 6 dígitos para o seu email.');
                    setIsVerifying(true);
                }
            } else {
                const { error } = await signIn(email, password);
                if (error) throw error;
            }
        } catch (err: any) {
            setError(translateError(err));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await verifyOtp(email, otp);
            if (error) throw error;
        } catch (err: any) {
            setError(translateError(err));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-main flex items-center justify-center p-4 transition-colors relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="w-full max-w-md bg-background-card rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 p-10 animate-fade-in transition-all backdrop-blur-xl relative z-10">
                <div className="text-center mb-10">
                    {brandingLoading ? (
                        <div className="w-20 h-20 bg-white/5 rounded-[1.5rem] mx-auto animate-pulse mb-8" />
                    ) : (logoUrl && !imageError) ? (
                        <div className="mb-8">
                            <img
                                src={sanitizeUrl(logoUrl)}
                                alt="Logo"
                                onError={() => setImageError(true)}
                                className="max-h-16 mx-auto object-contain"
                            />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-gradient-cta rounded-[1.5rem] mx-auto flex items-center justify-center shadow-xl shadow-primary/20 mb-8 transform -rotate-6 group hover:rotate-0 transition-transform duration-500">
                            <Icons.Sparkles className="text-background-main w-10 h-10" strokeWidth={3} />
                        </div>
                    )}
                    <h2 className="text-2xl font-black text-text-primary mt-4 uppercase tracking-tight">
                        {isVerifying ? 'Verifique seu Email' : isForgot ? 'Recuperar Senha' : isRegister ? 'Criar sua Conta' : 'Acesse sua Conta'}
                    </h2>
                    <p className="text-[10px] font-black text-text-secondary mt-3 uppercase tracking-[0.2em] opacity-40">
                        {isVerifying ? `Código enviado para ${email}` : isForgot ? 'Informe seu email para recuperação' : isRegister ? 'Comece sua jornada hoje' : `Bem-vindo ao ecossistema ${siteName}`}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] mb-8 flex items-center gap-3 border border-red-500/20">
                        <Icons.AlertCircle size={18} strokeWidth={3} />
                        {error}
                    </div>
                )}

                {successMsg && !isVerifying && (
                    <div className="bg-primary/10 text-primary p-4 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] mb-8 flex items-center gap-3 border border-primary/20">
                        <Icons.CheckCircle2 size={18} strokeWidth={3} />
                        {successMsg}
                    </div>
                )}

                {isVerifying ? (
                    <form onSubmit={handleOtpSubmit} className="space-y-8">
                        <div>
                            <label className="block text-[10px] font-black text-text-secondary uppercase mb-4 text-center tracking-[0.2em] opacity-50">Código de Verificação</label>
                            <input
                                type="text"
                                maxLength={8}
                                required
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                className="w-full text-center text-4xl font-black tracking-[0.3em] py-5 rounded-2xl border-2 border-white/10 focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none bg-white/5 text-text-primary transition-all uppercase placeholder:text-white/5"
                                placeholder="000000"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.length < 6}
                            className="w-full py-5 bg-gradient-cta text-background-main rounded-xl font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_10px_30px_rgba(57,242,101,0.2)] hover:shadow-primary/40 hover:-translate-y-1 transition-all disabled:opacity-30 disabled:translate-y-0 flex items-center justify-center gap-2"
                        >
                            {loading ? <Icons.Loader2 className="animate-spin" size={18} strokeWidth={3} /> : 'CONFIRMAR E ENTRAR'}
                        </button>

                        <div className="flex flex-col gap-4">
                            <button
                                type="button"
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const { error } = await resendOtp(email);
                                        if (error) throw error;
                                        setSuccessMsg('Código reenviado com sucesso!');
                                    } catch (err: any) {
                                        setError(translateError(err));
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                className="text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:glow-text-primary transition-all disabled:opacity-30"
                            >
                                Reenviar Código
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsVerifying(false)}
                                className="text-text-secondary text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
                            >
                                Voltar para Cadastro
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-8">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full py-4 bg-white/5 text-text-primary border-2 border-white/5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all flex items-center justify-center gap-4 relative group disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 4.63c1.61 0 3.06.56 4.23 1.68l3.18-3.18C17.46 1.14 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            CONTINUAR COM GOOGLE
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t-2 border-white/5"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-background-card px-6 text-[9px] font-black uppercase tracking-[0.3em] text-text-secondary opacity-30">ou e-mail</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {isRegister && (
                                <div className="animate-fade-in text-left">
                                    <label className="block text-[9px] font-black text-text-secondary uppercase mb-2 tracking-[0.2em] opacity-50">Nome Completo</label>
                                    <div className="relative">
                                        <Icons.User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-40" size={18} strokeWidth={3} />
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-white/5 focus:border-primary/30 focus:ring-8 focus:ring-primary/5 outline-none bg-white/[0.03] text-text-primary transition-all font-bold placeholder:opacity-20"
                                            placeholder="Ex: João Silva"
                                        />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-[9px] font-black text-text-secondary uppercase mb-2 tracking-[0.2em] opacity-50">Email Institucional</label>
                                <div className="relative">
                                    <Icons.Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-40" size={18} strokeWidth={3} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-white/5 focus:border-primary/30 focus:ring-8 focus:ring-primary/5 outline-none bg-white/[0.03] text-text-primary transition-all font-bold placeholder:opacity-20"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>

                            {!isForgot && (
                                <div>
                                    <label className="block text-[9px] font-black text-text-secondary uppercase mb-2 tracking-[0.2em] opacity-50 flex justify-between">
                                        Senha de Acesso
                                        {!isRegister && (
                                            <button
                                                type="button"
                                                onClick={() => setIsForgot(true)}
                                                className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 hover:text-primary transition-all duration-300 hover:scale-105"
                                            >
                                                Esqueci a senha
                                            </button>
                                        )}
                                    </label>
                                    <div className="relative">
                                        <Icons.Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-40" size={18} strokeWidth={3} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-14 py-4 rounded-2xl border-2 border-white/5 focus:border-primary/30 focus:ring-8 focus:ring-primary/5 outline-none bg-white/[0.03] text-text-primary transition-all font-bold placeholder:opacity-20"
                                            placeholder="••••••••"
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-primary hover:bg-primary/10 transition-all duration-300"
                                        >
                                            {showPassword ? <Icons.EyeOff size={16} strokeWidth={3} /> : <Icons.Eye size={16} strokeWidth={3} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 btn-primary rounded-[1.5rem] disabled:opacity-30 disabled:translate-y-0 mt-6"
                            >
                                {loading ? (
                                    <Icons.Loader2 className="animate-spin" size={18} strokeWidth={3} />
                                ) : isForgot ? (
                                    <span>ENVIAR LINK DE RECUPERAÇÃO</span>
                                ) : isRegister ? (
                                    <span>CRIAR CONTA GRATUITA</span>
                                ) : (
                                    <span>ENTRAR NA PLATAFORMA</span>
                                )}
                            </button>

                            <div className="text-center mt-8">
                                {isForgot ? (
                                    <button
                                        type="button"
                                        onClick={() => { setIsForgot(false); setSuccessMsg(''); setError(''); }}
                                        className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary hover:text-text-primary transition-colors opacity-60 hover:opacity-100"
                                    >
                                        Voltar para Login
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => { setIsRegister(!isRegister); setError(''); setSuccessMsg(''); }}
                                        className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary opacity-60 hover:opacity-100 transition-all duration-300 hover:scale-105"
                                    >
                                        {isRegister ? (
                                            <>Já tem uma conta? <span className="text-primary">Faça login</span></>
                                        ) : (
                                            <>Não tem conta? <span className="text-primary">Cadastre-se grátis</span></>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
