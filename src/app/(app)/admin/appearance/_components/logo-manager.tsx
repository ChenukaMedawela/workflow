
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from 'lucide-react';
import { LogoEditor } from './logo-editor';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { logAudit } from '@/lib/audit-log';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

interface LogoManagerProps {
  initialLogoUrl: string | null;
}

export function LogoManager({ initialLogoUrl }: LogoManagerProps) {
    const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const handleLogoUploaded = (url: string) => {
        setLogoUrl(url);
    };

    const handleRemoveLogo = async () => {
        const storage = getStorage();
        const logoRef = ref(storage, 'logos/logo.png');

        setLoading(true);
        try {
            // Delete from storage
            await deleteObject(logoRef);
        } catch (error: any) {
            // Log error but continue as the file might not exist, which is fine
            console.warn("Could not delete logo from storage:", error);
        }

        try {
            // Delete from firestore
            const themeRef = doc(db, 'settings', 'theme');
            await setDoc(themeRef, { logoUrl: null }, { merge: true });

            await logAudit({ action: 'remove_logo', user });

            setLogoUrl(null);
            toast({ title: "Logo Removed", description: "The application logo has been removed." });
        } catch (error) {
            console.error("Error removing logo from Firestore:", error);
            toast({ title: "Error", description: "Failed to remove logo.", variant: "destructive" });
        }
        setLoading(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Logo</CardTitle>
                <CardDescription>Customize the application logo.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="space-y-2">
                    <Label>Current Logo</Label>
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
                            <LogoEditor onLogoUploaded={handleLogoUploaded} />
                            {logoUrl && (
                                <Button variant="destructive" size="sm" onClick={handleRemoveLogo} disabled={loading}>
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
