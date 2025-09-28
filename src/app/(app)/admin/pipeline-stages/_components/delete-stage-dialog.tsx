
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit-log';

interface DeleteStageDialogProps {
    stageId: string;
    stageName: string;
    onStageDeleted: () => void;
    children: React.ReactNode;
}

export function DeleteStageDialog({ stageId, stageName, onStageDeleted, children }: DeleteStageDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteDoc(doc(db, "pipelineStages", stageId));
            
            await logAudit({
                action: 'delete_pipeline_stage',
                from: { id: stageId, name: stageName },
                details: { stageName: stageName }
            });

            setOpen(false);
            onStageDeleted();
            toast({
                title: "Stage Deleted",
                description: "The pipeline stage has been permanently deleted.",
            });
        } catch (error) {
            console.error("Error deleting document: ", error);
             toast({
                title: "Error",
                description: "An error occurred while deleting the stage.",
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
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the pipeline stage.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
