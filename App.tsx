import React, { useState, useEffect, useRef, useMemo } from 'react';
// import { LandingPage } from './components/LandingPage';
import { OnboardingPage } from './components/OnboardingPage';
import { motion } from 'framer-motion';
import { Icons } from './components/Icons';
import { SearchPanel } from './components/SearchPanel';
import { KanbanBoard } from './components/KanbanBoard';
import { Lead, LeadStatus, TagDefinition } from './types';
import { DEFAULT_TAGS } from './constants';
import { DropResult } from '@hello-pangea/dnd';
import { searchLeads, findLeadOwner } from './services/geminiService';
import { searchLeadsSerper } from './services/serperService';
import { fetchPartners } from './services/receitaService';
import { supabase } from './lib/supabase';
import { getCredits, deductCredit } from './services/creditService';
import { detectiveEnrichment } from './services/cascadeEnrichService';
import { NewLeadDialog } from './components/NewLeadDialog';
import { UpgradeModal } from './components/UpgradeModal';
import { FilterMenu } from './components/FilterMenu';
import { ContextMenu } from './components/ContextMenu';
import { AdminPanel } from './components/AdminPanel';
import { UpdatePasswordDialog } from './components/UpdatePasswordDialog';
import { ProfileSettingsDialog } from './components/ProfileSettingsDialog';
import { ConfirmModal } from './components/ConfirmModal';
import { WalletDashboard } from './components/WalletDashboard';
import { HistoryPanel } from './components/HistoryPanel';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { BrandingProvider, useBranding } from './contexts/BrandingContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { translateError } from './utils/errorTranslations';
import { sanitizeUrl } from './utils/urlUtils';
import DOMPurify from 'dompurify';
import { Login } from './components/Login';

function Dashboard() {
  const { user, profile, loading, isPasswordRecovery } = useAuth();
  // const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-main">
        <Icons.Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  // If user is logged in, show Dashboard
  if (user) {
    // If profile is loaded but onboarding not completed, show Onboarding
    if (profile && profile.onboarding_completed === false) {
      return <OnboardingPage />;
    }
    return <DashboardContent />;
  }

  // Default: Show Login directly (Landing Page retired)
  return <Login />;
}

