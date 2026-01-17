export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  NEGOTIATING = 'NEGOTIATING',
  CLOSED = 'CLOSED',
  LOST = 'LOST'
}

export interface Organization {
  id: string;
  name: string;
  search_credits: number;
  enrich_credits: number;
  monthly_goal?: number;
  owner_id: string;
  stripe_customer_id?: string;
  subscription_status?: 'free' | 'pro';
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'seller' | 'org_owner' | 'org_member' | 'system_admin';
  name: string;
  organization_id: string | null;
  avatar_url?: string;
  created_at?: string;
  onboarding_completed?: boolean;
}

export interface LeadComment {
  id: string;
  text: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  businessName: string;
  category: string;
  location: string;
  rating?: number;
  reviewCount?: number;
  address: string;
  website?: string;
  phoneNumber?: string;
  status: LeadStatus;
  potentialOwner?: string;
  potential_owner_name?: string;
  potential_owner_phone?: string;
  summary?: string;
  googleMapsUri?: string;
  addedAt: number;
  description?: string;
  comments?: LeadComment[];
  additional_phones?: string[];
  instagram?: string;
  facebook?: string;
  linkedin?: string;

  // CRM Fields
  source: 'inbound' | 'outbound' | 'manual' | 'ai_finder';
  tags: string[];
  order_index?: number;
  value?: number;
  user_id?: string;
  organization_id?: string; // Multitenancy
  closedAt?: number;
  due_date?: string; // ISO string
  place_id?: string;
  cnpj?: string;
  partners?: string[];
  isSaved?: boolean;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  content: string;
  is_completed: boolean;
  order_index: number;
}

export interface Checklist {
  id: string;
  lead_id: string;
  title: string;
  items: ChecklistItem[];
  order_index: number;
}

export interface Attachment {
  id: string;
  lead_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface TagDefinition {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TagAssignment {
  lead_id: string;
  tag_id: string;
  created_at: string;
  tag?: TagDefinition;
}

export interface SearchParams {
  niche: string;
  location: string;
}

export const CATEGORIES = [
  // Saúde e Bem-Estar
  { id: 'dentista', label: 'Dentista / Clínica Odontológica', group: 'Saúde e Bem-Estar', icon: 'Smile', term: 'Dentista' },
  { id: 'estetica', label: 'Clínica de Estética', group: 'Saúde e Bem-Estar', icon: 'Sparkles', term: 'Clínica de Estética' },
  { id: 'psicologo', label: 'Psicólogo / Clínica de Psicologia', group: 'Saúde e Bem-Estar', icon: 'Brain', term: 'Psicólogo' },
  { id: 'fisioterapeuta', label: 'Fisioterapeuta / Studio de Pilates', group: 'Saúde e Bem-Estar', icon: 'Activity', term: 'Fisioterapeuta' },
  { id: 'nutricionista', label: 'Nutricionista', group: 'Saúde e Bem-Estar', icon: 'Apple', term: 'Nutricionista' },
  { id: 'veterinaria', label: 'Veterinária / Pet Shop', group: 'Saúde e Bem-Estar', icon: 'Dog', term: 'Veterinária' },

  // Serviços Profissionais (Alto Ticket)
  { id: 'advogado', label: 'Advogado(a)', group: 'Serviços Profissionais', icon: 'Scale', term: 'Advogado' },
  { id: 'contabilidade', label: 'Contabilidade / Escritório Contábil', group: 'Serviços Profissionais', icon: 'Calculator', term: 'Contabilidade' },
  { id: 'arquiteto', label: 'Arquiteto / Designer de Interiores', group: 'Serviços Profissionais', icon: 'Ruler', term: 'Arquiteto' },
  { id: 'corretor', label: 'Corretor de Seguros', group: 'Serviços Profissionais', icon: 'ShieldCheck', term: 'Corretor de Seguros' },
  { id: 'engenharia', label: 'Engenharia Civil / Construtora', group: 'Serviços Profissionais', icon: 'HardHat', term: 'Construtora' },

  // Casa, Construção e Manutenção
  { id: 'energia', label: 'Energia Solar (Instalação)', group: 'Casa e Construção', icon: 'Sun', term: 'Energia Solar' },
  { id: 'ar_condicionado', label: 'Instalador de Ar Condicionado', group: 'Casa e Construção', icon: 'Fan', term: 'Instalação de Ar Condicionado' },
  { id: 'marcenaria', label: 'Marcenaria / Móveis Planejados', group: 'Casa e Construção', icon: 'Hammer', term: 'Marcenaria' },
  { id: 'vidracaria', label: 'Vidraçaria', group: 'Casa e Construção', icon: 'LayoutGrid', term: 'Vidraçaria' },
  { id: 'pintura', label: 'Pintura e Reformas', group: 'Casa e Construção', icon: 'Paintbrush', term: 'Pintura' },

  // Gastronomia e Comércio Local
  { id: 'restaurante', label: 'Restaurante / Hamburgueria', group: 'Gastronomia e Comércio', icon: 'Utensils', term: 'Restaurante' },
  { id: 'buffet', label: 'Buffet e Eventos', group: 'Gastronomia e Comércio', icon: 'PartyPopper', term: 'Buffet' },
  { id: 'escola_idiomas', label: 'Escola de Idiomas', group: 'Gastronomia e Comércio', icon: 'GraduationCap', term: 'Escola de Idiomas' },
  { id: 'otica', label: 'Ótica', group: 'Gastronomia e Comércio', icon: 'Eye', term: 'Ótica' },

  // Outros
  { id: 'outro', label: 'Outro / Personalizado', group: 'Outros', icon: 'MoreHorizontal', term: '' },
];

export interface Subscription {
  id: string;
  user_id: string;
  status: 'trialling' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | 'paused';
  metadata?: any;
  price_id?: string;
  quantity?: number;
  cancel_at_period_end?: boolean;
  created: string;
  current_period_start: string;
  current_period_end: string;
  ended_at?: string;
  cancel_at?: string;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
}

export interface Customer {
  id: string; // user_id
  stripe_customer_id: string;
}