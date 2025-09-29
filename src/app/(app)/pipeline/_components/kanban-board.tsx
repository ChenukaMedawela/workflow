
'use client';

import React from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { KanbanCard } from './kanban-card';
import { AutomationRule, Lead, Stage } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface KanbanBoardProps {
  activeStages: Stage[];
  isolatedStages: Stage[];
  leadsByStage: { [key: string]: Lead[] };
  sectors: string[];
  onSectorAdded: (sector: string) => void;
  automationRules: AutomationRule[];
  onDragEnd: (result: DropResult) => void;
}

export function KanbanBoard({ activeStages, isolatedStages, leadsByStage, sectors, onSectorAdded, automationRules, onDragEnd }: KanbanBoardProps) {
  const allStages = [...activeStages, ...isolatedStages];
  
  const getStageTitle = (stage: Stage) => {
    if (stage.name === 'Global') return 'Global (Unassigned)';
    if (stage.isIsolated) return `${stage.name} (Isolated)`;
    return stage.name;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <ScrollArea className="w-full whitespace-nowrap h-full">
            <div className="flex gap-4 pb-4 h-full">
                {activeStages.map(stage => (
                  <Droppable key={stage.id} droppableId={stage.id}>
                      {(provided, snapshot) => (
                      <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`w-80 flex-shrink-0 rounded-lg flex flex-col ${snapshot.isDraggingOver ? 'bg-secondary' : 'bg-muted/50'}`}
                      >
                          <h3 className="font-semibold p-3 text-lg bg-slate-200/50 rounded-t-lg sticky top-0 z-10">{stage.name}</h3>
                          <ScrollArea className="flex-1">
                              <div className="space-y-2 h-full min-h-[100px] p-2">
                                  {(leadsByStage[stage.id] || []).map((lead, index) => (
                                      <KanbanCard key={lead.id} lead={lead} index={index} stages={allStages} sectors={sectors} onSectorAdded={onSectorAdded} automationRules={automationRules} />
                                  ))}
                                  {provided.placeholder}
                              </div>
                          </ScrollArea>
                      </div>
                      )}
                  </Droppable>
                ))}

                {isolatedStages.length > 0 && (
                   <div className="flex items-center px-2">
                        <Separator orientation="vertical" className="h-4/5"/>
                   </div>
                )}

                {isolatedStages.map(stage => (
                  <Droppable key={stage.id} droppableId={stage.id}>
                      {(provided, snapshot) => (
                      <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`w-80 flex-shrink-0 rounded-lg flex flex-col ${snapshot.isDraggingOver ? 'bg-secondary' : 'bg-muted/50'}`}
                      >
                          <h3 className="font-semibold p-3 text-lg bg-slate-200/50 rounded-t-lg sticky top-0 z-10">{getStageTitle(stage)}</h3>
                          <ScrollArea className="flex-1">
                              <div className="space-y-2 h-full min-h-[100px] p-2">
                                  {(leadsByStage[stage.id] || []).map((lead, index) => (
                                      <KanbanCard key={lead.id} lead={lead} index={index} stages={allStages} sectors={sectors} onSectorAdded={onSectorAdded} automationRules={automationRules} />
                                  ))}
                                  {provided.placeholder}
                              </div>
                          </ScrollArea>
                      </div>
                      )}
                  </Droppable>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    </DragDropContext>
  );
}
