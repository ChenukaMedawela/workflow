
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from 'lucide-react';
import { LogoEditor } from './_components/logo-editor';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { logAudit } from '@/lib/audit-log';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

export default function AdminAppearancePage() {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        const themeRef = doc(db, 'settings', 'theme');
        const unsubscribe = onSnapshot(themeRef, (doc) => {
            setLoading(true);
            if (doc.exists()) {
                setLogoUrl(doc.data().logoUrl || null);
            } else {
                setLogoUrl(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleRemoveLogo = async () => {
        const storage = getStorage();
        const logoRef = ref(storage, 'logos/logo.png');

        try {
            // Delete from storage
            await deleteObject(logoRef);
            // Delete from firestore
            const themeRef = doc(db, 'settings', 'theme');
            await setDoc(themeRef, { logoUrl: null }, { merge: true });

            await logAudit({ action: 'remove_logo', user });

            toast({ title: "Logo Removed", description: "The application logo has been removed." });
        } catch (error: any) {
            // It's okay if the file doesn't exist in storage, we still want to remove it from Firestore
            if (error.code === 'storage/object-not-found') {
                 const themeRef = doc(db, 'settings', 'theme');
                 await setDoc(themeRef, { logoUrl: null }, { merge: true });
                 toast({ title: "Logo Removed", description: "The application logo has been removed." });
            } else {
                console.error("Error removing logo:", error);
                toast({ title: "Error", description: "Failed to remove logo.", variant: "destructive" });
            }
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                 <div className="space-y-2">
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-md border flex items-center justify-center bg-muted overflow-hidden">
                            {loading ? (
                                <Skeleton className="w-full h-full" />
                            ) : logoUrl ? (
                                <Image src={logoUrl} alt="Current Logo" width={80} height={80} className="object-contain" />
                            ) : (
                                <p className="text-xs text-muted-foreground">No Logo</p>
                            )}
                        </div>
                         <div className="flex items-center gap-2">
                            <LogoEditor />
                            {logoUrl && (
                                <Button variant="destructive" size="sm" onClick={handleRemoveLogo}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove
                                </Button>
                            )}
                        </div>
                    </div>
                 </div>
            </CardContent>
        </Card>
    )
}
