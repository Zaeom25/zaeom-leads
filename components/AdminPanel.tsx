import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from './Icons';
import { Profile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBranding } from '../contexts/BrandingContext';
import { translateError } from '../utils/errorTranslations';
import { sanitizeUrl } from '../utils/urlUtils';

export const AdminPanel: React.FC = () => {
    const { addToast } = useToast();
    const { user: currentUser, profile: currentProfile } = useAuth();
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviting, setInviting] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'users' | 'branding' | 'config'>('users');

    // Branding State
    const { logoUrl, faviconUrl, siteName: contextSiteName, siteDescription: contextSiteDescription, refreshBranding } = useBranding();
    const [siteName, setSiteName] = useState('');
    const [siteDescription, setSiteDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [isSavingBranding, setIsSavingBranding] = useState(false);

    useEffect(() => {
        if (contextSiteName) setSiteName(contextSiteName);
        if (contextSiteDescription) setSiteDescription(contextSiteDescription);
    }, [contextSiteName, contextSiteDescription]);

    // Credit Adjustment State
    const [isAdjustCreditsOpen, setIsAdjustCreditsOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [adjustSearchAmount, setAdjustSearchAmount] = useState(0);
    const [adjustEnrichAmount, setAdjustEnrichAmount] = useState(0);
    const [isSavingCredits, setIsSavingCredits] = useState(false);

    // API Config State
    const [apiKeys, setApiKeys] = useState({
        serper: '',
        groq: '',
        firecrawl: '',
        gemini: ''
    });
    const [showKey, setShowKey] = useState<Record<string, boolean>>({});
    const [savingKeys, setSavingKeys] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchApiKeys();
    }, []);

    const fetchApiKeys = async () => {
        try {
            const { data } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'api_keys')
                .single();

            if (data?.value) {
                setApiKeys(data.value as any);
            }
        } catch (error) {
            console.error('Error fetching API keys:', error);
        }
    };

    const handleSaveApiKeys = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingKeys(true);
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    key: 'api_keys',
                    value: apiKeys,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;
            addToast('Chaves API atualizadas com sucesso!', 'success');
        } catch (error) {
            console.error('Error saving API keys:', error);
            addToast('Erro ao salvar as chaves.', 'error');
        } finally {
            setSavingKeys(false);
        }
    };

    const fetchUsers = async () => {
        // Fetch profiles with their organization data
        const { data } = await supabase
            .from('profiles')
            .select('*, organizations(search_credits, enrich_credits)')
            .order('created_at', { ascending: false });

        if (data) setUsers(data as any[]);
        setLoading(false);
    };

    const handleAddCredits = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser?.organization_id) return;

        setIsSavingCredits(true);
        try {
            const { error } = await supabase.rpc('add_credits', {
                org_id_p: selectedUser.organization_id,
                search_amount: adjustSearchAmount,
                enrich_amount: adjustEnrichAmount
            });

            if (error) throw error;

            addToast(`Créditos adicionados com sucesso para ${selectedUser.name || selectedUser.email}!`, 'success');
            setIsAdjustCreditsOpen(false);
            setAdjustSearchAmount(0);
            setAdjustEnrichAmount(0);
            fetchUsers();
        } catch (error) {
            console.error('Error adding credits:', error);
            addToast('Erro ao adicionar créditos.', 'error');
        } finally {
            setIsSavingCredits(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setInviting(true);
        try {
            const { error } = await supabase.functions.invoke('invite-user', {
                body: {
                    email: inviteEmail,
                    name: inviteName,
                    organizationId: currentProfile?.organization_id
                }
            });

            if (error) {
                console.error(error);
                throw new Error('Falha ao enviar convite');
            }

            addToast(`Convite enviado para ${inviteEmail}!`, 'success');
            setInviteEmail('');
            setInviteName('');
            setIsInviteOpen(false);
            fetchUsers();
            // Wait a bit and refresh users? The user won't exist in 'profiles' until they login unless we insert a placeholder?
            // Actually standard invites create a user in auth.users, but our triggers only run on INSERT.
            // So the user won't appear in 'profiles' until they accept the invite and "Sign Up" effectively happens.
            // But we can manually refresh to see if anything changed.
        } catch (err) {
            addToast(translateError(err), 'error');
        } finally {
            setInviting(false);
        }
    };

    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    const handleToggleRole = async (targetUser: Profile) => {
        setMenuOpen(null);
        if (targetUser.id === (await supabase.auth.getUser()).data.user?.id) {
            addToast('Você não pode alterar seu próprio cargo.', 'error');
            return;
        }

        const newRole = targetUser.role === 'admin' ? 'seller' : 'admin';
        const actionName = newRole === 'admin' ? 'promovido a Master' : 'rebaixado a Vendedor';

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', targetUser.id);

            if (error) throw error;

            addToast(`${targetUser.name || 'Usuário'} foi ${actionName}!`, 'success');
            fetchUsers();
        } catch (error) {
            console.error('Error updating role:', error);
            addToast('Erro ao atualizar cargo.', 'error');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setMenuOpen(null);
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (userId === currentUser?.id) {
            addToast('Você não pode se excluir!', 'error');
            return;
        }

        if (!window.confirm('Tem certeza? O usuário perderá o acesso imediatamente.')) return;

        try {
            // Note: Deleting from profiles does NOT delete from auth.users (requires service role).
            // But deleting from profiles effectively deactivates them in the app view.
            // A better approach for full cleanup requires an Edge Function with Service Role.
            // For now, removing from profiles "hides" them and breaks their foreign key links if CASCADE is not set,
            // or if CASCADE is set, deletes their leads. 
            // Let's assume we WANT to strip access.
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            addToast('Usuário removido com sucesso.', 'success');
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            addToast('Erro ao remover usuário.', 'error');
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        const allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            addToast('Apenas SVG, PNG ou JPG são permitidos.', 'error');
            return;
        }

        setUploading(true);
        try {
            // 1. Get current branding settings First
            const { data: currentSettings } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'branding')
                .single();

            const currentBranding = (currentSettings?.value as any) || {};

            // 2. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `logo-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('Zaeom Leads - Bucket')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('Zaeom Leads - Bucket')
                .getPublicUrl(filePath);

            // 3. Upsert Settings Table (using upsert ensures row creation if missing)
            const { error: updateError } = await supabase
                .from('settings')
                .upsert({
                    key: 'branding',
                    value: { ...currentBranding, logo_url: publicUrl },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (updateError) throw updateError;

            addToast('Logo atualizado com sucesso!', 'success');
            await refreshBranding();
        } catch (error) {
            console.error('Error uploading logo:', error);
            addToast(translateError(error), 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        const allowedTypes = ['image/x-icon', 'image/png', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.ico')) {
            addToast('Apenas ICO, PNG ou SVG são permitidos.', 'error');
            return;
        }

        setUploading(true);
        try {
            // 1. Get current branding settings First
            const { data: currentSettings } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'branding')
                .single();

            const currentBranding = (currentSettings?.value as any) || {};

            // 2. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `favicon-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `favicons/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('Zaeom Leads - Bucket')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('Zaeom Leads - Bucket')
                .getPublicUrl(filePath);

            // 3. Upsert Settings Table
            const { error: updateError } = await supabase
                .from('settings')
                .upsert({
                    key: 'branding',
                    value: { ...currentBranding, favicon_url: publicUrl },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (updateError) throw updateError;

            addToast('Favicon atualizado com sucesso!', 'success');
            await refreshBranding();
        } catch (error) {
            console.error('Error uploading favicon:', error);
            addToast(translateError(error), 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveLogo = async () => {
        if (!window.confirm('Deseja remover o logo e usar o padrão?')) return;

        setUploading(true);
        try {
            const { data: currentSettings } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'branding')
                .single();

            const currentBranding = (currentSettings?.value as any) || {};

            const { error } = await supabase
                .from('settings')
                .upsert({
                    key: 'branding',
                    value: { ...currentBranding, logo_url: null },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;

            addToast('Logo removido.', 'success');
            await refreshBranding();
        } catch (error) {
            console.error('Error removing logo:', error);
            addToast(translateError(error), 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveFavicon = async () => {
        if (!window.confirm('Deseja remover o favicon e usar o padrão?')) return;

        setUploading(true);
        try {
            const { data: currentSettings } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'branding')
                .single();

            const currentBranding = (currentSettings?.value as any) || {};

            const { error } = await supabase
                .from('settings')
                .upsert({
                    key: 'branding',
                    value: { ...currentBranding, favicon_url: null },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;

            addToast('Favicon removido.', 'success');
            await refreshBranding();
        } catch (error) {
            console.error('Error removing favicon:', error);
            addToast(translateError(error), 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveTextBranding = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingBranding(true);
        try {
            const { data: currentSettings } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'branding')
                .single();

            const currentBranding = (currentSettings?.value as any) || {};

            const { error } = await supabase
                .from('settings')
                .upsert({
                    key: 'branding',
                    value: {
                        ...currentBranding,
                        site_name: siteName,
                        site_description: siteDescription
                    },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;

            addToast('Identidade da plataforma atualizada!', 'success');
            await refreshBranding();
        } catch (error) {
            console.error('Error saving text branding:', error);
            addToast(translateError(error), 'error');
        } finally {
            setIsSavingBranding(false);
        }
    };

    return (
        <div className="h-full max-w-5xl mx-auto flex flex-col animate-fade-in pb-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-text-primary flex items-center gap-3 tracking-tight uppercase">
                        <Icons.Settings className="text-primary" strokeWidth={3} />
                        Painel Admin
                    </h1>
                    <p className="text-sm font-medium text-text-secondary opacity-70">Configurações globais e gestão de equipe do ecossistema Zaeom</p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] rounded-[0.8rem] transition-all duration-300 ${activeTab === 'users' ? 'bg-gradient-cta text-background-main shadow-lg shadow-primary/20 scale-105' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                    >
                        Usuários
                    </button>
                    <button
                        onClick={() => setActiveTab('branding')}
                        className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] rounded-[0.8rem] transition-all duration-300 ${activeTab === 'branding' ? 'bg-gradient-cta text-background-main shadow-lg shadow-primary/20 scale-105' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                    >
                        Branding
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] rounded-[0.8rem] transition-all duration-300 ${activeTab === 'config' ? 'bg-gradient-cta text-background-main shadow-lg shadow-primary/20 scale-105' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                    >
                        Configurações
                    </button>
                </div>
            </div>

            {activeTab === 'users' ? (
                <>
                    <div className="flex justify-end mb-8">
                        <button
                            onClick={() => setIsInviteOpen(true)}
                            className="btn-primary px-6 py-4 rounded-xl group"
                        >
                            <Icons.Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" strokeWidth={3} />
                            <span>Convidar Vendedor</span>
                        </button>
                    </div>

                    {isInviteOpen && (
                        <div className="mb-10 bg-white/5 backdrop-blur-md p-8 rounded-[2rem] border-2 border-white/5 animate-slide-up relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-cta opacity-50" />
                            <h3 className="font-black text-text-primary mb-6 uppercase tracking-wider text-sm flex items-center gap-2">
                                <Icons.Mail size={18} className="text-primary" />
                                Enviar Novo Convite
                            </h3>
                            <form onSubmit={handleInvite} className="flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="group/input">
                                        <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Nome do Vendedor</label>
                                        <input
                                            type="text"
                                            required
                                            value={inviteName}
                                            onChange={e => setInviteName(e.target.value)}
                                            className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-white/5 bg-background-card/50 text-text-primary focus:border-primary/50 focus:bg-background-card outline-none transition-all text-sm font-bold placeholder:text-text-secondary/30 shadow-inner"
                                            placeholder="Nome completo"
                                        />
                                    </div>

                                    <div className="group/input">
                                        <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Email do Vendedor</label>
                                        <input
                                            type="email"
                                            required
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-white/5 bg-background-card/50 text-text-primary focus:border-primary/50 focus:bg-background-card outline-none transition-all text-sm font-bold placeholder:text-text-secondary/30 shadow-inner"
                                            placeholder="email@exemplo.com"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsInviteOpen(false)}
                                        className="btn-secondary px-8 py-3 rounded-xl"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        disabled={inviting}
                                        type="submit"
                                        className="btn-primary px-8 py-3 rounded-xl disabled:opacity-30 disabled:translate-y-0"
                                    >
                                        {inviting ? <Icons.Loader2 className="animate-spin" size={16} strokeWidth={3} /> : (
                                            <>
                                                <Icons.Mail size={16} strokeWidth={3} />
                                                ENVIAR CONVITE
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-background-card rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 flex-1 overflow-hidden backdrop-blur-xl">
                        <div className="overflow-x-auto overflow-y-visible min-h-[500px]">
                            <table className="w-full text-left">
                                <thead className="bg-white/[0.03] border-b border-white/5">
                                    <tr>
                                        <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] opacity-50">Usuário</th>
                                        <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] opacity-50">E-mail</th>
                                        <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] opacity-50">Função</th>
                                        <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] opacity-50">Acessos</th>
                                        <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] opacity-50">Status</th>
                                        <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] opacity-50 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-5">
                                                <div className="font-bold text-text-primary uppercase tracking-wider text-[11px] mb-0.5">{user.name || 'Nome Pendente'}</div>
                                                <div className="text-[9px] text-text-secondary font-bold uppercase tracking-widest opacity-40">Membro da Equipe</div>
                                            </td>
                                            <td className="p-5 text-text-secondary text-[11px] font-medium opacity-60">{user.email}</td>
                                            <td className="p-5">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.1em] ${user.role === 'admin'
                                                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(57,242,101,0.1)]'
                                                    : 'bg-white/5 text-text-secondary border border-white/10'
                                                    }`}>
                                                    {user.role === 'admin' ? 'Master' : 'Vendedor'}
                                                </span>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-text-primary">{(user as any).organizations?.search_credits ?? 0}</span>
                                                        <span className="text-[8px] font-bold text-text-secondary uppercase tracking-widest opacity-30">Busca</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-text-primary">{(user as any).organizations?.enrich_credits ?? 0}</span>
                                                        <span className="text-[8px] font-bold text-text-secondary uppercase tracking-widest opacity-30">IA</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.1em] text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/20 w-fit">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#39F265]"></span>
                                                    Ativo
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {currentUser?.id !== user.id && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                                                            className="btn-icon"
                                                        >
                                                            <Icons.MoreVertical size={18} />
                                                        </button>

                                                        {menuOpen === user.id && (
                                                            <div className="absolute right-0 mt-3 w-64 bg-background-card rounded-[1.5rem] shadow-2xl border border-white/10 z-50 animate-fade-in overflow-hidden backdrop-blur-xl">
                                                                <div className="p-2 space-y-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedUser(user);
                                                                            setIsAdjustCreditsOpen(true);
                                                                            setMenuOpen(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-text-secondary hover:bg-primary/10 hover:text-primary flex items-center gap-3 transition-all rounded-xl"
                                                                    >
                                                                        <Icons.Zap size={16} /> Adicionar Créditos
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleToggleRole(user)}
                                                                        className="w-full text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-text-secondary hover:bg-primary/10 hover:text-primary flex items-center gap-3 transition-all rounded-xl"
                                                                    >
                                                                        {user.role === 'admin' ? (
                                                                            <><Icons.UserMinus size={16} /> Rebaixar para Vendedor</>
                                                                        ) : (
                                                                            <><Icons.ShieldCheck size={16} /> Promover a Master</>
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteUser(user.id)}
                                                                        className="w-full text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-all rounded-xl border-t border-white/5 mt-1"
                                                                    >
                                                                        <Icons.Trash2 size={16} /> Remover Usuário
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-text-secondary">
                                                Nenhum usuário encontrado (além de você).
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : activeTab === 'branding' ? (
                <div className="bg-background-card rounded-[2.5rem] shadow-sm border border-white/10 p-10 animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="max-w-3xl relative z-10">
                        <h2 className="text-2xl font-black text-text-primary mb-2 uppercase tracking-tight">Identidade Visual</h2>
                        <p className="text-text-secondary mb-12 text-sm font-medium opacity-60">Personalize a aparência do ecossistema com a sua marca própria e metadados.</p>

                        <div className="space-y-12">
                            {/* Text Settings Section */}
                            <form onSubmit={handleSaveTextBranding} className="space-y-6 pb-10 border-b-2 border-white/5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="group/input">
                                        <label className="block text-[10px] font-black text-text-secondary mb-3 uppercase tracking-[0.2em] opacity-70 ml-1">Nome da Plataforma</label>
                                        <div className="relative">
                                            <Icons.Layout className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-30" size={18} />
                                            <input
                                                type="text"
                                                value={siteName}
                                                onChange={e => setSiteName(e.target.value)}
                                                className="w-full pl-14 pr-5 py-4 rounded-2xl border-2 border-white/5 bg-background-card/50 text-text-primary focus:border-primary/50 focus:bg-background-card outline-none transition-all text-sm font-bold placeholder:text-text-secondary/20 shadow-inner"
                                                placeholder="Ex: LumoLeads"
                                            />
                                        </div>
                                    </div>
                                    <div className="group/input">
                                        <label className="block text-[10px] font-black text-text-secondary mb-3 uppercase tracking-[0.2em] opacity-70 ml-1">Descrição SEO (Meta Tag)</label>
                                        <div className="relative">
                                            <Icons.FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-30" size={18} />
                                            <input
                                                type="text"
                                                value={siteDescription}
                                                onChange={e => setSiteDescription(e.target.value)}
                                                className="w-full pl-14 pr-5 py-4 rounded-2xl border-2 border-white/5 bg-background-card/50 text-text-primary focus:border-primary/50 focus:bg-background-card outline-none transition-all text-sm font-bold placeholder:text-text-secondary/20 shadow-inner"
                                                placeholder="Ex: Gestão Inteligente de Leads"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingBranding}
                                        className="btn-primary px-6 py-3 rounded-xl text-xs"
                                    >
                                        {isSavingBranding ? <Icons.Loader2 className="animate-spin" size={14} /> : <Icons.Save size={14} strokeWidth={3} />}
                                        <span>Salvar Identidade</span>
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-text-secondary mb-4 uppercase tracking-[0.2em] opacity-70">Logotipo da Plataforma</label>
                                    <div className="flex items-start gap-8">
                                        <div className="w-40 h-40 bg-white/5 rounded-[2rem] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative group">
                                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            {logoUrl ? (
                                                <img src={sanitizeUrl(logoUrl)} alt="Preview" className="max-w-full max-h-full object-contain p-4 relative z-10" />
                                            ) : (
                                                <div className="text-center p-4 relative z-10">
                                                    <Icons.Sparkles className="mx-auto text-primary/30 mb-3" size={32} strokeWidth={1} />
                                                    <span className="text-[9px] text-text-secondary font-black uppercase tracking-widest opacity-40">Logo Padrão</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-5">
                                            <div className="flex gap-4">
                                                <label className="cursor-pointer btn-primary px-5 py-3 rounded-xl">
                                                    {uploading ? <Icons.Loader2 className="animate-spin" size={14} /> : <Icons.Plus size={14} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />}
                                                    <span>Subir Logo</span>
                                                    <input type="file" className="hidden" accept=".svg,.png,.jpg,.jpeg" onChange={handleLogoUpload} disabled={uploading} />
                                                </label>
                                                {logoUrl && (
                                                    <button
                                                        onClick={handleRemoveLogo}
                                                        disabled={uploading}
                                                        className="btn-secondary px-6 py-4 rounded-[1.25rem] border-2 border-red-500/10 text-red-500/60 hover:text-red-500 hover:bg-red-500/5"
                                                    >
                                                        <Icons.Trash2 size={16} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
                                                        <span>Remover</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div className="pt-10 border-t-2 border-white/5">
                                    <label className="block text-[10px] font-black text-text-secondary mb-4 uppercase tracking-[0.2em] opacity-70">Favicon do Site</label>
                                    <div className="flex items-start gap-8">
                                        <div className="w-24 h-24 bg-white/5 rounded-[1.5rem] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative group">
                                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            {faviconUrl ? (
                                                <img src={sanitizeUrl(faviconUrl)} alt="Favicon Preview" className="w-10 h-10 object-contain relative z-10" />
                                            ) : (
                                                <Icons.Target className="text-primary/30" size={24} strokeWidth={1} />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-6">
                                            <div className="flex gap-4">
                                                <label className="cursor-pointer btn-primary px-5 py-3 rounded-xl">
                                                    {uploading ? <Icons.Loader2 className="animate-spin" size={14} strokeWidth={3} /> : <Icons.Plus size={14} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />}
                                                    <span>Novo Favicon</span>
                                                    <input type="file" className="hidden" accept=".ico,.png,.svg" onChange={handleFaviconUpload} disabled={uploading} />
                                                </label>
                                                {faviconUrl && (
                                                    <button
                                                        onClick={handleRemoveFavicon}
                                                        disabled={uploading}
                                                        className="btn-secondary px-6 py-4 rounded-[1.25rem] border-2 border-red-500/10 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 group"
                                                    >
                                                        <Icons.Trash2 size={16} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
                                                        <span>Remover</span>
                                                    </button>
                                                )}
                                            </div>
                                            <div className="p-5 bg-white/[0.03] border-2 border-white/5 rounded-2xl relative overflow-hidden group/tip">
                                                <h4 className="text-[10px] font-black text-text-primary mb-3 flex items-center gap-2 uppercase tracking-[0.15em]">
                                                    <Icons.Info size={16} strokeWidth={3} className="text-primary" /> Dica Técnica
                                                </h4>
                                                <ul className="text-[11px] text-text-secondary space-y-2 list-none font-medium leading-relaxed opacity-80">
                                                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-primary rounded-full" /> Formatos aceitos: <strong>ICO, PNG ou SVG</strong>.</li>
                                                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-primary rounded-full" /> Tamanho recomendado: <strong>32x32 pixels</strong>.</li>
                                                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-primary rounded-full" /> Este ícone aparece na aba do navegador.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-background-card rounded-[2.5rem] shadow-sm border border-white/10 p-10 animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="max-w-2xl relative z-10">
                        <h2 className="text-2xl font-black text-text-primary mb-2 uppercase tracking-tight">Configurações de API</h2>
                        <p className="text-text-secondary mb-12 text-sm font-medium opacity-60">Gerencie as chaves de acesso aos serviços de inteligência e busca do ecossistema.</p>

                        <form onSubmit={handleSaveApiKeys} className="space-y-8">
                            <div className="grid grid-cols-1 gap-8">
                                {/* Serper Key */}
                                <div className="group/input">
                                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-3 ml-1 opacity-70">Serper.dev (Google Search)</label>
                                    <div className="relative">
                                        <Icons.Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary opacity-30" size={18} />
                                        <input
                                            type={showKey.serper ? 'text' : 'password'}
                                            value={apiKeys.serper}
                                            onChange={e => setApiKeys({ ...apiKeys, serper: e.target.value })}
                                            className="w-full pl-14 pr-14 py-4 rounded-2xl border-2 border-white/5 bg-background-card/50 text-text-primary focus:border-primary/50 focus:bg-background-card outline-none transition-all text-sm font-bold placeholder:text-text-secondary/20 shadow-inner"
                                            placeholder="Insira sua chave Serper..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowKey({ ...showKey, serper: !showKey.serper })}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
                                        >
                                            {showKey.serper ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Groq Key */}
                                <div className="group/input">
                                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-3 ml-1 opacity-70">Groq SDK (LLM Acceleration)</label>
                                    <div className="relative">
                                        <Icons.Zap className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-30" size={18} />
                                        <input
                                            type={showKey.groq ? 'text' : 'password'}
                                            value={apiKeys.groq}
                                            onChange={e => setApiKeys({ ...apiKeys, groq: e.target.value })}
                                            className="w-full pl-14 pr-14 py-4 rounded-2xl border-2 border-white/5 bg-background-card/50 text-text-primary focus:border-primary/50 focus:bg-background-card outline-none transition-all text-sm font-bold placeholder:text-text-secondary/20 shadow-inner"
                                            placeholder="Insira sua chave Groq..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowKey({ ...showKey, groq: !showKey.groq })}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
                                        >
                                            {showKey.groq ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Firecrawl Key */}
                                <div className="group/input">
                                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-3 ml-1 opacity-70">Firecrawl (Web Scraping)</label>
                                    <div className="relative">
                                        <Icons.Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary opacity-30" size={18} />
                                        <input
                                            type={showKey.firecrawl ? 'text' : 'password'}
                                            value={apiKeys.firecrawl}
                                            onChange={e => setApiKeys({ ...apiKeys, firecrawl: e.target.value })}
                                            className="w-full pl-14 pr-14 py-4 rounded-2xl border-2 border-white/5 bg-background-card/50 text-text-primary focus:border-primary/50 focus:bg-background-card outline-none transition-all text-sm font-bold placeholder:text-text-secondary/20 shadow-inner"
                                            placeholder="Insira sua chave Firecrawl..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowKey({ ...showKey, firecrawl: !showKey.firecrawl })}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
                                        >
                                            {showKey.firecrawl ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={savingKeys}
                                    className="btn-primary px-8 py-4 rounded-xl group min-w-[180px]"
                                >
                                    {savingKeys ? <Icons.Loader2 className="animate-spin" size={16} /> : <Icons.Save size={16} className="group-hover:scale-110 transition-transform" strokeWidth={3} />}
                                    <span>Salvar Configurações</span>
                                </button>
                            </div>

                            <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-[2rem] flex items-start gap-4">
                                <Icons.ShieldCheck className="text-primary mt-1 shrink-0" size={24} strokeWidth={2.5} />
                                <div>
                                    <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-1">Rotatividade de Segurança</h4>
                                    <p className="text-[11px] text-text-secondary leading-relaxed font-medium opacity-80">
                                        Estas chaves são armazenadas de forma centralizada. Ao alterá-las aqui, todos os serviços do sistema serão atualizados instantaneamente. Recomenda-se a troca periódica para manter a integridade operacional.
                                    </p>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAdjustCreditsOpen && selectedUser && (
                <div className="fixed inset-0 bg-background-main/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsAdjustCreditsOpen(false)}>
                    <div className="bg-background-card rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border-2 border-white/10 animate-slide-up relative" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-cta rounded-full opacity-50" />
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-text-primary uppercase tracking-tight">Gestão de Créditos</h3>
                                <p className="text-[10px] font-bold text-text-secondary mt-1 uppercase tracking-widest opacity-60">{selectedUser.name || selectedUser.email}</p>
                            </div>
                            <button onClick={() => setIsAdjustCreditsOpen(false)} className="btn-icon !bg-transparent border-transparent">
                                <Icons.X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddCredits} className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3 group/input">
                                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Créditos Busca</label>
                                    <div className="relative">
                                        <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50 group-focus-within/input:text-primary group-focus-within/input:opacity-100 transition-all font-bold" size={18} />
                                        <input
                                            type="number"
                                            value={adjustSearchAmount}
                                            onChange={e => setAdjustSearchAmount(parseInt(e.target.value) || 0)}
                                            className="w-full pl-12 pr-4 py-3 bg-background-card/50 border-2 border-white/5 rounded-2xl focus:border-primary/50 focus:bg-background-card outline-none transition-all text-text-primary font-bold shadow-inner text-base"
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest opacity-40 ml-1">Quantidade a somar</p>
                                </div>

                                <div className="space-y-3 group/input">
                                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Créditos IA</label>
                                    <div className="relative">
                                        <Icons.Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50 group-focus-within/input:opacity-100 transition-all" size={18} strokeWidth={3} />
                                        <input
                                            type="number"
                                            value={adjustEnrichAmount}
                                            onChange={e => setAdjustEnrichAmount(parseInt(e.target.value) || 0)}
                                            className="w-full pl-12 pr-4 py-3 bg-background-card/50 border-2 border-white/5 rounded-2xl focus:border-primary/50 focus:bg-background-card outline-none transition-all text-text-primary font-bold shadow-inner text-base"
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest opacity-40 ml-1">Enriquecimento</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSavingCredits || (adjustSearchAmount === 0 && adjustEnrichAmount === 0)}
                                className="w-full py-4 btn-primary rounded-xl disabled:opacity-30 disabled:translate-y-0 shadow-none group"
                            >
                                {isSavingCredits ? (
                                    <>
                                        <Icons.Loader2 className="animate-spin" size={18} />
                                        <span>Processando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icons.CheckCircle2 size={18} className="group-hover:rotate-12 transition-transform" strokeWidth={3} />
                                        <span>Liberar Créditos</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
