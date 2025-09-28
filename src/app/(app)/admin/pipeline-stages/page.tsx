
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, addDoc, query, where, getDoc } from 'firebase/firestore';
import { Stage } from '@/lib/types';
import { StageCard } from './_components/stage-card';
import { DragDropContext, Droppable, Draggable, DropResult, resetServerContext } from '@hello-pangea/dnd';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit-log';

export default function AdminPipelineStagesPage() {
    const [stages, setStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(true);
    const [newStageName, setNewStageName] = useState('');
    const { toast } = useToast();

    // Needed for react-beautiful-dnd in Next.js
    useEffect(() => {
        resetServerContext();
    }, []);

    const fetchStages = async () => {
        setLoading(true);
        try {
            const stagesCollection = collection(db, 'pipelineStages');

            const globalStageQuery = query(stagesCollection, where("name", "==", "Global"));
            const globalStageSnapshot = await getDocs(globalStageQuery);
            if (globalStageSnapshot.empty) {
                await addDoc(stagesCollection, {
                    name: 'Global',
                    order: 0,
                    isIsolated: true,
                    rules: {
                        requireStartDateToEnter: false,
                        requireEndDateToLeave: false,
                    }
                });
            }

            const stagesSnapshot = await getDocs(stagesCollection);
            const stagesList = stagesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Stage);
            const stagesWithDefaults = stagesList.map(stage => ({
                ...stage,
                rules: {
                    requireStartDateToEnter: stage.rules?.requireStartDateToEnter || false,
                    requireEndDateToLeave: stage.rules?.requireEndDateToLeave || false,
                }
            }));
            
            // Separate Global stage and other stages
            const globalStage = stagesWithDefaults.find(s => s.name === 'Global');
            const otherStages = stagesWithDefaults.filter(s => s.name !== 'Global').sort((a, b) => a.order - b.order);

            // Ensure Global stage is always first if it exists
            const sortedStages = globalStage ? [globalStage, ...otherStages] : otherStages;

            setStages(sortedStages);
        } catch (error) {
            console.error("Error fetching or creating pipeline stages: ", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStages();
    }, []);
    
    const handleAddStage = async () => {
        if (!newStageName.trim()) {
            toast({ title: "Error", description: "Stage name cannot be empty.", variant: "destructive" });
            return;
        }

        try {
            // New stages get an order that places them at the end
            const nextOrder = stages.filter(s => s.name !== 'Global').length + 1;
            const newStageData = {
                name: newStageName,
                order: nextOrder,
                isIsolated: false,
                rules: {
                    requireStartDateToEnter: false,
                    requireEndDateToLeave: false,
                }
            };
            const docRef = await addDoc(collection(db, "pipelineStages"), newStageData);
            
            await logAudit({
                action: 'create_pipeline_stage',
                to: { id: docRef.id, ...newStageData },
                details: { stageName: newStageName }
            });

            toast({ title: "Success", description: `Stage "${newStageName}" has been added.` });
            setNewStageName('');
            fetchStages();
        } catch (error) {
            console.error("Error adding stage:", error);
            toast({ title: "Error", description: "Failed to add stage.", variant: "destructive" });
        }
    }


    const onDragEnd = async (result: DropResult) => {
        const { source, destination } = result;

        if (!destination) {
            return;
        }
        
        // Prevent dropping in the first position (reserved for Global stage)
        if (destination.index === 0) {
            return;
        }

        const newStages = Array.from(stages);
        const [reorderedItem] = newStages.splice(source.index, 1);
        newStages.splice(destination.index, 0, reorderedItem);

        // Filter out Global stage before re-ordering
        const reorderableStages = newStages.filter(stage => stage.name !== 'Global');
        
        const updatedStages = reorderableStages.map((stage, index) => ({
            ...stage,
            order: index + 1, // Start order from 1 for custom stages
        }));
        
        const originalOrder = stages.filter(s => s.name !== 'Global').map(s => s.name);
        const newOrder = updatedStages.map(s => s.name);

        const globalStage = stages.find(s => s.name === "Global");
        if(globalStage) {
             setStages([globalStage, ...updatedStages]);
        } else {
             setStages(updatedStages);
        }
       

        try {
            const batch = writeBatch(db);
            updatedStages.forEach(stage => {
                const stageRef = doc(db, 'pipelineStages', stage.id);
                batch.update(stageRef, { order: stage.order });
            });
            await batch.commit();

            await logAudit({
                action: 'reorder_pipeline_stages',
                from: { order: originalOrder },
                to: { order: newOrder }
            });

            toast({ title: "Stages Reordered", description: "The pipeline stages have been reordered." });
        } catch (error) {
            console.error("Error updating stage order:", error);
            toast({ title: "Error", description: "Failed to update stage order.", variant: "destructive" });
            fetchStages(); // Re-fetch to revert optimistic update on failure
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Pipeline Stages</CardTitle>
                        <CardDescription>Define the stages and rules of your sales pipeline. Drag and drop to reorder.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input 
                            placeholder="Enter new stage name" 
                            value={newStageName}
                            onChange={(e) => setNewStageName(e.target.value)}
                            className="w-64"
                        />
                        <Button onClick={handleAddStage}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Stage
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="stages">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                {stages.length > 0 ? (
                                    stages.map((stage, index) => (
                                        <Draggable 
                                            key={stage.id} 
                                            draggableId={stage.id} 
                                            index={index}
                                            isDragDisabled={stage.name === 'Global'}
                                        >
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                >
                                                    <StageCard
                                                        stage={stage}
                                                        onStageUpdated={fetchStages}
                                                        onStageDeleted={fetchStages}
                                                        dragHandleProps={provided.dragHandleProps}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground py-10">
                                        No pipeline stages found. Add one to get started.
                                    </div>
                                )}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </CardContent>
        </Card>
    );
}