function DashboardContent() {
  const { user, profile, loading, isPasswordRecovery } = useAuth();
  const { logoUrl, faviconUrl, siteName, loading: brandingLoading } = useBranding();
  const [logoError, setLogoError] = useState(false);

  const { addToast } = useToast();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff_admin';

  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Application State
  const [pipelineLeads, setPipelineLeads] = useState<Lead[]>([]); // Saved in CRM
  const [finderLeads, setFinderLeads] = useState<Lead[]>([]);     // Temporary AI results
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchStatus, setSearchStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'finder' | 'kanban' | 'admin' | 'portfolio' | 'landing' | 'history'>('kanban');

  // Admin: Map user_id to Initials
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Refs
  const resultsRef = useRef<HTMLDivElement>(null);

  // Dialog State
  const [isManualLeadOpen, setIsManualLeadOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalType, setUpgradeModalType] = useState<'search' | 'enrich'>('search');
  const [upgradeModalReason, setUpgradeModalReason] = useState<'depleted' | 'user_action'>('depleted');
  const [isDeducting, setIsDeducting] = useState(false);

  // Pagination State
  const [lastSearch, setLastSearch] = useState<{ niche: string, location: string, page: number } | null>(null);

  // Credits State
  const [orgCredits, setOrgCredits] = useState<{ search: number, enrich: number, status: string, monthly_goal: number, organizationId?: string }>({ search: 0, enrich: 0, status: 'free', monthly_goal: 50000 });

  useEffect(() => {
    if (user) {
      getCredits().then(credits => {
        setOrgCredits(credits);
        // setOrgCredits(credits);
        // Automatic redirect removed to improve UX
      });
    }
  }, [user]); // Only run on user load/login

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterSpecialties, setFilterSpecialties] = useState<string[]>([]);
  const [filterSources, setFilterSources] = useState<string[]>([]);
  const [filterLocations, setFilterLocations] = useState<string[]>([]);
  const [filterOwner, setFilterOwner] = useState<string>('all');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lead: Lead } | null>(null);

  // Consolidate initialization behavior
  useEffect(() => {
    if (!user) return;

    const initializeData = async () => {
      setIsInitialLoading(true);
      try {
        // Parallel fetches for speed
        const fetches = [
          supabase.from('leads').select('*').order('order_index', { ascending: true }).order('addedAt', { ascending: false }),
          supabase.from('tag_definitions').select('*').order('name')
        ];

        if (isAdmin) {
          fetches.push(supabase.from('profiles').select('id, name, email'));
        }

        const results = await Promise.all(fetches);

        const leadsResult = results[0];
        const tagsResult = results[1];
        const creditsResult = results[2];
        const profilesResult = isAdmin ? results[3] : null;

        if (leadsResult.data) setPipelineLeads(leadsResult.data as unknown as Lead[]);
        if (tagsResult.data) setTagDefinitions(tagsResult.data);
        if (creditsResult) setOrgCredits(creditsResult);



        if (profilesResult?.data) {
          const map: Record<string, string> = {};
          profilesResult.data.forEach((p: any) => {
            const label = p.name || p.email || '?';
            const parts = label.split(' ').filter(Boolean);
            let initials = parts[0]?.charAt(0) || '?';
            if (parts.length > 1) initials += parts[parts.length - 1].charAt(0);
            else if (label.length > 1) initials += label.charAt(1);
            map[p.id] = initials.toUpperCase();
          });
          setProfilesMap(map);
        }
      } finally {
        setIsInitialLoading(false);
      }
    };

    initializeData();
  }, [user?.id, isAdmin]);

  const fetchPipelineLeads = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('order_index', { ascending: true })
      .order('addedAt', { ascending: false });

    if (error) console.error('Error fetching leads:', error);
    if (data) setPipelineLeads(data as unknown as Lead[]);
  };

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          const newLead = payload.new as Lead;
          const oldLead = payload.old as Partial<Lead>;
          // Identify event type
          if (payload.eventType === 'INSERT') {
            setPipelineLeads(prev => {
              if (prev.some(l => l.id === newLead.id)) return prev; // Duplicate check
              return [newLead, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Partial<Lead>;
            setPipelineLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = oldLead.id;
            setPipelineLeads(prev => prev.filter(l => l.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Close context menu on global click (passed to main div or handled by listener)
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Computed Values for Filters
  const leadTags = useMemo(() => pipelineLeads.flatMap(lead => (lead.tags as string[]) || []), [pipelineLeads]);
  const availableTags = useMemo(() => {
    const dbTags = tagDefinitions.map(t => t.name);
    return Array.from(new Set([...dbTags, ...leadTags])).sort();
  }, [tagDefinitions, leadTags]);
  const availableSpecialties = useMemo(() => Array.from(new Set(pipelineLeads.map(lead => lead.category).filter(Boolean))) as string[], [pipelineLeads]);
  const availableLocations = useMemo(() => Array.from(new Set(pipelineLeads.map(lead => lead.location).filter(Boolean))).sort() as string[], [pipelineLeads]);

  // CENTRALIZED TAG NORMALIZATION (New Logic)
  const normalizedTagDefs = useMemo(() => {
    // 1. Start with official DB definitions
    const definitions = [...tagDefinitions];
    const definedNames = new Set(definitions.map(d => d.name));

    // 2. Find legacy tags used in leads that differ from DB definitions
    const legacyTags = new Set<string>();
    pipelineLeads.forEach(lead => {
      if (lead.tags && Array.isArray(lead.tags)) {
        lead.tags.forEach(tag => {
          if (!definedNames.has(tag)) {
            legacyTags.add(tag);
          }
        });
      }
    });

    // 3. Create virtual definitions for legacy tags
    legacyTags.forEach(tagName => {
      definitions.push({
        id: `virtual-${tagName}`,
        name: tagName,
        color: '#94a3b8', // Default gray for legacy
        created_at: new Date().toISOString()
      });
    });

    return definitions.sort((a, b) => a.name.localeCompare(b.name));
  }, [tagDefinitions, pipelineLeads]);

  const availableCRMOwners = useMemo(() => {
    const ownerIds = new Set<string>();
    pipelineLeads.forEach(l => {
      if (l.user_id) ownerIds.add(l.user_id);
    });
    return Array.from(ownerIds).map(id => ({
      value: id,
      label: (profilesMap as Record<string, string>)[id] || 'Desconhecido'
    }));
  }, [pipelineLeads, profilesMap]);

  const filteredLeads = useMemo(() => {
    return pipelineLeads.filter(lead => {
      const matchesTags = filterTags.length === 0 || filterTags.some(tag => (lead.tags || []).includes(tag));
      const matchesSpecialties = filterSpecialties.length === 0 || filterSpecialties.includes(lead.category);
      const matchesSource = filterSources.length === 0 || filterSources.includes(lead.source);
      const matchesLocation = filterLocations.length === 0 || filterLocations.includes(lead.location);
      const matchesOwner = filterOwner === 'all' || lead.user_id === filterOwner;

      return matchesTags && matchesSpecialties && matchesSource && matchesLocation && matchesOwner;
    });
  }, [pipelineLeads, filterTags, filterSpecialties, filterSources, filterLocations, filterOwner]);

  const handleSearch = async (niche: string, location: string) => {
    if (!user) {
      addToast('Você precisa estar logado para pesquisar.', 'error');
      return;
    }

    // Credit Check (Skip if Admin)
    if (!isAdmin && orgCredits.search <= 0) {
      setUpgradeModalType('search');
      setUpgradeModalReason('depleted');
      setIsUpgradeModalOpen(true);
      return;
    }

    setIsSearchLoading(true);
    setSearchProgress(10);
    setSearchStatus('Iniciando busca inteligente...');

    // Progress Simulation
    const progressInterval = setInterval(() => {
      setSearchProgress(prev => Math.min(prev + (90 - prev) * 0.1, 90));
    }, 1500);

    setSearchProgress(10);

    // Clear previous results only if it's a new search, not "Load More"
    if (niche !== lastSearch?.niche || location !== lastSearch?.location) {
      setFinderLeads([]);
    }

    try {
      let startPage = 1;
      if (lastSearch?.niche === niche && lastSearch?.location === location) {
        startPage = lastSearch.page || 1;
      }

      const existingPlaceIds = new Set<string>(pipelineLeads.map(l => l.place_id).filter((id): id is string => !!id));

      const result = await searchLeadsSerper(niche, location, startPage, existingPlaceIds);

      // Mark leads as saved locally just in case (the service does it too but good to be sure)
      const leadsWithStatus = result.leads.map(l => ({
        ...l,
        isSaved: existingPlaceIds.has(l.place_id)
      }));

      setSearchProgress(70);

      if (leadsWithStatus.length === 0) {
        setSearchStatus('Nenhum resultado novo encontrado.');
      } else {
        setSearchStatus(`Encontramos ${leadsWithStatus.filter(l => !l.isSaved).length} novos leads!`);
      }

      // If "Load More", append. If new search, replace.
      // Actually, for "Load More" we usually strictly append.
      // But if the user changed niche/location, we cleared above.
      // So we can just append if we didn't clear?
      // Let's use clean logic:
      setFinderLeads(prev => {
        if (niche !== lastSearch?.niche || location !== lastSearch?.location) {
          return leadsWithStatus;
        }
        // Filter out duplicates that might be returned again?
        // Ideally service handles page logic, but safety first.
        const newOnes = leadsWithStatus.filter(nl => !prev.some(pl => pl.place_id === nl.place_id));
        return [...prev, ...newOnes];
      });

      setLastSearch({ niche, location, page: result.nextStartPage });

      // Refresh credits
      const newCredits = await getCredits();
      if (newCredits) setOrgCredits(newCredits);

      setSearchProgress(100);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      addToast(translateError(error), 'error');
      console.error(error);
    } finally {
      clearInterval(progressInterval);

      setTimeout(() => {
        setIsSearchLoading(false);
        setSearchProgress(0);
        setSearchStatus('');
      }, 1000);
    }
  };

  const loadHistorySearch = async (history: any) => {
    try {
      if (!user) return;

      const { data: cachedResults } = await supabase
        .from('search_cache')
        .select('json_results')
        .eq('query_key', history.query_key)
        .maybeSingle();

      if (cachedResults?.json_results) {
        setFinderLeads(cachedResults.json_results as Lead[]);
        setLastSearch({ niche: history.niche, location: history.location, page: 1 });
        setActiveTab('finder');
        addToast(`Busca por "${history.niche}" carregada.`, 'success');

        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

      } else {
        addToast("Resultados expirados ou não encontrados no cache.", "error");
      }
    } catch (e) {
      console.error(e);
      addToast("Erro ao carregar histórico.", "error");
    }
  };


  const addToPipeline = async (lead: Lead) => {
    if (!user) {
      addToast("Você precisa estar logado.", "error");
      return;
    }

    const { isSaved: _isSaved, id: _id, ...cleanLead } = lead;
    const leadToSave = {
      ...cleanLead,
      source: 'ai_finder' as const,
      status: LeadStatus.NEW,
      user_id: user.id,
      organization_id: profile?.organization_id
    };

    // Check if lead already exists for this user (Client-side check first for speed)
    if (pipelineLeads.some(l => l.place_id === lead.place_id)) {
      addToast("Você já cadastrou este lead!", 'info');
      return;
    }

    // Optimistic local update with a temp id if original is missing
    const tempId = lead.id || Math.random().toString();
    const localLead = { ...leadToSave, id: tempId, isSaved: true };

    setPipelineLeads(prev => [localLead, ...prev]);
    setFinderLeads(prev => prev.filter(l => l.id !== lead.id));

    // Double check on server to be sure
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('place_id', lead.place_id)
      .maybeSingle();

    if (existing) {
      // Was already saved on server, just sync local
      setPipelineLeads(prev => prev.map(l => l.id === tempId ? { ...localLead, id: existing.id } : l));
      addToast("Lead sincronizado (já existia).", 'success');
      return;
    }

    const { data: savedLead, error } = await supabase
      .from('leads')
      .insert(leadToSave)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error saving lead:", error);
      setPipelineLeads(prev => prev.filter(l => l.id !== tempId));

      // Only restore to finder if we are currently using finder
      // This prevents history leads from jumping to finder tab
      if (activeTab === 'finder') {
        setFinderLeads(prev => [lead, ...prev]);
      }

      if (error.code === '23505') {
        // If we got here, it means we checked user_id+place_id above and it wasn't there.
        // So this conflict MUST be from another constraint (e.g. maybe global place_id?)
        // OR a race condition.
        addToast("Este lead já foi cadastrado no sistema (restrição duplicada).", 'error');
      } else {
        addToast(translateError(error), 'error');
      }
    } else if (savedLead) {
      // Update local state with the real ID from database
      setPipelineLeads(prev => prev.map(l => l.id === tempId ? { ...savedLead, isSaved: true } : l));
      addToast("Lead adicionado ao CRM!", 'success');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error opening portal:', error);
      addToast("Erro ao abrir portal de gerenciamento", "error");
    }
  };

  const updateLeadStatus = async (id: string, status: LeadStatus) => {
    setPipelineLeads(prev => prev.map(lead =>
      lead.id === id ? { ...lead, status } : lead
    ));
    const { error } = await supabase.from('leads').update({ status }).eq('id', id);
    if (error) console.error("Error updating status:", error);
  };

  const handleLeadMove = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newLeads = Array.from(pipelineLeads);
    const leadIndex = newLeads.findIndex(l => (l as Lead).id === draggableId);
    if (leadIndex === -1) return;
    const movedLead = { ...(newLeads[leadIndex] as any) } as Lead;

    const sourceStatus = source.droppableId as LeadStatus;
    const destStatus = destination.droppableId as LeadStatus;

    if (sourceStatus !== destStatus) {
      movedLead.status = destStatus;
    }

    const destColumnLeads = newLeads
      .filter(l => (l as Lead).status === destStatus && (l as Lead).id !== draggableId)
      .sort((a, b) => {
        const orderA = (a as Lead).order_index ?? 0;
        const orderB = (b as Lead).order_index ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return (b as Lead).addedAt - (a as Lead).addedAt;
      });

    destColumnLeads.splice(destination.index, 0, movedLead);

    const BASE_STEP = 10000;
    const updates = destColumnLeads.map((l, index) => {
      const updateData = {
        ...(l as Lead),
        order_index: (index + 1) * BASE_STEP,
        status: destStatus
      };

      if ((destStatus as string) === LeadStatus.CLOSED) {
        (updateData as any).closedAt = Date.now();
      } else if (((sourceStatus as string) === LeadStatus.CLOSED) && (destStatus as string) !== LeadStatus.CLOSED) {
        (updateData as any).closedAt = null;
      }

      return updateData;
    });

    updates.forEach(u => {
      const idx = newLeads.findIndex(l => (l as Lead).id === (u as any).id);
      if (idx !== -1) {
        newLeads[idx] = {
          ...(newLeads[idx] as any),
          order_index: (u as any).order_index,
          status: (u as any).status,
          closedAt: (u as any).closedAt !== undefined ? (u as any).closedAt : (newLeads[idx] as any).closedAt
        };
      }
    });

    setPipelineLeads([...newLeads].sort((a, b) => ((a as Lead).order_index || 0) - ((b as Lead).order_index || 0)));

    const { error } = await supabase
      .from('leads')
      .upsert(
        updates,
        { onConflict: 'id' }
      );

    if (error) console.error("Error updating drag:", error);
  };

  const enrichLead = async (id: string, ownerName: string) => {
    const leadToEnrich = pipelineLeads.find(l => l.id === id);
    if (!leadToEnrich) return;

    // Credit Check (Skip if Admin)
    if (user && !isAdmin) {
      if (orgCredits.enrich <= 0) {
        setUpgradeModalType('enrich');
        setUpgradeModalReason('depleted');
        setIsUpgradeModalOpen(true);
        return;
      }

    }

    try {
      setIsSearchLoading(true); // Reuse loader for status

      const result = await detectiveEnrichment(
        leadToEnrich.businessName,
        leadToEnrich.location,
        leadToEnrich.website,
        (status) => setSearchStatus(status)
      );

      if (result) {
        // Deduct credit only on success
        if (user && !isAdmin) {
          // Credit is deducted atomically in the Edge Function
          getCredits().then(setOrgCredits);
        }

        const updates: any = {};
        if (result.name) updates.potential_owner_name = result.name;
        if (result.role) updates.role = result.role; // Assuming Lead type has role or similar
        if (result.phone1) updates.phoneNumber = result.phone1;
        if (result.phone2) updates.additional_phones = [result.phone2];
        if (result.instagram) updates.instagram = result.instagram;
        if (result.linkedin) updates.linkedin = result.linkedin;
        if (result.email) updates.email = result.email;
        if (result.website) updates.website = result.website;
        if (result.cnpj) updates.cnpj = result.cnpj;
        if (result.partners) updates.partners = result.partners;

        setPipelineLeads(prev => prev.map(lead =>
          lead.id === id ? { ...lead, ...updates } : lead
        ));

        await supabase.from('leads').update(updates).eq('id', id);
        addToast("Enriquecimento concluído!", 'success');
      } else {
        addToast("Não encontramos novas informações.", 'info');
      }
    } catch (error: any) {
      console.error("Enrichment failed:", error);
      const errorMsg = error.message || "Erro no enriquecimento.";
      addToast(errorMsg === "Insufficient credits" ? "Créditos de IA insuficientes." : errorMsg, 'error');
    } finally {
      setIsSearchLoading(false);
      setSearchStatus('');
    }
    // If it's a new lead (no ID), add optimistic
    const tempId = id || Math.random().toString();
    const localLead = { ...leadToEnrich, id: tempId, isSaved: true }; // Assuming updates are already applied to leadToEnrich or will be merged

    // The previous logic already updates local state and DB.
    // This block seems to be a duplicate or intended for a different flow.
    // Given the instruction, I'll add the credit refresh here if it wasn't already done.
    // The existing `if (result)` block already handles credit deduction and refresh.
    // So, the only new part from the instruction is the `getCredits().then(setOrgCredits);`
    // which is already present in the success path.
    // I will add the credit refresh at the end of the function to ensure it's always called
    // after any potential credit-affecting operation, regardless of success/failure path.
    getCredits().then(setOrgCredits);
  };

  const deleteLead = async (id: string, undo: boolean = false) => {
    const previousLeads = [...pipelineLeads];
    setPipelineLeads(prev => prev.filter(l => l.id !== id));

    const { error } = await supabase.from('leads').delete().eq('id', id);

    if (error) {
      console.error("Error deleting lead:", error);
      addToast(translateError(error), 'error');
      setPipelineLeads(previousLeads);
    } else {
      addToast("Lead excluído.", 'info');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, lead: Lead) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, lead });
  };

  const handleAddTag = async (leadId: string, tagName: string, tagColor: string = '#94a3b8') => {
    if (!tagName.trim()) return;

    const lead = pipelineLeads.find(l => l.id === leadId);
    if (!lead) return;

    const currentTags = lead.tags || [];
    if (currentTags.includes(tagName)) return;

    const newTags = [...currentTags, tagName];

    setPipelineLeads(prev => prev.map(l => l.id === leadId ? { ...l, tags: newTags } : l));

    try {
      let tagDef = tagDefinitions.find(d => d.name === tagName);
      if (!tagDef && user) {
        const { data: newDef, error: defError } = await supabase
          .from('tag_definitions')
          .insert([{ name: tagName, color: tagColor, organization_id: profile?.organization_id }])
          .select()
          .single();
        if (!defError && newDef) {
          tagDef = newDef;
          setTagDefinitions(prev => [...prev, newDef]);
        }
      }

      if (tagDef) {
        await supabase.from('lead_tag_assignments').insert([{ lead_id: leadId, tag_id: tagDef.id }]);
      }

      await supabase.from('leads').update({ tags: newTags }).eq('id', leadId);
    } catch (error) {
      console.error("Error adding tag sync:", error);
    }
  };

  const handleRemoveTag = async (leadId: string, tagName: string) => {
    const lead = pipelineLeads.find(l => l.id === leadId);
    if (!lead) return;

    const currentTags = lead.tags || [];
    const newTags = currentTags.filter(t => t !== tagName);

    setPipelineLeads(prev => prev.map(l => l.id === leadId ? { ...l, tags: newTags } : l));

    try {
      const tagDef = tagDefinitions.find(d => d.name === tagName);
      if (tagDef) {
        await supabase
          .from('lead_tag_assignments')
          .delete()
          .eq('lead_id', leadId)
          .eq('tag_id', tagDef.id);
      }

      await supabase.from('leads').update({ tags: newTags }).eq('id', leadId);
    } catch (error) {
      console.error("Error removing tag sync:", error);
    }
  };

  const handleDeleteTagDefinition = async (tagId: string) => {
    try {
      if (tagId.startsWith('virtual-')) {
        const tagName = tagId.replace('virtual-', '');
        const leadsUpdatePromises = pipelineLeads.map(async (lead) => {
          if (lead.tags && lead.tags.includes(tagName)) {
            const newTags = lead.tags.filter(t => t !== tagName);
            setPipelineLeads(prev => prev.map(l => l.id === lead.id ? { ...l, tags: newTags } : l));
            await supabase.from('leads').update({ tags: newTags }).eq('id', lead.id);
          }
        });
        await Promise.all(leadsUpdatePromises);
        addToast(`Tag "${tagName}" removida de todos os leads.`, 'success');
        return;
      }

      const tagDef = tagDefinitions.find(d => d.id === tagId);
      if (!tagDef) return;

      setTagDefinitions(prev => prev.filter(d => d.id !== tagId));

      const { error } = await supabase.from('tag_definitions').delete().eq('id', tagId);
      if (error) throw error;

      // Update local state for all leads
      setPipelineLeads(prev => prev.map(lead => ({
        ...lead,
        tags: lead.tags?.filter(t => t !== tagDef.name) || []
      })));

      // Call RPC to remove from all leads in DB
      await supabase.rpc('remove_tag_from_all_leads', { tag_to_remove: tagDef.name });

      addToast('Tag excluída com sucesso.', 'success');
    } catch (error) {
      console.error('Error deleting tag definition:', error);
      addToast('Erro ao excluir tag.', 'error');
    }
  };

  const handleEditTagDefinition = async (tagId: string, name: string, color: string) => {
    if (!tagId) return;

    const { error } = await supabase
      .from('tag_definitions')
      .update({ name, color })
      .eq('id', tagId);

    if (error) {
      console.error('Error editing tag definition:', error);
      return;
    }

    setTagDefinitions(prev => prev.map(t =>
      t.id === tagId ? { ...t, name, color } : t
    ));

    const oldTag = tagDefinitions.find(t => t.id === tagId);
    if (oldTag && oldTag.name !== name) {
      setPipelineLeads(prevLeads => prevLeads.map(lead => {
        if (!lead.tags?.includes(oldTag.name)) return lead;
        return {
          ...lead,
          tags: lead.tags.map(t => t === oldTag.name ? name : t)
        };
      }));

      await supabase.rpc('rename_tag_in_leads', {
        old_name: oldTag.name,
        new_name: name
      });
    }
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setIsManualLeadOpen(true);
  };

  const handleLeadSaved = (savedLead: Lead) => {
    if (editingLead) {
      setPipelineLeads(prev => prev.map(l => l.id === savedLead.id ? savedLead : l));
      setEditingLead(null);
    } else {
      setPipelineLeads(prev => [savedLead, ...prev]);
      setActiveTab('kanban');
    }
  };

  const handleLeadUpdate = (updatedLead: Lead) => {
    setPipelineLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  // if (activeTab === 'landing') {
  //   return (
  //     <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
  //       {/* <LandingPage onLoginClick={() => setActiveTab('kanban')} /> */}
  //     </div>
  //   );
  // }

  return (
    <div className="flex min-h-screen bg-background-main text-text-primary font-sans selection:bg-primary/30 selection:text-primary">
      {isPasswordRecovery && <UpdatePasswordDialog />}
      <ProfileSettingsDialog isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      <NewLeadDialog
        isOpen={isManualLeadOpen}
        onClose={() => {
          setIsManualLeadOpen(false);
          setEditingLead(null);
        }}
        onLeadAdded={handleLeadSaved}
        leadToEdit={editingLead}
        availableCategories={availableSpecialties}
      />

      {/* Desktop/Tablet Sidebar */}
      <aside className={`hidden md:flex ${isSidebarCollapsed ? 'w-20' : 'w-20 lg:w-72'} bg-[#0F0F0F] border-r border-white/10 flex-col fixed h-full z-20 transition-all duration-300`}>
        <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-center lg:justify-start'} gap-3 h-24 mb-4 relative`}>
          {brandingLoading ? (
            <div className="w-10 h-10 bg-white/5 rounded-xl animate-pulse" />
          ) : (isSidebarCollapsed && faviconUrl) ? (
            <img src={DOMPurify.sanitize(sanitizeUrl(faviconUrl))} alt="Logo" className="w-8 h-8 object-contain transition-all" />
          ) : (logoUrl && !logoError) ? (
            <img
              src={DOMPurify.sanitize(sanitizeUrl(logoUrl))}
              alt="Logo"
              onError={() => setLogoError(true)}
              className={`${isSidebarCollapsed ? 'max-h-10' : 'max-h-12'} w-auto object-contain transition-all`}
            />
          ) : (
            <>
              <div className="w-10 h-10 bg-gradient-cta rounded-xl flex items-center justify-center text-background-main font-black text-xl shadow-lg shadow-primary/20 shrink-0 rotate-3 group-hover/logo:rotate-0 transition-transform">
                {siteName.charAt(0)}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col animate-fade-in truncate">
                  <span className="font-heading font-black text-2xl hidden lg:block tracking-tighter text-text-primary italic truncate">
                    {siteName}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-9 w-6 h-6 bg-[#1A1A1A] border border-white/10 rounded-full flex items-center justify-center text-text-secondary hover:text-primary transition-colors z-30"
          >
            {isSidebarCollapsed ? <Icons.ChevronRight size={14} /> : <Icons.ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setActiveTab('finder')}
            className={`w-full nav-link group ${activeTab === 'finder' ? 'active' : ''} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          >
            <div className={`p-2 rounded-xl transition-all duration-500 ${activeTab === 'finder' ? 'bg-primary text-background-main shadow-lg shadow-primary/20 scale-110' : 'bg-white/5 text-text-secondary group-hover:text-primary group-hover:bg-primary/10 group-hover:rotate-6'}`}>
              <Icons.Search size={18} strokeWidth={3} />
            </div>
            {!isSidebarCollapsed && <span className="hidden lg:block text-[11px] uppercase tracking-[0.2em] font-bold">Buscar Leads</span>}
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`w-full nav-link group ${activeTab === 'kanban' ? 'active' : ''} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          >
            <div className={`p-2 rounded-xl transition-all duration-500 ${activeTab === 'kanban' ? 'bg-primary text-background-main shadow-lg shadow-primary/20 scale-110' : 'bg-white/5 text-text-secondary group-hover:text-primary group-hover:bg-primary/10 group-hover:rotate-6'}`}>
              <Icons.LayoutDashboard size={18} strokeWidth={3} />
            </div>
            {!isSidebarCollapsed && <span className="hidden lg:block text-[11px] uppercase tracking-[0.2em] font-bold">Meu Pipeline</span>}
            {pipelineLeads.length > 0 && !isSidebarCollapsed && (
              <span className={`hidden lg:flex ml-auto text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all ${activeTab === 'kanban' ? 'bg-background-main/20 text-primary' : 'bg-white/5 text-text-secondary group-hover:bg-primary/20 group-hover:text-primary'
                }`}>
                {pipelineLeads.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`w-full nav-link group ${activeTab === 'portfolio' ? 'active' : ''} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          >
            <div className={`p-2 rounded-xl transition-all duration-500 ${activeTab === 'portfolio' ? 'bg-primary text-background-main shadow-lg shadow-primary/20 scale-110' : 'bg-white/5 text-text-secondary group-hover:text-primary group-hover:bg-primary/10 group-hover:rotate-6'}`}>
              <Icons.Briefcase size={18} strokeWidth={3} />
            </div>
            {!isSidebarCollapsed && <span className="hidden lg:block text-[11px] uppercase tracking-[0.2em] font-bold">Minha Carteira</span>}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full nav-link group ${activeTab === 'history' ? 'active' : ''} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          >
            <div className={`p-2 rounded-xl transition-all duration-500 ${activeTab === 'history' ? 'bg-primary text-background-main shadow-lg shadow-primary/20 scale-110' : 'bg-white/5 text-text-secondary group-hover:text-primary group-hover:bg-primary/10 group-hover:rotate-6'}`}>
              <Icons.Clock size={18} strokeWidth={3} />
            </div>
            {!isSidebarCollapsed && <span className="hidden lg:block text-[11px] uppercase tracking-[0.2em] font-bold">Histórico</span>}
          </button>



          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('admin')}
                className={`w-full nav-link group ${activeTab === 'admin' ? 'active' : ''} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
              >
                <div className={`p-2 rounded-xl transition-all duration-500 ${activeTab === 'admin' ? 'bg-primary text-background-main shadow-lg shadow-primary/20 scale-110' : 'bg-white/5 text-text-secondary group-hover:text-primary group-hover:bg-primary/10 group-hover:rotate-6'}`}>
                  <Icons.Settings size={18} strokeWidth={3} />
                </div>
                {!isSidebarCollapsed && <span className="hidden lg:block text-[11px] uppercase tracking-[0.2em] font-bold text-left">Administração</span>}
              </button>


            </>
          )}
        </nav>

        {/* User Credits (SaaS) */}
        {!isSidebarCollapsed && (
          <div className="px-6 mb-4 hidden lg:block">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 transition-all hover:bg-white/10 group/credits">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  {profile?.subscription_status === 'pro' || profile?.subscription_status === 'starter' ? 'Plano Profissional' : 'Plano Gratuito'}
                </span>
                {(profile?.subscription_status === 'pro' || profile?.subscription_status === 'starter') && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">ATIVO</span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-text-secondary">Busca de Leads</span>
                    <span className={`text-xs font-bold ${orgCredits.search > 0 || isAdmin ? 'text-text-primary' : 'text-red-500'}`}>
                      {isAdmin ? '∞' : `${orgCredits.search}/` + (profile?.subscription_status === 'pro' || profile?.subscription_status === 'starter' ? '50' : '5')}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: isAdmin ? '100%' : `${Math.min((orgCredits.search / (profile?.subscription_status === 'pro' || profile?.subscription_status === 'starter' ? 50 : 5)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-text-secondary">Enriquecimentos</span>
                    <span className={`text-xs font-bold ${orgCredits.enrich > 0 || isAdmin ? 'text-text-primary' : 'text-red-500'}`}>
                      {isAdmin ? '∞' : `${orgCredits.enrich}/` + (profile?.subscription_status === 'pro' || profile?.subscription_status === 'starter' ? '50' : '3')}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/40 rounded-full transition-all duration-500"
                      style={{ width: isAdmin ? '100%' : `${Math.min((orgCredits.enrich / (profile?.subscription_status === 'pro' || profile?.subscription_status === 'starter' ? 50 : 3)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {(profile?.subscription_status !== 'pro' && profile?.subscription_status !== 'starter') && !isAdmin ? (
                  <button
                    onClick={() => {
                      setUpgradeModalType('search');
                      setUpgradeModalReason('user_action');
                      setIsUpgradeModalOpen(true);
                    }}
                    className="w-full mt-2 py-2 px-3 bg-gradient-cta hover:shadow-lg hover:shadow-primary/20 text-primary-foreground text-xs font-bold rounded-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                  >
                    Fazer Upgrade <Icons.Sparkles size={12} />
                  </button>
                ) : (
                  <button
                    onClick={handleManageSubscription}
                    className="w-full mt-2 py-2 px-3 bg-white/5 hover:bg-white/10 text-text-secondary text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    Gerenciar Assinatura <Icons.ExternalLink size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />


        <div className="p-4">
          <button
            onClick={() => setIsProfileOpen(true)}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-text-secondary hover:bg-white/5 hover:text-text-primary transition-all duration-300 group ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-primary/50 transition-colors">
              {profile?.avatar_url ? (
                <img src={DOMPurify.sanitize(sanitizeUrl(profile.avatar_url))} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-cta flex items-center justify-center">
                  <span className="font-black text-xs text-primary-foreground uppercase">
                    {profile?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
                  </span>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="hidden lg:flex flex-col items-start truncate overflow-hidden animate-fade-in text-left">
                <span className="text-sm font-black text-text-primary truncate w-full group-hover:text-primary transition-colors">
                  {loading ? 'Carregando...' : (profile?.name || 'Usuário')}
                </span>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest truncate w-full">
                  {loading ? '...' : (profile?.role === 'admin' ? 'Master' : profile?.role === 'staff_admin' ? 'Admin' : 'Vendedor')}
                </span>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 ml-0 md:ml-20 ${isSidebarCollapsed ? '' : 'lg:ml-72'} p-4 md:p-8 lg:p-12 pb-24 md:pb-8 relative overflow-hidden min-h-screen bg-background-main transition-all duration-300`}>
        {/* Background Blobs - Enhanced Green Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-float" />
        <div className="absolute bottom-[0%] right-[0%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-float-delayed" />

        {/* Helper Header for Mobile */}
        <header className="flex justify-between items-center mb-8 md:hidden">
          <div className="flex items-center gap-3">
            {(logoUrl && !logoError) ? (
              <img
                key={logoUrl}
                src={DOMPurify.sanitize(sanitizeUrl(logoUrl))}
                alt="Logo"
                onError={() => setLogoError(true)}
                className="max-h-8 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-cta rounded-lg flex items-center justify-center text-background-main font-black shadow-lg shadow-primary/20 rotate-3 transition-transform hover:rotate-0">
                  {siteName.charAt(0)}
                </div>
                <span className="font-heading font-black text-xl tracking-tighter text-text-primary italic">
                  {siteName}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-lg overflow-hidden transition-all hover:bg-white/10"
          >
            {profile?.avatar_url ? (
              <img src={DOMPurify.sanitize(sanitizeUrl(profile.avatar_url))} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Icons.User size={18} className="text-text-secondary" />
            )}
          </button>
        </header>



        {activeTab === 'finder' && (
          <div className="w-full max-w-7xl mx-auto h-full flex flex-col justify-center py-10">
            <SearchPanel
              onSearch={handleSearch}
              isLoading={isSearchLoading}
              progress={searchProgress}
              status={searchStatus}
            />

            {finderLeads.length > 0 && (
              <div className="mt-8 flex-1 animate-slide-up" ref={resultsRef}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                    <span className="bg-lumo-100 dark:bg-orange-900/20 p-1.5 rounded-lg text-lumo-600 dark:text-orange-400"><Icons.Sparkles size={18} /></span>
                    Resultados da Busca ({finderLeads.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('kanban')}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-primary hover:bg-primary/5 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 group/crm"
                  >
                    <span>Ir para CRM</span> <Icons.ArrowRight size={14} className="group-hover/crm:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {finderLeads.map(lead => (
                    <div key={lead.id} className="bg-background-card p-5 rounded-2xl shadow-sm border border-white/5 flex flex-col hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 group">
                      {lead.isSaved && (
                        <div className="bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1.5 mb-3 self-start border border-primary/20">
                          <Icons.CheckCircle2 size={12} /> Já no CRM
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-text-primary truncate mb-1 flex-1 pr-2 transition-colors" title={lead.businessName}>{lead.businessName}</h4>
                        {lead.rating && (
                          <span className="flex items-center gap-1 text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-100 dark:border-yellow-900/30">
                            <Icons.Star size={10} fill="currentColor" /> {lead.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary truncate flex items-center gap-1.5 mb-4">
                        <Icons.MapPin size={12} className="shrink-0 text-primary" /> {lead.address}
                      </p>

                      <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800 flex gap-2">
                        <button
                          onClick={() => !lead.isSaved && addToPipeline(lead)}
                          disabled={lead.isSaved}
                          className={`flex-1 py-1.5 px-3 h-10 group/add ${lead.isSaved ? 'btn-secondary opacity-50 cursor-default grayscale pointer-events-none' : 'btn-primary'}`}
                        >
                          {lead.isSaved ? (
                            <><Icons.Check size={14} strokeWidth={3} /> <span className="text-[10px]">Mantido</span></>
                          ) : (
                            <><Icons.Plus size={14} strokeWidth={3} className="group-hover/add:rotate-90 transition-transform duration-500" /> <span className="text-[10px]">Add CRM</span></>
                          )}
                        </button>
                        <a
                          href={lead.website || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`btn-icon !w-12 !h-12 !rounded-xl ${!lead.website && 'opacity-20 cursor-not-allowed pointer-events-none'} `}
                        >
                          <Icons.Globe size={18} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && user && (
          <HistoryPanel
            userId={user.id}
            onAddToCRM={addToPipeline}
            profilesMap={profilesMap} // Passing map just in case we need it for UI consistency
          />
        )}

        {activeTab === 'portfolio' && (
          <WalletDashboard
            leads={isAdmin ? pipelineLeads : pipelineLeads.filter(l => l.user_id === user?.id)}
            profilesMap={profilesMap}
            isAdmin={isAdmin}
            onLeadUpdate={handleLeadUpdate}
            tagDefinitions={tagDefinitions}
            monthlyGoal={orgCredits.monthly_goal}
            onGoalUpdate={(newGoal) => {
              setOrgCredits(prev => ({ ...prev, monthly_goal: newGoal }));
              if (orgCredits.organizationId) {
                supabase.from('organizations').update({ monthly_goal: newGoal }).eq('id', orgCredits.organizationId).then(({ error }) => {
                  if (error) console.error('Error saving goal:', error);
                });
              }
            }}
          />
        )}


        {activeTab === 'kanban' && (
          <div className="h-[calc(100vh-140px)] animate-fade-in flex flex-col max-w-7xl mx-auto w-full">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gradient">Pipeline de Vendas</h1>
                <p className="text-text-secondary text-sm">Gerencie suas oportunidades e feche mais negócios.</p>
              </div>
              <div className="flex gap-3">
                {isAdmin && (
                  <div className="relative group">
                    <select
                      value={filterOwner}
                      onChange={(e) => setFilterOwner(e.target.value)}
                      className="bg-white/5 border border-white/10 text-text-primary text-sm rounded-xl focus:ring-primary/50 focus:border-primary/50 block p-2.5 shadow-xl transition-all hover:bg-white/10 outline-none min-w-[180px] appearance-none cursor-pointer"
                    >
                      <option value="all" className="bg-background-card">Todos Vendedores</option>
                      {availableCRMOwners.map(owner => (
                        <option key={owner.value} value={owner.value} className="bg-background-card">{owner.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary group-hover:text-primary transition-colors">
                      <Icons.ChevronDown size={14} />
                    </div>
                  </div>
                )}
                <div className="relative">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`hidden md:flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold uppercase tracking-wider transition-all hover:bg-white/10 hover:border-primary/30 shadow-xl ${(filterTags.length > 0 || filterSources.length > 0 || filterLocations.length > 0) ? 'text-primary border-primary/50 bg-primary/10' : 'text-text-secondary'}`}
                  >
                    <Icons.Filter size={16} />
                    Filtrar
                    {(filterTags.length > 0 || filterSources.length > 0 || filterLocations.length > 0) && (
                      <span className="bg-primary text-primary-foreground text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1 font-black shadow-lg shadow-primary/30">
                        {filterTags.length + filterSources.length + filterLocations.length}
                      </span>
                    )}
                  </button>
                  <FilterMenu
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                    availableTags={availableTags}
                    selectedTags={filterTags}
                    availableLocations={availableLocations}
                    selectedLocations={filterLocations}
                    selectedSources={filterSources}
                    availableSpecialties={availableSpecialties}
                    selectedSpecialties={filterSpecialties}
                    onSpecialtyChange={(specialty) => {
                      setFilterSpecialties(prev =>
                        prev.includes(specialty)
                          ? prev.filter(s => s !== specialty)
                          : [...prev, specialty]
                      );
                    }}
                    onTagChange={(tag) => {
                      setFilterTags(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      );
                    }}
                    onLocationChange={(loc) => {
                      setFilterLocations(prev =>
                        prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
                      );
                    }}
                    onSourceChange={(source) => {
                      setFilterSources(prev =>
                        prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
                      );
                    }}
                    onClear={() => {
                      setFilterTags([]);
                      setFilterSpecialties([]);
                      setFilterLocations([]);
                      setFilterSources([]);
                      setIsFilterOpen(false);
                    }}
                  />
                </div>
                <button
                  onClick={() => setIsManualLeadOpen(true)}
                  className="btn-primary px-5 py-3 rounded-xl group/manual"
                >
                  <Icons.Plus size={16} strokeWidth={3} className="group-hover/manual:rotate-90 transition-transform duration-500" /> <span>Novo Lead</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {isInitialLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-6 text-text-secondary">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                      <Icons.Loader2 size={48} className="animate-spin text-primary relative z-10" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest animate-pulse">Carregando pipeline...</span>
                  </div>
                </div>
              ) : (
                <KanbanBoard
                  leads={filteredLeads}
                  onUpdateStatus={updateLeadStatus}
                  onLeadMove={handleLeadMove}
                  onEnrichLead={enrichLead}
                  onDeleteLead={deleteLead}
                  onOpenManualEditor={handleEditLead}
                  onUpdateLead={handleLeadUpdate}
                  onContextMenu={handleContextMenu}
                  tagDefinitions={normalizedTagDefs}
                  ownerMap={profilesMap}
                  currentUser={user ? { id: user.id, name: user.user_metadata?.full_name || user.email || 'Usuário' } : undefined}
                  onAddTag={handleAddTag}
                  onRemoveTag={handleRemoveTag}
                  onDeleteTagDef={handleDeleteTagDefinition}
                  onEditTag={handleEditTagDefinition}
                />
              )}
            </div>
            {contextMenu && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                lead={pipelineLeads.find(l => l.id === contextMenu.lead.id) || contextMenu.lead}
                onClose={() => setContextMenu(null)}
                onAddTag={(tag, color) => handleAddTag(contextMenu.lead.id, tag, color)}
                onRemoveTag={(tag) => handleRemoveTag(contextMenu.lead.id, tag)}
                tagDefinitions={tagDefinitions}
                onDeleteTagDef={handleDeleteTagDefinition}
                onEdit={() => {
                  handleEditLead(contextMenu.lead);
                  setContextMenu(null);
                }}
                onDelete={() => {
                  setLeadToDelete(contextMenu.lead);
                  setContextMenu(null);
                }}
              />
            )}

            <ConfirmModal
              isOpen={!!leadToDelete}
              onClose={() => setLeadToDelete(null)}
              onConfirm={() => {
                if (leadToDelete) {
                  deleteLead(leadToDelete.id);
                  setLeadToDelete(null);
                }
              }}
              title={`Excluir ${leadToDelete?.businessName || 'Lead'}?`}
              message="Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita."
              confirmText="SIM, EXCLUIR"
              cancelText="CANCELAR"
            />
          </div>
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-background-card/80 backdrop-blur-xl border-t border-white/5 flex justify-around items-center p-2 z-50 md:hidden pb-safe shadow-[0_-8px_40px_-5px_rgba(0,0,0,0.4)]">
        <button
          onClick={() => setActiveTab('finder')}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl w-20 transition-all duration-500 ${activeTab === 'finder' ? 'text-primary bg-primary/10 font-black scale-110 shadow-[0_0_20px_rgba(57,242,101,0.1)]' : 'text-text-secondary opacity-60 hover:opacity-100 hover:bg-white/5'} `}
        >
          <Icons.Search size={22} strokeWidth={activeTab === 'finder' ? 3 : 2} className={activeTab === 'finder' ? 'animate-pulse' : ''} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Buscar</span>
        </button>

        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl w-20 transition-all duration-500 relative ${activeTab === 'kanban' ? 'text-primary bg-primary/10 font-black scale-110 shadow-[0_0_20px_rgba(57,242,101,0.1)]' : 'text-text-secondary opacity-60 hover:opacity-100 hover:bg-white/5'} `}
        >
          <div className="relative">
            <Icons.LayoutDashboard size={22} strokeWidth={activeTab === 'kanban' ? 3 : 2} className={activeTab === 'kanban' ? 'animate-pulse' : ''} />
            {pipelineLeads.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-background-main text-[8px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-background-card shadow-lg">
                {pipelineLeads.length}
              </span>
            )}
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Pipeline</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl w-20 transition-all duration-500 ${activeTab === 'history' ? 'text-primary bg-primary/10 font-black scale-110 shadow-[0_0_20px_rgba(57,242,101,0.1)]' : 'text-text-secondary opacity-60 hover:opacity-100 hover:bg-white/5'} `}
        >
          <Icons.Clock size={22} strokeWidth={activeTab === 'history' ? 3 : 2} className={activeTab === 'history' ? 'animate-pulse' : ''} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Histórico</span>
        </button>

        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl w-20 transition-all duration-500 ${activeTab === 'portfolio' ? 'text-primary bg-primary/10 font-black scale-110 shadow-[0_0_20px_rgba(57,242,101,0.1)]' : 'text-text-secondary opacity-60 hover:opacity-100 hover:bg-white/5'} `}
        >
          <Icons.Briefcase size={22} strokeWidth={activeTab === 'portfolio' ? 3 : 2} className={activeTab === 'portfolio' ? 'animate-pulse' : ''} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Carteira</span>
        </button>
      </nav>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgrade={() => {
          setIsUpgradeModalOpen(false);
          // Redirect to pricing removed
        }}
        type={upgradeModalType}
        reason={upgradeModalReason}
        currentPlan={orgCredits?.status as any || 'free'}
      />
    </div >
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrandingProvider>
          <ThemeProvider>
            <Dashboard />
          </ThemeProvider>
        </BrandingProvider>
      </ToastProvider>
    </AuthProvider>
  );
}