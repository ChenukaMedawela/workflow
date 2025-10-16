
"use client";

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PageHeader } from "@/components/page-header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

const AccessControlPage = () => {
    const { hasRole } = useAuth();
    const [allowGlobalLeadRead, setAllowGlobalLeadRead] = useState(false);
    const [dataMasking, setDataMasking] = useState({
        maskAccountName: false,
        maskAmount: false,
        maskContractDates: false,
        maskEntity: false,
        maskSector: false,
        maskStage: false,
    });
    const [loading, setLoading] = useState(true);

    const isSuperUser = hasRole(['Super Admin', 'Super User']);

    useEffect(() => {
        const fetchSettings = async () => {
            const docRef = doc(db, 'settings', 'accessControls');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const settings = docSnap.data();
                setAllowGlobalLeadRead(settings.allowGlobalLeadRead || false);
                setDataMasking(settings.dataMasking || {});
            }
            setLoading(false);
        };

        if (isSuperUser) {
            fetchSettings();
        }
    }, [isSuperUser]);

    const handleGlobalReadChange = async (value: boolean) => {
        setAllowGlobalLeadRead(value);
        try {
            await setDoc(doc(db, 'settings', 'accessControls'), { allowGlobalLeadRead: value, dataMasking }, { merge: true });
            toast({ title: 'Success', description: 'Global lead read setting updated.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update setting.', variant: 'destructive' });
        }
    };

    const handleMaskingChange = async (field: string, value: boolean) => {
        const updatedMasking = { ...dataMasking, [field]: value };
        setDataMasking(updatedMasking);
        try {
            await setDoc(doc(db, 'settings', 'accessControls'), { allowGlobalLeadRead, dataMasking: updatedMasking }, { merge: true });
            toast({ title: 'Success', description: `Data masking for ${field} updated.` });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update setting.', variant: 'destructive' });
        }
    };

    if (!isSuperUser) {
        return (
            <div className="flex items-center justify-center h-full">
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Access Control"
                description="Manage global access and data masking settings."
            />
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Global Permissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="global-lead-read"
                                checked={allowGlobalLeadRead}
                                onCheckedChange={handleGlobalReadChange}
                            />
                            <Label htmlFor="global-lead-read">Allow all users to see all leads</Label>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Data Masking</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Object.keys(dataMasking).map((field) => (
                            <div key={field} className="flex items-center space-x-2">
                                <Switch
                                    id={field}
                                    checked={dataMasking[field as keyof typeof dataMasking]}
                                    onCheckedChange={(value) => handleMaskingChange(field, value)}
                                />
                                <Label htmlFor={field}>Mask {field.replace('mask', '')}</Label>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AccessControlPage;
