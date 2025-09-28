
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { doc, updateDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { Stage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit-log';
import { useAuth } from '@/hooks/use-auth';

interface EditStageDialogProps {
    stage: Stage;
    onStageUpdated: () => void;
    children: React.ReactNode;
}

export function EditStageDialog({ stage, onStageUpdated, children }: EditStageDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(stage.name);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        if (open) {
            setName(stage.name);
        }
    }, [stage, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const stageRef = doc(db, "pipelineStages", stage.id);
            await updateDoc(stageRef, {
                name,
            });

            await logAudit({
                action: 'rename_pipeline_stage',
                from: { name: stage.name },
                to: { name },
                details: { stageId: stage.id },
                user,
            });

            setOpen(false);
            onStageUpdated();
            toast({
                title: "Stage Updated",
                description: `Stage name changed to "${name}".`,
            });
        } catch (error) {
            console.error("Error updating document: ", error);
            toast({
                title: "Error",
                description: "An error occurred while updating the stage.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Pipeline Stage Name</DialogTitle>
                    <DialogDescription>
                        Update the name of your pipeline stage. Other properties can be changed from the main screen.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="hover:bg-primary/90">
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
