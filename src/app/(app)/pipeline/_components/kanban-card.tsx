
'use client';

import React, { useState, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { AutomationRule, Lead, Stage, Entity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { EditLeadDialog } from '@/components/edit-lead-dialog';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface KanbanCardProps {
  lead: Lead;
  index: number;
  stages: Stage[];
  sectors: string[];
  onSectorAdded: (sector: string) => void;
  automationRules?: AutomationRule[];
}

export function KanbanCard({ lead, index, stages, sectors, onSectorAdded, automationRules }: KanbanCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
      const unsub = onSnapshot(collection(db, 'entities'), (snapshot) => {
        setEntities(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Entity)))
      });
      return () => unsub();
  }, []);

  return (
    <Draggable draggableId={lead.id} index={index} isDragDisabled={isEditDialogOpen}>
      {(provided, snapshot) => (
        <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="mb-2"
            onClick={() => setIsEditDialogOpen(true)}
        >
            <EditLeadDialog
                lead={lead}
                stages={stages}
                entities={entities}
                sectors={sectors}
                onSectorAdded={onSectorAdded}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                automationRules={automationRules}
            >
                <Card 
                    className={`hover:bg-muted/80 cursor-pointer ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                >
                    <CardContent className="p-3">
                        <div className="font-semibold">{lead.accountName}</div>
                        <p className="text-sm text-muted-foreground">{lead.sector}</p>
                        <div className="mt-2 flex justify-between items-center">
                            <p className="text-sm font-bold">${lead.amount.toLocaleString()}</p>
                            <Badge variant="secondary">{lead.contractType}</Badge>
                        </div>
                    </CardContent>
                </Card>
            </EditLeadDialog>
        </div>
      )}
    </Draggable>
  );
}

    