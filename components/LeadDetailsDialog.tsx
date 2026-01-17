import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Lead, LeadStatus, LeadComment, Checklist, ChecklistItem, Attachment, TagDefinition, TagAssignment } from '../types';
import { Icons } from './Icons';
import { TagSelectorPopover } from './TagSelectorPopover';
import { ChecklistNamePopover } from './ChecklistNamePopover';
import { formatPhone, getWhatsAppLink, isWhatsAppValid } from '../utils/phoneUtils';
import { sanitizeUrl } from '../utils/urlUtils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useScrollLock } from '../hooks/useScrollLock';
import DOMPurify from 'dompurify';

interface LeadDetailsDialogProps {
    lead: Lead;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedLead: Lead) => void;
    onDelete: (id: string) => void;
    onEnrich: (id: string) => Promise<void>;
    profilesMap: Record<string, string>;
    tagDefinitions?: TagDefinition[];
    currentUser?: { id: string; name: string; avatar_url?: string };
    onAddTag?: (tagName: string, tagColor?: string) => void;
    onRemoveTag?: (tagName: string) => void;
    onDeleteTagDef?: (tagId: string) => void;
    onEditTag?: (tagId: string, name: string, color: string) => void;
}

const TAG_COLORS = [
    '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'
];

export const LeadDetailsDialog: React.FC<LeadDetailsDialogProps> = ({
    lead, isOpen, onClose, onUpdate, onDelete, onEnrich, profilesMap, tagDefinitions,
    currentUser,
    onAddTag,
    onRemoveTag,
    onDeleteTagDef,
    onEditTag
}) => {
    useScrollLock(isOpen);
    const { role } = useAuth();
    const [description, setDescription] = useState(lead.description || '');
    const [tempDescription, setTempDescription] = useState(lead.description || '');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [isSavingDescription, setIsSavingDescription] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isEnriching, setIsEnriching] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Phone management state
    const [isEditingPhones, setIsEditingPhones] = useState(false);
    const [tempPhoneNumber, setTempPhoneNumber] = useState(lead.phoneNumber || '');
    const [tempAdditionalPhones, setTempAdditionalPhones] = useState<string[]>(lead.additional_phones || []);
    const [isSavingPhones, setIsSavingPhones] = useState(false);

    // Social Media State
    const [isEditingSocials, setIsEditingSocials] = useState(false);
    const [tempInstagram, setTempInstagram] = useState(lead.instagram || '');
    const [tempFacebook, setTempFacebook] = useState(lead.facebook || '');
    const [tempLinkedin, setTempLinkedin] = useState(lead.linkedin || '');
    const [isEditingWebsite, setIsEditingWebsite] = useState(false);
    const [tempWebsite, setTempWebsite] = useState(lead.website || '');
    const [isSavingSocials, setIsSavingSocials] = useState(false);

    // Trello-style state
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isFetchingTrelloData, setIsFetchingTrelloData] = useState(false);
    const [showTagManager, setShowTagManager] = useState(false);
    const [showChecklistName, setShowChecklistName] = useState(false);
    const [newChecklistTitle, setNewChecklistTitle] = useState('');
    const mountTimeRef = useRef<number>(Date.now());

    // Inline Editing State
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState(lead.businessName);
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [tempCategory, setTempCategory] = useState(lead.category);
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [tempLocation, setTempLocation] = useState(lead.location);
    const [tempGoogleMapsUri, setTempGoogleMapsUri] = useState(lead.googleMapsUri || '');
    const [isSavingHeader, setIsSavingHeader] = useState(false);

    useEffect(() => {
        mountTimeRef.current = Date.now();
    }, [isOpen, lead.id]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            fetchTrelloData();
        }
    }, [isOpen, lead.id]);

    const fetchTrelloData = async () => {
        setIsFetchingTrelloData(true);
        try {
            // Fetch Checklists
            const { data: checklistsData, error: checklistsError } = await supabase
                .from('lead_checklists')
                .select(`
                    *,
                    items:lead_checklist_items(*)
                `)
                .eq('lead_id', lead.id)
                .order('order_index');

            if (checklistsError) throw checklistsError;
            setChecklists(checklistsData || []);

            // Fetch Attachments
            const { data: attachmentsData, error: attachmentsError } = await supabase
                .from('lead_attachments')
                .select('*')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: false });

            if (attachmentsError) throw attachmentsError;
            setAttachments(attachmentsData || []);

        } catch (error) {
            console.error('Error fetching trello data:', error);
        } finally {
            setIsFetchingTrelloData(false);
        }
    };

    const handleAddChecklist = async (title: string = 'Checklist') => {
        const { data, error } = await supabase
            .from('lead_checklists')
            .insert([{
                lead_id: lead.id,
                title: title,
                order_index: checklists.length
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding checklist:', error);
        } else {
            setChecklists([...checklists, { ...data, items: [] }]);
            setNewChecklistTitle('');
        }
    };

    const handleDeleteChecklist = async (checklistId: string) => {
        const { error } = await supabase
            .from('lead_checklists')
            .delete()
            .eq('id', checklistId);

        if (error) {
            console.error('Error deleting checklist:', error);
        } else {
            setChecklists(checklists.filter(c => c.id !== checklistId));
        }
    };

    const handleAddChecklistItem = async (checklistId: string, content: string) => {
        if (!content.trim()) return;

        const checklist = checklists.find(c => c.id === checklistId);
        if (!checklist) return;

        const { data, error } = await supabase
            .from('lead_checklist_items')
            .insert([{
                checklist_id: checklistId,
                content: content,
                order_index: checklist.items.length
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding item:', error);
        } else {
            setChecklists(checklists.map(c =>
                c.id === checklistId ? { ...c, items: [...c.items, data] } : c
            ));
        }
    };

    const handleToggleChecklistItem = async (checklistId: string, itemId: string, isCompleted: boolean) => {
        const { error } = await supabase
            .from('lead_checklist_items')
            .update({ is_completed: !isCompleted })
            .eq('id', itemId);

        if (error) {
            console.error('Error toggling item:', error);
        } else {
            setChecklists(checklists.map(c =>
                c.id === checklistId ? {
                    ...c,
                    items: c.items.map(i => i.id === itemId ? { ...i, is_completed: !isCompleted } : i)
                } : c
            ));
        }
    };

    const handleDeleteChecklistItem = async (checklistId: string, itemId: string) => {
        const { error } = await supabase
            .from('lead_checklist_items')
            .delete()
            .eq('id', itemId);

        if (error) {
            console.error('Error deleting item:', error);
        } else {
            setChecklists(checklists.map(c =>
                c.id === checklistId ? {
                    ...c,
                    items: c.items.filter(i => i.id !== itemId)
                } : c
            ));
        }
    };

    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert('O arquivo deve ter no máximo 5MB.');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Simulate progress since Supabase client doesn't support onUploadProgress directly for single files easily without XMLHttpRequest custom wrapper
            // or we accept a simple "indeterminate" loading state or a fake progress.
            // Let's do a fake smooth progress for UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 300);

            const fileExt = file.name.split('.').pop();
            const fileName = `${lead.id}/${crypto.randomUUID()}.${fileExt}`;
            const filePath = `lead-attachments/${fileName}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('lead-attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            clearInterval(progressInterval);
            setUploadProgress(100);

            // 2. Save to Database
            const { data, error: dbError } = await supabase
                .from('lead_attachments')
                .insert([{
                    lead_id: lead.id,
                    file_name: file.name,
                    file_path: filePath,
                    file_type: file.type,
                    file_size: file.size,
                    uploaded_by: currentUser.id
                }])
                .select()
                .single();

            if (dbError) throw dbError;

            setAttachments([data, ...attachments]);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Erro ao enviar arquivo.');
        } finally {
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
            }, 1000);
        }
    };

    const handleDeleteAttachment = async (attachment: Attachment) => {
        try {
            // 1. Delete from Storage
            const { error: storageError } = await supabase.storage
                .from('lead-attachments')
                .remove([attachment.file_path]);

            if (storageError) throw storageError;

            // 2. Delete from Database
            const { error: dbError } = await supabase
                .from('lead_attachments')
                .delete()
                .eq('id', attachment.id);

            if (dbError) throw dbError;

            setAttachments(attachments.filter(a => a.id !== attachment.id));
        } catch (error) {
            console.error('Error deleting attachment:', error);
        }
    };

    const handleUpdateDueDate = async (date: string) => {
        const { error } = await supabase
            .from('leads')
            .update({ due_date: date })
            .eq('id', lead.id);

        if (error) {
            console.error('Error updating due date:', error);
        } else {
            onUpdate({ ...lead, due_date: date });
        }
    };

    const handleCreateTagDefinition = async (name: string, color: string) => {
        if (onAddTag) onAddTag(name, color);
    };

    const handleDeleteTagDefinition = async (tagId: string) => {
        if (onDeleteTagDef) onDeleteTagDef(tagId);
    };

    const handleToggleTagAssignment = async (tag: TagDefinition) => {
        const isAssigned = (lead.tags || []).includes(tag.name);
        if (isAssigned) {
            if (onRemoveTag) onRemoveTag(tag.name);
        } else {
            if (onAddTag) onAddTag(tag.name, tag.color || '#94a3b8');
        }
    };

    useEffect(() => {
        setDescription(lead.description || '');
        setTempDescription(lead.description || '');
        setTempTitle(lead.businessName);
        setTempCategory(lead.category);
        setTempTitle(lead.businessName);
        setTempCategory(lead.category);
        setTempLocation(lead.location);
        setTempGoogleMapsUri(lead.googleMapsUri || '');
        setTempInstagram(lead.instagram || '');
        setTempFacebook(lead.facebook || '');
        setTempLinkedin(lead.linkedin || '');
        setTempWebsite(lead.website || '');
    }, [lead.description, lead.businessName, lead.category, lead.location, lead.googleMapsUri, lead.instagram, lead.facebook, lead.linkedin, lead.website]);

    const handleSaveTitle = async () => {
        if (tempTitle === lead.businessName) {
            setIsEditingTitle(false);
            return;
        }
        setIsSavingHeader(true);
        const { error } = await supabase.from('leads').update({ businessName: tempTitle }).eq('id', lead.id);
        if (error) {
            console.error('Error saving title:', error);
        } else {
            onUpdate({ ...lead, businessName: tempTitle });
            setIsEditingTitle(false);
        }
        setIsSavingHeader(false);
    };

    const handleSaveCategory = async () => {
        if (tempCategory === lead.category) {
            setIsEditingCategory(false);
            return;
        }
        setIsSavingHeader(true);
        const { error } = await supabase.from('leads').update({ category: tempCategory }).eq('id', lead.id);
        if (error) {
            console.error('Error saving category:', error);
        } else {
            onUpdate({ ...lead, category: tempCategory });
            setIsEditingCategory(false);
        }
        setIsSavingHeader(false);
    };

    const handleSaveLocation = async () => {
        setIsSavingHeader(true);
        const updates: any = {};
        if (tempLocation !== lead.location) updates.location = tempLocation;
        if (tempGoogleMapsUri !== lead.googleMapsUri) updates.googleMapsUri = tempGoogleMapsUri;

        if (Object.keys(updates).length === 0) {
            setIsEditingLocation(false);
            setIsSavingHeader(false);
            return;
        }

        const { error } = await supabase.from('leads').update(updates).eq('id', lead.id);
        if (error) {
            console.error('Error saving location:', error);
        } else {
            onUpdate({ ...lead, ...updates });
            setIsEditingLocation(false);
        }
        setIsSavingHeader(false);
    };

    const isEmptyHtml = (html: string) => {
        if (!html) return true;
        const stripped = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
        return stripped === '';
    };

    const handleSaveDescription = async () => {
        setIsSavingDescription(true);
        const { error } = await supabase
            .from('leads')
            .update({ description: tempDescription })
            .eq('id', lead.id);

        if (error) {
            console.error('Error saving description:', error);
        } else {
            onUpdate({ ...lead, description: tempDescription });
            setDescription(tempDescription);
            setIsEditingDescription(false);
        }
        setIsSavingDescription(false);
    };

    const handleCancelEdit = () => {
        setTempDescription(description);
        setIsEditingDescription(false);
    };

    const handleSavePhones = async () => {
        setIsSavingPhones(true);
        const updates = {
            phoneNumber: tempPhoneNumber,
            additional_phones: tempAdditionalPhones
        };

        const { error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', lead.id);

        if (error) {
            console.error('Error saving phones:', error);
        } else {
            onUpdate({ ...lead, ...updates });
            setIsEditingPhones(false);
        }
        setIsSavingPhones(false);
    };

    const handleCancelPhoneEdit = () => {
        setTempPhoneNumber(lead.phoneNumber || '');
        setTempAdditionalPhones(lead.additional_phones || []);
        setIsEditingPhones(false);
    };

    const handleAddAdditionalPhone = () => {
        setTempAdditionalPhones([...tempAdditionalPhones, '']);
    };

    const handleUpdateAdditionalPhone = (index: number, value: string) => {
        const newPhones = [...tempAdditionalPhones];
        newPhones[index] = value;
        setTempAdditionalPhones(newPhones);
    };

    const handleRemoveAdditionalPhone = (index: number) => {
        setTempAdditionalPhones(tempAdditionalPhones.filter((_, i) => i !== index));
    };

    const handleSaveSocials = async () => {
        setIsSavingSocials(true);
        const updates = {
            instagram: tempInstagram,
            facebook: tempFacebook,
            linkedin: tempLinkedin
        };

        const { error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', lead.id);

        if (error) {
            console.error('Error saving socials:', error);
        } else {
            onUpdate({ ...lead, ...updates });
            setIsEditingSocials(false);
        }
        setIsSavingSocials(false);
    };

    const handleCancelSocialsEdit = () => {
        setTempInstagram(lead.instagram || '');
        setTempFacebook(lead.facebook || '');
        setTempLinkedin(lead.linkedin || '');
        setIsEditingSocials(false);
    };

    const handleSaveWebsite = async () => {
        const { error } = await supabase.from('leads').update({ website: tempWebsite }).eq('id', lead.id);
        if (error) {
            console.error('Error saving website:', error);
        } else {
            onUpdate({ ...lead, website: tempWebsite });
            setIsEditingWebsite(false);
        }
    };

    const handleCancelWebsiteEdit = () => {
        setTempWebsite(lead.website || '');
        setIsEditingWebsite(false);
    };

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'clean']
        ],
    };

    const quillFormats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent',
        'link'
    ];

    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUser) return;

        setIsSubmittingComment(true);
        const comment: LeadComment = {
            id: crypto.randomUUID(),
            text: newComment,
            user_id: currentUser.id,
            user_name: currentUser.name,
            user_avatar: currentUser.avatar_url,
            created_at: new Date().toISOString()
        };

        const updatedComments = [...(lead.comments || []), comment];

        const { error } = await supabase
            .from('leads')
            .update({ comments: updatedComments })
            .eq('id', lead.id);

        if (error) {
            console.error('Error adding comment:', error);
        } else {
            onUpdate({ ...lead, comments: updatedComments });
            setNewComment('');
        }
        setIsSubmittingComment(false);
    };

    const handleDeleteComment = async (commentId: string) => {
        const updatedComments = (lead.comments || []).filter(c => c.id !== commentId);

        const { error } = await supabase
            .from('leads')
            .update({ comments: updatedComments })
            .eq('id', lead.id);

        if (error) {
            console.error('Error deleting comment:', error);
        } else {
            onUpdate({ ...lead, comments: updatedComments });
        }
    };

    const handleEnrichClick = async () => {
        setIsEnriching(true);
        await onEnrich(lead.id);
        setIsEnriching(false);
    };

    const tagColors = [
        '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background-main/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-background-card w-full max-w-5xl max-h-[92vh] rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden border border-white/10 backdrop-blur-3xl"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                        {/* Header */}
                        <div className="px-8 pt-8 pb-6 bg-background-card shrink-0">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(57,242,101,0.15)] shrink-0 mt-1 border-2 border-primary/20">
                                        <Icons.Briefcase size={24} strokeWidth={3} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1 min-h-[32px]">
                                            {isEditingTitle ? (
                                                <input
                                                    type="text"
                                                    value={tempTitle}
                                                    onChange={(e) => setTempTitle(e.target.value)}
                                                    onBlur={handleSaveTitle}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                                                    autoFocus
                                                    className="text-xl font-bold text-text-primary tracking-tight leading-tight w-full bg-transparent border-b-2 border-primary outline-none px-0 py-0"
                                                />
                                            ) : (
                                                <h1
                                                    onClick={() => setIsEditingTitle(true)}
                                                    className="text-xl font-bold text-text-primary tracking-tight leading-tight cursor-pointer hover:text-primary transition-colors flex items-center gap-2 group/title"
                                                    title="Clique para editar"
                                                >
                                                    {lead.businessName || lead.name}
                                                    <Icons.Edit2 size={14} className="opacity-0 group-hover/title:opacity-100 text-text-secondary" />
                                                </h1>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2">
                                            {isEditingCategory ? (
                                                <input
                                                    type="text"
                                                    value={tempCategory}
                                                    onChange={(e) => setTempCategory(e.target.value)}
                                                    onBlur={handleSaveCategory}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
                                                    autoFocus
                                                    className="uppercase tracking-wider text-[10px] font-black bg-white/5 border-2 border-primary px-2 py-0.5 rounded text-text-primary outline-none w-32"
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => setIsEditingCategory(true)}
                                                    className="uppercase tracking-wider text-[10px] font-bold bg-white/5 hover:bg-white/10 cursor-pointer px-2 py-0.5 rounded text-text-secondary flex items-center gap-1 group/cat transition-colors border border-white/10 max-w-[250px]"
                                                    title={lead.category || 'Sem Categoria'}
                                                >
                                                    <span className="truncate">{lead.category || 'Sem Categoria'}</span>
                                                    <div className="w-0 overflow-hidden group-hover/cat:w-auto transition-all duration-300 shrink-0">
                                                        <Icons.Edit2 size={8} className="ml-1" />
                                                    </div>
                                                </span>
                                            )}
                                            {/* Assigned Tags Inline */}
                                            <div className="flex flex-wrap gap-1">
                                                {(lead.tags || []).map((tagName) => {
                                                    const tagDef = tagDefinitions?.find(d => d.name === tagName);
                                                    if (!tagDef) return null;
                                                    return (
                                                        <div
                                                            key={`${lead.id}-${tagDef.id}`}
                                                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider border border-transparent"
                                                            style={{ backgroundColor: tagDef.color }}
                                                        >
                                                            {tagDef.name}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-all"
                                >
                                    <Icons.X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content Wrapper */}
                        <div className="flex-1 flex flex-col md:flex-row divide-x divide-white/5">
                            {/* Main Content (Left) */}
                            <div className="flex-1 p-8 pt-0 space-y-10 min-w-0 bg-background-main">
                                {/* Action Bar (Above Description) */}
                                <div className="flex items-center gap-2 mb-8 -mx-1 pt-4">
                                    <label className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm border border-white/10">
                                        <Icons.Paperclip size={14} />
                                        Anexar
                                        <input type="file" className="hidden" onChange={handleUploadAttachment} />
                                    </label>

                                    <div className="relative">
                                        <button
                                            onClick={() => setShowTagManager(!showTagManager)}
                                            className="px-2 md:px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm border border-white/10 whitespace-nowrap"
                                        >
                                            <Icons.Tag size={14} />
                                            Gerenciar Tags
                                        </button>

                                        <TagSelectorPopover
                                            isOpen={showTagManager}
                                            onClose={() => setShowTagManager(false)}
                                            tagDefinitions={tagDefinitions}
                                            tagAssignments={(lead.tags || []).map(tagName => ({
                                                tag: tagDefinitions?.find(d => d.name === tagName) || undefined,
                                                tag_id: tagDefinitions?.find(d => d.name === tagName)?.id || 'temp',
                                            })) as any}
                                            onToggleTag={handleToggleTagAssignment}
                                            onCreateTag={handleCreateTagDefinition}
                                            onDeleteTag={handleDeleteTagDefinition}
                                            onEditTag={onEditTag}
                                            tagColors={TAG_COLORS}
                                        />

                                        <ChecklistNamePopover
                                            isOpen={showChecklistName}
                                            onClose={() => setShowChecklistName(false)}
                                            onCreate={handleAddChecklist}
                                        />
                                    </div>

                                    <button
                                        onClick={() => setShowChecklistName(true)}
                                        className={`px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm border border-white/10 ${showChecklistName ? 'ring-2 ring-primary bg-primary/10 text-primary' : ''}`}
                                    >
                                        <Icons.CheckSquare size={14} />
                                        Checklist
                                    </button>
                                </div>

                                {/* Upload Progress Bar */}
                                <AnimatePresence>
                                    {isUploading && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mb-6 overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                                                    <Icons.Loader2 size={12} className="animate-spin text-primary" />
                                                    Enviando arquivo...
                                                </span>
                                                <span className="text-[10px] font-bold text-text-primary">{uploadProgress}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-primary rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${uploadProgress}%` }}
                                                    transition={{ duration: 0.2 }}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {/* Description Section */}
                                <section className="space-y-4">
                                    <h3 className="text-sm font-black text-text-primary uppercase tracking-tight flex items-center gap-2 mb-4">
                                        <Icons.AlignLeft size={16} className="text-primary" />
                                        Descrição
                                    </h3>

                                    {isEditingDescription ? (
                                        <div className="space-y-4">
                                            <div className="rounded-2xl border-2 border-white/5 overflow-hidden bg-white/5 shadow-xl shadow-black/20">
                                                <style>{`
                                                .ql-container { border: none !important; font-family: inherit; font-size: 0.95rem; }
                                                .ql-toolbar { border: none !important; border-bottom: 2px solid rgba(255,255,255,0.05) !important; padding: 12px !important; background: rgba(255,255,255,0.02); }
                                                .ql-editor { min-height: 250px; padding: 24px !important; line-height: 1.8; color: #FEFDFA; }
                                                .ql-editor.ql-blank::before { color: #A1A1A1; font-style: normal; left: 24px !important; }
                                                .ql-stroke { stroke: #A1A1A1 !important; transition: stroke 0.2s; }
                                                .ql-fill { fill: #A1A1A1 !important; transition: fill 0.2s; }
                                                .ql-picker { color: #A1A1A1 !important; }
                                                .ql-active .ql-stroke { stroke: #39F265 !important; }
                                                .ql-active .ql-fill { fill: #39F265 !important; }
                                                .ql-picker-label:hover .ql-stroke { stroke: #39F265 !important; }
                                            `}</style>
                                                <ReactQuill
                                                    theme="snow"
                                                    value={tempDescription}
                                                    onChange={setTempDescription}
                                                    placeholder="Adicione uma descrição detalhada aqui..."
                                                    modules={{
                                                        toolbar: [
                                                            [{ 'header': [1, 2, 3, false] }],
                                                            ['bold', 'italic', 'underline', 'strike'],
                                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                            ['link', 'blockquote', 'code-block'],
                                                            ['clean']
                                                        ],
                                                    }}
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={handleSaveDescription}
                                                    disabled={isSavingDescription}
                                                    className="px-8 py-3 bg-gradient-cta text-background-main rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(57,242,101,0.2)] hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-30"
                                                >
                                                    {isSavingDescription ? <Icons.Loader2 className="animate-spin mx-auto" size={16} strokeWidth={3} /> : 'SALVAR ALTERAÇÕES'}
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-8 py-3 bg-white/5 text-text-secondary rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-95 border-2 border-white/5"
                                                >
                                                    CANCELAR
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => {
                                                if (Date.now() - mountTimeRef.current < 300) return;
                                                setIsEditingDescription(true);
                                            }}
                                            className={`group relative p-8 rounded-2xl transition-all cursor-pointer border-2 border-transparent hover:border-primary/20 ${isEmptyHtml(description) ? 'bg-white/5 border-dashed border-white/10' : 'bg-white/5'}`}
                                        >
                                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-background-card rounded-lg shadow-sm border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                                                    <Icons.Edit size={12} />
                                                    Editar
                                                </div>
                                            </div>
                                            {isEmptyHtml(description) ? (
                                                <div className="py-8 text-center">
                                                    <Icons.AlignLeft size={32} className="mx-auto mb-3 text-white/10" />
                                                    <p className="text-text-secondary font-medium">Nenhuma descrição disponível. Clique para adicionar.</p>
                                                </div>
                                            ) : (
                                                <div className="ql-viewer prose prose-invert max-w-none">
                                                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }} className="text-text-secondary" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <style>{`
                                    .ql-viewer { color: #A1A1A1; line-height: 1.8; font-size: 0.95rem; }
                                    .ql-viewer p { margin-bottom: 1.25rem; }
                                    .ql-viewer h1 { font-size: 1.5rem; font-weight: 800; color: #FEFDFA; margin: 2rem 0 1rem; }
                                    .ql-viewer h2 { font-size: 1.25rem; font-weight: 800; color: #FEFDFA; margin: 1.75rem 0 0.875rem; }
                                    .ql-viewer ul, .ql-viewer ol { margin-bottom: 1.25rem; padding-left: 1.5rem; }
                                    .ql-viewer li { margin-bottom: 0.5rem; }
                                    .ql-viewer a { color: #39F265; text-decoration: underline; font-weight: 600; }
                                    .ql-viewer blockquote { border-left: 4px solid rgba(255,255,255,0.1); padding-left: 1rem; color: #A1A1A1; font-style: italic; }
                                `}</style>

                                    {/* Checklists Section */}
                                    <div className="mt-12 space-y-10">
                                        {checklists.map((checklist) => (
                                            <div key={checklist.id} className="space-y-6">
                                                <div className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                            <Icons.CheckSquare size={18} />
                                                        </div>
                                                        <h4 className="text-sm font-bold text-text-primary uppercase tracking-tight">
                                                            {checklist.title}
                                                        </h4>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteChecklist(checklist.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-2 text-text-secondary hover:text-red-400 transition-all rounded-lg hover:bg-white/5"
                                                    >
                                                        <Icons.Trash2 size={16} />
                                                    </button>
                                                </div>

                                                {/* Progress Bar */}
                                                {checklist.items.length > 0 && (
                                                    <div className="flex items-center gap-4 px-1">
                                                        <span className="text-[10px] font-bold text-text-secondary w-8">
                                                            {Math.round((checklist.items.filter(i => i.is_completed).length / checklist.items.length) * 100)}%
                                                        </span>
                                                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden shadow-inner">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{
                                                                    width: `${(checklist.items.filter(i => i.is_completed).length / checklist.items.length) * 100}%`
                                                                }}
                                                                className="h-full bg-gradient-cta shadow-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-1 px-1">
                                                    {checklist.items
                                                        .sort((a, b) => a.order_index - b.order_index)
                                                        .map((item) => (
                                                            <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group">
                                                                <button
                                                                    onClick={() => handleToggleChecklistItem(checklist.id, item.id, item.is_completed)}
                                                                    className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center
                                                                    ${item.is_completed
                                                                            ? 'bg-primary border-primary shadow-[0_0_10px_rgba(57,242,101,0.5)]'
                                                                            : 'border-white/10 bg-white/5 hover:border-primary/50'
                                                                        }`}
                                                                >
                                                                    {item.is_completed && <Icons.Check size={12} strokeWidth={3} className="text-background-main" />}
                                                                </button>
                                                                <span className={`text-sm flex-1 transition-all ${item.is_completed ? 'text-text-secondary/50 line-through' : 'text-text-secondary'}`}>
                                                                    {item.content}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleDeleteChecklistItem(checklist.id, item.id)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-text-secondary/30 hover:text-red-400 transition-all"
                                                                >
                                                                    <Icons.X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    <div className="pt-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Adicionar um item..."
                                                            className="w-full p-3 rounded-xl bg-white/5 border border-transparent hover:border-white/10 focus:bg-white/10 focus:border-primary/50 outline-none transition-all text-sm text-text-primary placeholder-text-secondary/50"
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleAddChecklistItem(checklist.id, (e.target as HTMLInputElement).value);
                                                                    (e.target as HTMLInputElement).value = '';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Attachments Section */}
                                    {attachments.length > 0 && (
                                        <div className="mt-12 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight flex items-center gap-2">
                                                    <Icons.Paperclip size={16} className="text-text-secondary" />
                                                    Anexos
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                {attachments.map((attachment) => (
                                                    <div key={attachment.id} className="group relative bg-white/5 rounded-2xl p-4 border border-white/5 hover:border-primary/20 hover:bg-white/10 transition-all shadow-sm">
                                                        <div className="flex gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm border border-primary/20">
                                                                {attachment.file_type.includes('image') ? (
                                                                    <Icons.Image size={24} />
                                                                ) : (
                                                                    <Icons.FileText size={24} />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-6">
                                                                <p className="text-xs font-bold text-text-primary truncate mb-1">
                                                                    {attachment.file_name}
                                                                </p>
                                                                <div className="flex items-center gap-3 text-[10px] text-text-secondary font-bold uppercase tracking-widest">
                                                                    <span>{(attachment.file_size / 1024 / 1024).toFixed(1)} MB</span>
                                                                    <span className="w-1 h-1 bg-white/10 rounded-full" />
                                                                    <span>{new Date(attachment.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => {
                                                                    const { data } = supabase.storage.from('lead-attachments').getPublicUrl(attachment.file_path);
                                                                    window.open(data.publicUrl, '_blank');
                                                                }}
                                                                className="p-1.5 bg-background-card shadow-md rounded-lg text-text-secondary hover:text-primary hover:scale-110 transition-all border border-white/10"
                                                            >
                                                                <Icons.ExternalLink size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteAttachment(attachment)}
                                                                className="p-1.5 bg-background-card shadow-md rounded-lg text-text-secondary hover:text-red-500 hover:scale-110 transition-all border border-white/10"
                                                            >
                                                                <Icons.X size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* Comments Section */}
                                <section>
                                    <h3 className="text-sm font-black text-text-primary uppercase tracking-tight flex items-center gap-2 mb-6">
                                        <Icons.MessageSquare size={16} className="text-primary" />
                                        Atividade e Comentários
                                    </h3>

                                    {/* Comment Input */}
                                    <div className="flex gap-4 mb-8">
                                        <div className="w-10 h-10 rounded-full bg-white/5 shrink-0 flex items-center justify-center font-bold text-text-secondary shadow-inner border border-white/10">
                                            {currentUser?.name?.slice(0, 1).toUpperCase()}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <textarea
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Escreva um comentário..."
                                                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-primary/50 outline-none transition-all text-text-primary min-h-[100px] text-sm resize-none shadow-sm placeholder-text-secondary/50"
                                            />
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={handleAddComment}
                                                    disabled={isSubmittingComment || !newComment.trim()}
                                                    className="px-8 py-3 bg-gradient-cta text-background-main rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(57,242,101,0.2)] hover:shadow-primary/40 hover:-translate-y-0.5 disabled:opacity-30 transition-all"
                                                >
                                                    {isSubmittingComment ? <Icons.Loader2 className="animate-spin" size={16} strokeWidth={3} /> : 'COMENTAR'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comment Thread */}
                                    <div className="space-y-6">
                                        {lead.comments && lead.comments.length > 0 ? (
                                            lead.comments
                                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                .map((comment) => (
                                                    <div key={comment.id} className="flex gap-4 group">
                                                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-background-main text-xs font-black shadow-lg shrink-0 ring-4 ring-background-card">
                                                            {comment.user_avatar ? (
                                                                <img src={sanitizeUrl(comment.user_avatar)} alt={comment.user_name} className="w-full h-full rounded-full object-cover" />
                                                            ) : (
                                                                comment.user_name.slice(0, 1).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="flex-1 space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-text-primary">{comment.user_name}</span>
                                                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                                                                    {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary/50 hover:text-red-500 transition-all rounded"
                                                                    title="Excluir comentário"
                                                                >
                                                                    <Icons.Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                            <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5 group-hover:border-white/10 transition-all shadow-sm">
                                                                <p className="text-sm text-text-secondary leading-relaxed font-medium">{comment.text}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                        ) : (
                                            <div className="text-center py-10 opacity-30 select-none">
                                                <Icons.MessageCircle size={32} className="mx-auto mb-2 text-text-secondary" />
                                                <p className="text-sm font-black uppercase tracking-widest text-text-secondary">Nenhuma atividade registrada</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="h-12" /> {/* Bottom padding */}
                                </section>
                            </div>

                            {/* Sidebar (Right) */}
                            <div className="w-full md:w-64 bg-background-card p-6 space-y-10 flex flex-col border-l border-white/5">
                                <div>
                                    <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-6 opacity-50">Informações do Lead</h4>
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <h4 className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40">Data de Registro</h4>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                                                    <Icons.Calendar size={14} className="text-text-secondary" />
                                                    {lead.addedAt ? new Date(lead.addedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data desconhecida'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                                                    <Icons.Clock size={14} className="text-text-secondary" />
                                                    {lead.addedAt ? new Date(lead.addedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Horário desconhecido'}
                                                </div>
                                            </div>
                                        </div>
                                        {role === 'admin' && (
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40">Consultor Responsável</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-text-primary flex items-center justify-center text-[10px] font-bold">
                                                        {lead.user_id ? profilesMap[lead.user_id]?.slice(0, 1).toUpperCase() : '?'}
                                                    </div>
                                                    <span className="text-xs font-bold text-primary">
                                                        {lead.user_id ? profilesMap[lead.user_id] : 'Não atribuído'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3 group/website relative pt-4 border-t border-white/5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40">Website Oficial</span>
                                                {!isEditingWebsite && (
                                                    <button
                                                        onClick={() => setIsEditingWebsite(true)}
                                                        className="p-1 text-text-secondary hover:text-primary transition-colors opacity-0 group-hover/website:opacity-100"
                                                    >
                                                        <Icons.Edit size={10} />
                                                    </button>
                                                )}
                                            </div>
                                            {!isEditingWebsite && (
                                                lead.website ? (
                                                    <a
                                                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary/5 text-primary hover:bg-primary/10 transition-all text-[10px] font-bold border border-primary/20 group/ws-btn"
                                                    >
                                                        <Icons.Globe size={12} className="text-primary group-hover/ws-btn:scale-110 transition-transform" />
                                                        <span className="truncate">Abrir Website</span>
                                                        <Icons.ExternalLink size={10} className="opacity-50" />
                                                    </a>
                                                ) : (
                                                    <button
                                                        onClick={() => setIsEditingWebsite(true)}
                                                        className="w-full py-3 rounded-xl border-2 border-dashed border-white/5 text-[10px] font-bold text-text-secondary hover:border-primary/30 hover:text-primary transition-all"
                                                    >
                                                        ADICIONAR WEBSITE
                                                    </button>
                                                )
                                            )}

                                            {isEditingWebsite && (
                                                <div className="absolute top-0 right-0 z-30 w-72 p-4 bg-background-card rounded-2xl shadow-2xl border border-white/10 space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-text-secondary uppercase">URL do Website</label>
                                                        <input
                                                            type="text"
                                                            value={tempWebsite}
                                                            onChange={(e) => setTempWebsite(e.target.value)}
                                                            className="w-full px-3 py-2 text-xs font-bold border border-white/10 rounded-xl bg-white/5 text-text-primary focus:bg-white/10 focus:border-primary/50 outline-none transition-all"
                                                            placeholder="www.exemplo.com"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 pt-2 border-t border-white/5">
                                                        <button
                                                            onClick={handleSaveWebsite}
                                                            className="flex-1 bg-gradient-cta text-background-main py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(57,242,101,0.2)] hover:shadow-primary/30 transition-all active:scale-95"
                                                        >
                                                            SALVAR
                                                        </button>
                                                        <button
                                                            onClick={handleCancelWebsiteEdit}
                                                            className="flex-1 bg-white/5 text-text-secondary py-2 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-colors"
                                                        >
                                                            CANCELAR
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 group/phones relative">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40">Canais de Contato</span>
                                                {!isEditingPhones && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (Date.now() - mountTimeRef.current < 300) return;
                                                            setIsEditingPhones(true);
                                                        }}
                                                        className="p-1 text-text-secondary hover:text-primary transition-colors opacity-0 group-hover/phones:opacity-100"
                                                        title="Editar telefones"
                                                    >
                                                        <Icons.Edit size={10} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                {(() => {
                                                    const rawMain = lead.phoneNumber;
                                                    const extraPhones = (lead.additional_phones || []).filter(p =>
                                                        p &&
                                                        !['null', 'undefined', 'não informado', 'nao informado', 'não identificado', 'nao identificado', 'não encontrado', 'nao encontrado'].includes(p.toLowerCase().trim())
                                                    );

                                                    // Clean main phone
                                                    let mainPhone = rawMain &&
                                                        !['null', 'undefined', 'não informado', 'nao informado', 'não identificado', 'nao identificado', 'não encontrado', 'nao encontrado'].includes(rawMain.toLowerCase().trim())
                                                        ? rawMain : null;

                                                    let displayedMain = mainPhone;
                                                    let displayedExtra = [...extraPhones];

                                                    if (mainPhone && mainPhone.includes(',')) {
                                                        const parts = mainPhone.split(',').map(p => p.trim());
                                                        displayedMain = parts[0];
                                                        displayedExtra = [...parts.slice(1), ...extraPhones];
                                                    }

                                                    const hasMultiplePhones = (displayedMain ? 1 : 0) + displayedExtra.length > 1;

                                                    return (
                                                        <>
                                                            {displayedMain ? (
                                                                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                                                                    <Icons.Phone size={12} className="text-text-secondary" />
                                                                    {displayedMain}
                                                                    {hasMultiplePhones && (
                                                                        <span className="text-[8px] uppercase px-2 py-0.5 bg-white/5 text-text-secondary rounded-md border border-white/10 font-black tracking-widest">Principal</span>
                                                                    )}
                                                                    {isWhatsAppValid(displayedMain) && (
                                                                        <a
                                                                            href={getWhatsAppLink(displayedMain)}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="ml-auto p-1 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                                            title="Chamar no WhatsApp"
                                                                        >
                                                                            <Icons.MessageCircle size={14} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[10px] text-text-secondary italic">Nenhum telefone cadastrado</div>
                                                            )}
                                                            {displayedExtra.map((phone, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 text-xs font-bold text-text-primary">
                                                                    <Icons.Phone size={12} className="text-text-secondary shrink-0" />
                                                                    <span className="truncate">{phone}</span>
                                                                    <span className="text-[8px] uppercase px-2 py-0.5 bg-white/5 text-text-secondary rounded-md border border-white/10 font-black tracking-widest whitespace-nowrap">Outro</span>
                                                                    {isWhatsAppValid(phone) && (
                                                                        <a
                                                                            href={getWhatsAppLink(phone)}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="ml-auto p-1 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                                            title="Chamar no WhatsApp"
                                                                        >
                                                                            <Icons.MessageCircle size={14} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            {isEditingPhones && (
                                                <div className="absolute top-0 right-0 z-20 w-72 p-4 bg-background-card rounded-2xl shadow-xl border border-white/10 space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-text-secondary uppercase">Principal</label>
                                                        <input
                                                            type="text"
                                                            value={tempPhoneNumber}
                                                            onChange={(e) => setTempPhoneNumber(formatPhone(e.target.value))}
                                                            className="w-full px-3 py-2 text-xs font-bold border border-white/10 rounded-xl bg-white/5 text-text-primary focus:bg-white/10 focus:border-primary/50 outline-none transition-all"
                                                            placeholder="Telefone principal"
                                                            autoFocus
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-text-secondary uppercase">Adicionais</label>
                                                        {tempAdditionalPhones.map((phone, index) => (
                                                            <div key={index} className="flex gap-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={phone}
                                                                    onChange={(e) => handleUpdateAdditionalPhone(index, formatPhone(e.target.value))}
                                                                    className="flex-1 px-3 py-2 text-xs font-bold border border-white/10 rounded-xl bg-white/5 text-text-primary focus:bg-white/10 focus:border-primary/50 outline-none transition-all"
                                                                    placeholder="Outro telefone"
                                                                />
                                                                <button
                                                                    onClick={() => handleRemoveAdditionalPhone(index)}
                                                                    className="p-1.5 text-text-secondary hover:text-red-500 transition-colors"
                                                                >
                                                                    <Icons.X size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={handleAddAdditionalPhone}
                                                            className="w-full py-1.5 border border-dashed border-white/10 rounded-xl text-[10px] font-bold text-text-secondary hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <Icons.Plus size={10} /> Adicionar Telefone
                                                        </button>
                                                    </div>

                                                    <div className="flex gap-2 pt-2 border-t border-white/5">
                                                        <button
                                                            onClick={handleSavePhones}
                                                            disabled={isSavingPhones}
                                                            className="flex-1 bg-gradient-cta text-background-main py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(57,242,101,0.2)] hover:shadow-primary/30 transition-all disabled:opacity-30"
                                                        >
                                                            {isSavingPhones ? <Icons.Loader2 className="animate-spin mx-auto" size={16} strokeWidth={3} /> : 'SALVAR'}
                                                        </button>
                                                        <button
                                                            onClick={handleCancelPhoneEdit}
                                                            disabled={isSavingPhones}
                                                            className="flex-1 bg-white/5 text-text-secondary py-2 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-colors"
                                                        >
                                                            CANCELAR
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {lead.location && (
                                            <div className="space-y-2 pt-4">
                                                <div className="space-y-1 relative group/loc-section">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40">Localização & Endereço</span>
                                                        {!isEditingLocation && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsEditingLocation(true);
                                                                }}
                                                                className="p-1 text-text-secondary hover:text-primary transition-colors opacity-0 group-hover/loc-section:opacity-100"
                                                            >
                                                                <Icons.Edit size={10} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="flex items-start gap-2 text-xs font-bold text-text-primary">
                                                        <Icons.MapPin size={12} className="text-text-secondary mt-0.5 shrink-0" />
                                                        <span className="leading-tight">{lead.location}</span>
                                                    </div>

                                                    {isEditingLocation && (
                                                        <div className="absolute top-0 right-0 z-10 w-72 p-4 bg-background-card rounded-2xl shadow-xl border border-white/10 space-y-4">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-text-secondary uppercase">Endereço</label>
                                                                <input
                                                                    type="text"
                                                                    value={tempLocation}
                                                                    onChange={(e) => setTempLocation(e.target.value)}
                                                                    className="w-full px-3 py-2 text-xs font-bold border border-white/10 rounded-xl bg-white/5 text-text-primary focus:bg-white/10 focus:border-primary/50 outline-none transition-all"
                                                                    placeholder="Digite o endereço..."
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-text-secondary uppercase">Link do Maps</label>
                                                                <input
                                                                    type="text"
                                                                    value={tempGoogleMapsUri}
                                                                    onChange={(e) => setTempGoogleMapsUri(e.target.value)}
                                                                    className="w-full px-3 py-2 text-xs font-bold border border-white/10 rounded-xl bg-white/5 text-text-primary focus:bg-white/10 focus:border-primary/50 outline-none transition-all"
                                                                    placeholder="https://maps.google.com/..."
                                                                />
                                                            </div>
                                                            <div className="flex gap-2 pt-2 border-t border-white/5">
                                                                <button
                                                                    onClick={handleSaveLocation}
                                                                    disabled={isSavingHeader}
                                                                    className="flex-1 bg-gradient-cta text-background-main py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(57,242,101,0.2)] hover:shadow-primary/30 transition-all disabled:opacity-30"
                                                                >
                                                                    {isSavingHeader ? <Icons.Loader2 className="animate-spin mx-auto" size={16} strokeWidth={3} /> : 'SALVAR'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setIsEditingLocation(false)}
                                                                    className="flex-1 bg-white/5 text-text-secondary py-2 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-colors"
                                                                >
                                                                    CANCELAR
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <a
                                                    href={lead.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.businessName} ${lead.location}`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 text-text-primary hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-[0.2em] border-2 border-white/5 group"
                                                >
                                                    <Icons.Map size={14} strokeWidth={3} className="text-primary group-hover:scale-110 transition-transform" />
                                                    Ver no Google Maps
                                                </a>
                                            </div>
                                        )}

                                        {(lead.potential_owner_name || lead.potential_owner_phone) && (
                                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Responsável Encontrado</span>
                                                <div className="space-y-2">
                                                    {lead.potential_owner_name && (
                                                        <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                                                            <Icons.User size={12} className="text-primary" />
                                                            {lead.potential_owner_name}
                                                        </div>
                                                    )}
                                                    {lead.potential_owner_phone && (
                                                        <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                                                            <Icons.Phone size={12} className="text-primary" />
                                                            {lead.potential_owner_phone}
                                                            {isWhatsAppValid(lead.potential_owner_phone) && (
                                                                <a
                                                                    href={getWhatsAppLink(lead.potential_owner_phone)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="ml-auto p-1 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                                    title="Chamar no WhatsApp"
                                                                >
                                                                    <Icons.MessageCircle size={14} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Social Media Section */}
                                <section className="space-y-4 pt-6 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40">
                                            Canais Sociais
                                        </span>
                                        {!isEditingSocials && (
                                            <button
                                                onClick={() => setIsEditingSocials(true)}
                                                className="text-[10px] font-black text-primary hover:glow-text-primary uppercase tracking-[0.2em] transition-all"
                                            >
                                                Editar
                                            </button>
                                        )}
                                    </div>

                                    {isEditingSocials ? (
                                        <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-dashed border-white/10">
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">Instagram</label>
                                                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                                                        <Icons.Instagram size={16} className="text-pink-500 shrink-0" />
                                                        <input
                                                            type="text"
                                                            value={tempInstagram}
                                                            onChange={(e) => setTempInstagram(e.target.value)}
                                                            placeholder="URL do Instagram"
                                                            className="flex-1 min-w-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary/50"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">Facebook</label>
                                                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                                                        <Icons.Facebook size={16} className="text-blue-500 shrink-0" />
                                                        <input
                                                            type="text"
                                                            value={tempFacebook}
                                                            onChange={(e) => setTempFacebook(e.target.value)}
                                                            placeholder="URL do Facebook"
                                                            className="flex-1 min-w-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary/50"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">LinkedIn</label>
                                                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                                                        <Icons.Linkedin size={16} className="text-blue-400 shrink-0" />
                                                        <input
                                                            type="text"
                                                            value={tempLinkedin}
                                                            onChange={(e) => setTempLinkedin(e.target.value)}
                                                            placeholder="URL do LinkedIn"
                                                            className="flex-1 min-w-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary/50"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 justify-end pt-2">
                                                <button
                                                    onClick={handleCancelSocialsEdit}
                                                    className="px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSaveSocials}
                                                    disabled={isSavingSocials}
                                                    className="px-5 py-2.5 bg-gradient-cta text-background-main rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-[0_10px_30px_rgba(57,242,101,0.2)] hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-30"
                                                >
                                                    {isSavingSocials ? <Icons.Loader2 className="animate-spin mx-auto" size={16} strokeWidth={3} /> : 'SALVAR'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {lead.instagram ? (
                                                <a
                                                    href={lead.instagram}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-pink-500/5 to-purple-500/5 hover:from-pink-500/10 hover:to-purple-500/10 border border-white/5 hover:border-pink-500/20 transition-all group"
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                                        <Icons.Instagram size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block mb-0.5">Instagram</span>
                                                        <span className="text-xs font-bold text-text-primary truncate block group-hover:text-pink-400 transition-colors">Ver Perfil</span>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 opacity-40 grayscale">
                                                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-text-secondary">
                                                        <Icons.Instagram size={18} />
                                                    </div>
                                                    <span className="text-xs font-bold text-text-secondary">Não informado</span>
                                                </div>
                                            )}

                                            {lead.facebook ? (
                                                <a
                                                    href={lead.facebook}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-2xl bg-blue-500/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 transition-all group"
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                                        <Icons.Facebook size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Facebook</span>
                                                        <span className="text-xs font-bold text-text-primary truncate block group-hover:text-blue-400 transition-colors">Ver Perfil</span>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 opacity-40 grayscale">
                                                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-text-secondary">
                                                        <Icons.Facebook size={18} />
                                                    </div>
                                                    <span className="text-xs font-bold text-text-secondary">Não informado</span>
                                                </div>
                                            )}

                                            {lead.linkedin ? (
                                                <a
                                                    href={lead.linkedin}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-2xl bg-blue-400/5 hover:bg-blue-400/10 border border-white/5 hover:border-blue-400/20 transition-all group"
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                                        <Icons.Linkedin size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-0.5">LinkedIn</span>
                                                        <span className="text-xs font-bold text-text-primary truncate block group-hover:text-blue-300 transition-colors">Ver Perfil</span>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 opacity-40 grayscale">
                                                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-text-secondary">
                                                        <Icons.Linkedin size={18} />
                                                    </div>
                                                    <span className="text-xs font-bold text-text-secondary">Não informado</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </section>

                                <section className="space-y-4 pt-6 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tight">
                                            Dados Jurídicos / RFB
                                        </span>
                                        <Icons.ShieldCheck size={14} className="text-primary" strokeWidth={3} />
                                    </div>

                                    {(lead.cnpj || (lead.partners && lead.partners.length > 0)) ? (
                                        <div className="space-y-4">
                                            {lead.cnpj && (
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">CNPJ</span>
                                                    <div className="text-xs font-bold text-text-primary bg-white/5 p-3 rounded-xl border border-white/10 shadow-inner">
                                                        {lead.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
                                                    </div>
                                                </div>
                                            )}
                                            {lead.partners && lead.partners.length > 0 && (
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Sócios / QSA</span>
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {lead.partners.map((partner, idx) => (
                                                            <span key={idx} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-text-primary shadow-sm">
                                                                {partner}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-text-secondary italic bg-white/5 p-4 rounded-xl border border-dashed border-white/10 text-center leading-relaxed">
                                            Nenhum dado jurídico encontrado. <br /> Use o <span className="text-primary font-bold">"Enriquecer Dados"</span> para buscar via CNPJ.
                                        </div>
                                    )}
                                </section>

                                <div>
                                    <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-4 opacity-50">Ferramentas de IA</h4>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={handleEnrichClick}
                                            disabled={isEnriching}
                                            className="flex items-center justify-center gap-3 w-full px-6 py-3 rounded-2xl bg-gradient-cta text-background-main hover:scale-[1.02] active:scale-95 transition-all text-[11px] font-bold uppercase tracking-widest shadow-[0_10px_30px_rgba(57,242,101,0.2)] hover:shadow-primary/40 group/btn"
                                        >
                                            {isEnriching ? (
                                                <Icons.Loader2 size={18} className="animate-spin" strokeWidth={3} />
                                            ) : (
                                                <Icons.Sparkles size={18} strokeWidth={3} />
                                            )}
                                            ENRIQUECER DADOS
                                        </button>
                                    </div>
                                </div>



                                <div className="pt-6 mt-6 border-t border-white/5">
                                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 opacity-80">
                                        <Icons.AlertCircle size={14} strokeWidth={3} />
                                        Zona de Perigo
                                    </h4>
                                    <div className="relative group/delete">
                                        {!showDeleteConfirm ? (
                                            <button
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-all text-xs font-bold border border-red-500/20 hover:border-red-500/40 shadow-sm"
                                            >
                                                <Icons.Trash2 size={14} className="group-hover/delete:animate-bounce" />
                                                Excluir este Lead
                                            </button>
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="bg-red-950/40 backdrop-blur-md rounded-2xl p-4 shadow-2xl shadow-red-500/10 space-y-4 border border-red-500/30"
                                            >
                                                <p className="text-[10px] font-black text-red-100 uppercase text-center tracking-[0.2em] leading-relaxed">
                                                    Esta ação é irreversível. <br /> <span className="text-red-400">Confirmar exclusão?</span>
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            setTimeout(() => onDelete(lead.id), 100);
                                                        }}
                                                        className="flex-1 bg-red-500 text-white py-2 rounded-xl text-[10px] font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95"
                                                    >
                                                        SIM, EXCLUIR
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(false)}
                                                        className="flex-1 bg-white/5 text-text-secondary py-2 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-colors"
                                                    >
                                                        CANCELAR
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div >
            </div >
        </AnimatePresence >
    );
};
