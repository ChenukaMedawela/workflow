
'use client';

import { PageHeader } from "@/components/page-header";
import { AddLeadDialog } from "../leads/_components/add-lead-dialog";
import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, onSnapshot, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { Lead, Stage, AutomationRule } from "@/lib/types";
import { KanbanBoard } from "./_components/kanban-board";
import { DropResult } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { logAudit } from "@/lib/audit-log";
import { formatISO } from "date-fns";

export default function PipelinePage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stages, setStages] = useState<Stage[]>([]);
    const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
    const [sectors, setSectors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { user, hasRole } = useAuth();

    useEffect(() => {
        const fetchInitialData = async () => {
            const stagesCollection = collection(db, 'pipelineStages');
            const stagesSnapshot = await getDocs(stagesCollection);
            const stagesList = stagesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Stage)
                .sort((a,b) => a.order - b.order);
            setStages(stagesList);

            const rulesCollection = collection(db, 'automationRules');
            const rulesSnapshot = await getDocs(rulesCollection);
            const rulesList = rulesSnapshot.docs.map(doc => ({ ...doc.data(), stageId: doc.id }) as AutomationRule);
            setAutomationRules(rulesList);

            return stagesList; // Return stages to be used in the subscription
        };
        
        fetchInitialData().then(fetchedStages => {
            const unsubLeads = onSnapshot(collection(db, 'leads'), (snapshot) => {
                let leadsList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Lead);
                const isSuper = hasRole(['Super User', 'Super Admin']);
                
                if (!isSuper && user && user.entityId) {
                    const globalStage = fetchedStages.find(s => s.name === 'Global');
                    leadsList = leadsList.filter(lead => lead.ownerEntityId === user.entityId || lead.stageId === globalStage?.id);
                }

                const uniqueSectors = [...new Set(leadsList.map(lead => lead.sector).filter(Boolean))] as string[];
                setSectors(uniqueSectors);
                setLeads(leadsList);
                setLoading(false);
            });

            return () => {
                unsubLeads();
            };
        });

    }, [user, hasRole]);

    const activeStages = stages.filter(stage => !stage.isIsolated);
    const isolatedStages = stages.filter(stage => stage.isIsolated && stage.name !== 'Global');

    const leadsByStage = stages.reduce((acc, stage) => {
        acc[stage.id] = leads.filter(lead => lead.stageId === stage.id);
        return acc;
    }, {} as { [key: string]: Lead[] });

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) {
            return;
        }

        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }

        const leadRef = doc(db, 'leads', draggableId);
        const leadDoc = await getDoc(leadRef);
        const lead = leadDoc.data() as Lead;
        
        const sourceStage = stages.find(s => s.id === source.droppableId);
        const destStage = stages.find(s => s.id === destination.droppableId);

        if (!lead || !sourceStage || !destStage) return;

        try {
            const now = formatISO(new Date());
            const newHistoryEntry = { stageId: destination.droppableId, timestamp: now };

            await updateDoc(leadRef, {
                stageId: destination.droppableId,
                stageHistory: arrayUnion(newHistoryEntry)
            });

            await logAudit({
                action: 'move_lead',
                from: { stage: sourceStage.name },
                to: { stage: destStage.name },
                details: { leadId: draggableId, leadName: lead.accountName }
            });

            toast({
                title: "Lead Updated",
                description: "Lead stage has been successfully updated.",
            });
        } catch (error) {
            console.error("Error updating lead stage:", error);
            toast({
                title: "Error",
                description: "Failed to update lead stage.",
                variant: "destructive",
            });
        }
    };
    
    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <PageHeader
                title="Pipeline"
                description="Visualize and manage your sales flow."
            >
                 <div className="flex items-center gap-2">
                    <AddLeadDialog sectors={sectors} onSectorAdded={(newSector) => setSectors(prev => [...prev, newSector])} />
                </div>
            </PageHeader>

            {loading ? (
                 <div className="flex flex-1 items-center justify-center">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                </div>
            ) : (
                <div className="flex-1 min-h-0">
                    <KanbanBoard 
                        activeStages={activeStages} 
                        isolatedStages={isolatedStages} 
                        leadsByStage={leadsByStage}
                        sectors={sectors}
                        onSectorAdded={(newSector) => setSectors(prev => [...prev, newSector])}
                        automationRules={automationRules} 
                        onDragEnd={onDragEnd} 
                    />
                </div>
            )}
        </div>
    );
}

    