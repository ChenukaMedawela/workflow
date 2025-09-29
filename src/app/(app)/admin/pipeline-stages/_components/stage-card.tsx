
'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, GripVertical, Trash2, Edit, Lock } from "lucide-react";
import { Stage } from '@/lib/types';
import { EditStageDialog } from './edit-stage-dialog';
import { DeleteStageDialog } from './delete-stage-dialog';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logAudit } from '@/lib/audit-log';
import { useAuth } from '@/hooks/use-auth';


interface StageCardProps {
    stage: Stage;
    onStageUpdated: () => void;
    onStageDeleted: () => void;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export function StageCard({ stage, onStageUpdated, onStageDeleted, dragHandleProps }: StageCardProps) {
    const { toast } = useToast();
    const { user } = useAuth();

    const handleToggle = async (field: keyof Stage | `rules.${keyof Stage['rules']}`, value: boolean) => {
        const stageRef = doc(db, "pipelineStages", stage.id);
        const fieldPath = field.split('.');
        
        let updateData: { [key: string]: any } = {};
        let originalValue: any;

        if (fieldPath.length > 1) {
            // nested field like 'rules.requireStartDateToEnter'
            const ruleField = fieldPath[1] as keyof Stage['rules'];
            updateData = {
                rules: {
                    ...stage.rules,
                    [ruleField]: value
                }
            };
            originalValue = stage.rules[ruleField];
        } else {
            const topLevelField = field as keyof Stage;
            updateData = { [topLevelField]: value };
            originalValue = stage[topLevelField];
        }
        
        try {
            await updateDoc(stageRef, updateData);
            
            await logAudit({
                action: 'update_stage_property',
                from: { [field]: originalValue },
                to: { [field]: value },
                details: { stageId: stage.id, stageName: stage.name },
                user,
                timestamp: new Date(),
            });

            onStageUpdated();
             toast({
                title: "Stage Updated",
                description: `${stage.name} has been updated.`,
            });
        } catch (error) {
            console.error("Error updating stage:", error);
            toast({
                title: "Error",
                description: "Failed to update stage.",
                variant: "destructive",
            });
        }
    };
    
    if (stage.name === "Global") {
        return (
            <Card className="bg-muted/50">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground cursor-not-allowed px-2">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>The Global stage cannot be moved, edited, or deleted.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <div className="font-semibold text-lg">{stage.name}</div>
                    </div>
                     <div className="text-sm text-muted-foreground">This is a default stage for unassigned leads.</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                     <div {...dragHandleProps} className="flex flex-col items-center gap-2 text-muted-foreground cursor-grab px-2">
                        <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="font-semibold text-lg">{stage.name}</div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                        <Switch id={`isolated-${stage.id}`} checked={stage.isIsolated} onCheckedChange={(val) => handleToggle('isIsolated', val)} />
                        <Label htmlFor={`isolated-${stage.id}`}>Isolated</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id={`start-date-${stage.id}`} checked={stage.rules.requireStartDateToEnter} onCheckedChange={(val) => handleToggle('rules.requireStartDateToEnter', val)} />
                        <Label htmlFor={`start-date-${stage.id}`}>Requires Contract Start Date</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id={`end-date-${stage.id}`} checked={stage.rules.requireEndDateToLeave} onCheckedChange={(val) => handleToggle('rules.requireEndDateToLeave', val)} />
                        <Label htmlFor={`end-date-${stage.id}`}>Requires Contract End Date</Label>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                           <EditStageDialog stage={stage} onStageUpdated={onStageUpdated}>
                                <div className="flex items-center cursor-pointer w-full">
                                    <Edit className="mr-2 h-4 w-4"/>
                                    <span>Edit</span>
                                </div>
                           </EditStageDialog>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <DeleteStageDialog stageId={stage.id} stageName={stage.name} onStageDeleted={onStageDeleted}>
                               <div className="flex items-center cursor-pointer w-full text-destructive">
                                <Trash2 className="mr-2 h-4 w-4"/>
                                <span>Delete</span>
                               </div>
                           </DeleteStageDialog>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardContent>
        </Card>
    );
}
