import React, { useState } from 'react';
import { Lead, LeadStatus, TagDefinition } from '../types';
import { Icons } from './Icons';
import { getColorForString } from '../constants';
import { getWhatsAppLink, isWhatsAppValid } from '../utils/phoneUtils';

interface LeadCardProps {
  lead: Lead;
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  onDelete: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, lead: Lead) => void;
  ownerInitials?: string;
  tagDefinitions?: TagDefinition[];
}

const statusColors = {
  [LeadStatus.NEW]: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  [LeadStatus.CONTACTED]: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  [LeadStatus.NEGOTIATING]: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
  [LeadStatus.CLOSED]: 'bg-primary/10 text-primary border-primary/20',
  [LeadStatus.LOST]: 'bg-red-400/10 text-red-400 border-red-400/20',
};

const statusLabels = {
  [LeadStatus.NEW]: 'Novo',
  [LeadStatus.CONTACTED]: 'Contatado',
  [LeadStatus.NEGOTIATING]: 'Em Negociação',
  [LeadStatus.CLOSED]: 'Fechado',
  [LeadStatus.LOST]: 'Perdido',
};

export const LeadCard: React.FC<LeadCardProps> = React.memo(({ lead, onUpdateStatus, onDelete, onContextMenu, onClick, ownerInitials, tagDefinitions = [] }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div
      onClick={() => onClick(lead)}
      className="bg-background-card rounded-xl p-4 shadow-sm border border-white/5 hover:shadow-card-hover hover:border-primary/20 transition-all duration-300 group relative animate-fade-in cursor-pointer"
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, lead);
      }}
    >
      {/* Header: Badges & Title */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${statusColors[lead.status]}`}>
              {statusLabels[lead.status]}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1 border ${lead.source === 'inbound'
              ? 'bg-primary/10 text-primary border-primary/20'
              : lead.source === 'manual'
                ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                : lead.source === 'ai_finder'
                  ? 'bg-violet-400/10 text-violet-400 border-violet-400/20'
                  : 'bg-white/10 text-text-secondary border-white/5'
              }`}>
              {lead.source === 'inbound' ? 'Inbound' : lead.source === 'manual' ? 'Manual' : lead.source === 'ai_finder' ? 'IA Finder' : 'Outbound'}
            </span>
          </div>
          <h4 className="font-bold text-text-primary leading-tight truncate w-full" title={lead.businessName}>
            {lead.businessName}
          </h4>
        </div>

        {ownerInitials && (
          <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-black shadow-sm shrink-0" title="Dono do Lead">
            {ownerInitials}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {lead.category && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider border max-w-[200px] truncate block ${getColorForString(lead.category).bg} ${getColorForString(lead.category).text} ${getColorForString(lead.category).border} dark:brightness-110 dark:saturate-150`}
            title={lead.category}
          >
            {lead.category}
          </span>
        )}
        {(lead.tags || []).filter(t => t.toLowerCase() !== 'manual').map(tagName => {
          const tagDef = tagDefinitions.find(d => d.name === tagName);
          if (tagDef) {
            return (
              <span
                key={tagName}
                className="text-[10px] px-2 py-0.5 rounded font-black text-white uppercase tracking-wider border border-transparent"
                style={{ backgroundColor: tagDef.color }}
              >
                {tagName}
              </span>
            );
          }
          const color = getColorForString(tagName);
          return (
            <span
              key={tagName}
              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${color.bg} ${color.text} ${color.border} dark:brightness-110 dark:saturate-150`}
            >
              {tagName}
            </span>
          );
        })}
      </div>


      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5 opacity-60 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[9px] font-bold text-text-secondary">
              <Icons.Calendar size={10} />
              <span>{lead.addedAt ? new Date(lead.addedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-text-secondary">
              <Icons.Clock size={10} />
              <span>{lead.addedAt ? new Date(lead.addedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            </div>
          </div>
          {lead.phoneNumber && (
            <div className="flex items-center gap-1">
              <Icons.Phone size={12} className="text-text-secondary" />
              {isWhatsAppValid(lead.phoneNumber) && (
                <a
                  href={getWhatsAppLink(lead.phoneNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 text-primary hover:bg-primary/20 hover:scale-125 rounded-lg transition-all duration-300"
                  title="Chamar no WhatsApp"
                >
                  <Icons.MessageCircle size={14} strokeWidth={2.5} />
                </a>
              )}
            </div>
          )}
          {lead.website && <Icons.Globe size={12} className="text-text-secondary" />}
          {lead.description && <Icons.AlignLeft size={12} className="text-text-secondary" />}
          {lead.comments && lead.comments.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">
              <Icons.MessageSquare size={12} />
              {lead.comments.length}
            </div>
          )}
        </div>

        {lead.status !== LeadStatus.LOST && lead.status !== LeadStatus.CLOSED && (
          <div className="text-[10px] font-bold text-text-secondary flex items-center gap-1">
            Detalhes <Icons.ChevronRight size={10} />
          </div>
        )}
      </div>

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-background-card/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 rounded-xl">
          <p className="text-xs font-bold text-text-primary mb-3">Excluir Lead?</p>
          <div className="flex gap-2 w-full">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-secondary py-2 rounded-xl text-[10px]">Não</button>
            <button onClick={() => onDelete(lead.id)} className="flex-1 btn-primary !bg-red-500 !shadow-red-500/20 py-2 rounded-xl text-[10px]">Sim, Excluir</button>
          </div>
        </div>
      )}
    </div>
  );
});