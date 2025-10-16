
"use client";

import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LogoManager } from './_components/logo-manager';
import { CoverImageManager } from './_components/cover-image-manager';
import { ColorThemeEditor } from './_components/color-theme-editor';
import { Skeleton } from '@/components/ui/skeleton';

// Default colors if not set in theme
const FALLBACK_PRIMARY_COLOR = '#000000'; // Black

export default function AdminAppearancePage() {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState<string>(FALLBACK_PRIMARY_COLOR);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function getThemeData() {
            const themeRef = doc(db, 'settings', 'theme');
            try {
                const themeSnap = await getDoc(themeRef);
                if (themeSnap.exists()) {
                    const data = themeSnap.data();
                    setLogoUrl(data.logoUrl || null);
                    setCoverImageUrl(data.coverImageUrl || null);
                    setPrimaryColor(data.primary_hex || FALLBACK_PRIMARY_COLOR);
                }
            } catch (error) {
                console.error("Error fetching theme data:", error);
            } finally {
                setLoading(false);
            }
        }

        getThemeData();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <LogoManager initialLogoUrl={logoUrl} />
            <CoverImageManager initialCoverImageUrl={coverImageUrl} />
            <ColorThemeEditor 
                initialPrimaryColor={primaryColor} 
            />
        </div>
    );
}
