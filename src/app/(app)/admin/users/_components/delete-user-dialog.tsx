
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit-log';
import { User } from '@/lib/types';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

interface DeleteUserDialogProps {
    userToDelete: User | null;
    onUserDeleted: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteUserDialog({ userToDelete, onUserDeleted, open, onOpenChange }: DeleteUserDialogProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { user: currentUser } = useAuth();

    const handleDelete = async () => {
        if (!userToDelete) return;

        if (currentUser?.id === userToDelete.id) {
            toast({
                title: "Cannot Delete Self",
                description: "You cannot delete your own account.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            await deleteDoc(doc(db, "users", userToDelete.id));
            
            await logAudit({
                action: 'delete_user',
                from: { id: userToDelete.id, name: userToDelete.name, email: userToDelete.email },
                details: { deletedUserName: userToDelete.name }
            });

            onOpenChange(false);
            onUserDeleted();
            toast({
                title: "User Deleted",
                description: `${userToDelete.name} has been permanently deleted.`,
            });
        } catch (error) {
            console.error("Error deleting user: ", error);
             toast({
                title: "Error",
                description: "An error occurred while deleting the user.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!userToDelete) {
        return null;
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the account for <span className="font-semibold">{userToDelete.name}</span> and remove all associated data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive hover:bg-destructive/90">
                        {loading ? 'Deleting...' : 'Yes, delete user'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
