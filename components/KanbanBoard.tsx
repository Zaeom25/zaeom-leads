import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Lead, LeadStatus, TagDefinition } from '../types';
import { LeadCard } from './LeadCard';
import { Icons } from './Icons';
import { LeadDetailsDialog } from './LeadDetailsDialog';

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  onLeadMove: (result: DropResult) => void;
  onEnrichLead: (id: string, owner: string) => Promise<void>;
  onUpdateLead: (lead: Lead) => void;
  onOpenManualEditor: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onEdit?: (lead: Lead) => void;
  onContextMenu: (e: React.MouseEvent, lead: Lead) => void;
  tagDefinitions?: TagDefinition[];
  ownerMap?: Record<string, string>;
  currentUser?: { id: string; name: string; avatar_url?: string };
  onTagCreated?: (newTag: TagDefinition) => void;
  onTagDeleted?: (tagId: string) => void;
  onAddTag?: (leadId: string, tagName: string, tagColor?: string) => void;
  onRemoveTag?: (leadId: string, tagName: string) => void;
  onDeleteTagDef?: (tagId: string) => void;
  onEditTag?: (tagId: string, name: string, color: string) => void;
}

const columns = [
  { id: LeadStatus.NEW, label: 'Novos Leads', icon: 'Sparkles', color: 'bg-blue-400/50' },
  { id: LeadStatus.CONTACTED, label: 'Contactados', icon: 'MessageCircle', color: 'bg-amber-400/50' },
  { id: LeadStatus.NEGOTIATING, label: 'Em Negociação', icon: 'Briefcase', color: 'bg-violet-400/50' },
  { id: LeadStatus.CLOSED, label: 'Fechados', icon: 'CheckCircle2', color: 'bg-primary' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = React.memo(({
  leads,
  onUpdateStatus,
  onLeadMove,
  onEnrichLead,
  onDeleteLead,
  onOpenManualEditor,
  onUpdateLead,
  onContextMenu,
  tagDefinitions = [],
  ownerMap,
  currentUser,
  onAddTag,
  onRemoveTag,
  onDeleteTagDef,
  onEditTag
}) => {
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);

  // Sync selectedLead with updated data from the leads prop
  React.useEffect(() => {
    if (selectedLead) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads]);

  const handleDragEnd = (result: DropResult) => {
    onLeadMove(result);
  };

  return (
    <div className="h-full overflow-x-auto pb-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 min-w-[1000px] h-full">
          {columns.map((col) => {
            const columnLeads = leads
              .filter(l => l.status === col.id)
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

            const Icon = Icons[col.icon as keyof typeof Icons] || Icons.Circle;

            return (
              <div
                key={col.id}
                className="flex-1 flex flex-col min-w-[280px] h-full"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-6 px-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${col.color} shadow-[0_0_10px_rgba(57,242,101,0.5)]`} />
                    <h3 className="font-black text-text-primary uppercase tracking-[0.15em] text-[10px]">{col.label}</h3>
                  </div>
                  <span className="bg-white/5 border border-white/10 text-text-secondary text-[10px] px-2.5 py-1 rounded-lg font-black shadow-sm">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Droppable Zone */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        flex-1 p-2 rounded-2xl border transition-colors duration-200 flex flex-col gap-3 overflow-y-auto custom-scrollbar
                        ${snapshot.isDraggingOver ? 'bg-white/10 border-primary/20' : 'bg-white/5 border-white/5'}
                        ${columnLeads.length === 0 && !snapshot.isDraggingOver ? 'flex items-center justify-center' : ''}
                      `}
                    >
                      {columnLeads.length === 0 && !snapshot.isDraggingOver ? (
                        <div className="text-center opacity-40 hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Icon size={20} className="text-text-secondary" />
                          </div>
                          <p className="text-sm text-text-secondary font-medium">Vazio</p>
                        </div>
                      ) : (
                        columnLeads.map((lead, index) => (
                          // @ts-ignore
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{ ...provided.draggableProps.style }}
                                className={`${snapshot.isDragging ? 'z-50 rotate-2 scale-105 opacity-90' : ''}`}
                              >
                                <LeadCard
                                  lead={lead}
                                  onUpdateStatus={onUpdateStatus}
                                  onDelete={onDeleteLead}
                                  onContextMenu={onContextMenu}
                                  onClick={(lead) => setSelectedLead(lead)}
                                  ownerInitials={ownerMap ? ownerMap[lead.user_id || ''] : undefined}
                                  tagDefinitions={tagDefinitions}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {selectedLead && (
        <LeadDetailsDialog
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={(updatedLead) => {
            onUpdateLead(updatedLead);
            setSelectedLead(updatedLead);
          }}
          onDelete={onDeleteLead}
          onEnrich={(id) => onEnrichLead(id, "")}
          profilesMap={ownerMap || {}}
          tagDefinitions={tagDefinitions}
          currentUser={currentUser}
          onAddTag={(name, color) => onAddTag && selectedLead && onAddTag(selectedLead.id, name, color)}
          onRemoveTag={(name) => onRemoveTag && selectedLead && onRemoveTag(selectedLead.id, name)}
          onDeleteTagDef={onDeleteTagDef}
          onEditTag={onEditTag}
        />
      )}
    </div>
  );
});