
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { Stage, AutomationRule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit-log';
import { useAuth } from '@/hooks/use-auth';

export default function AdminPipelineAutomationPage() {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [stages, setStages] = useState<Stage[]>([]);
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            const stagesCollection = collection(db, 'pipelineStages');
            const stagesSnapshot = await getDocs(stagesCollection);
            const stagesList = stagesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Stage)
                .sort((a,b) => a.order - b.order);
            setStages(stagesList);

            const rulesCollection = collection(db, 'automationRules');
            const rulesSnapshot = await getDocs(rulesCollection);
            const rulesList = rulesSnapshot.docs.map(doc => ({ ...doc.data(), stageId: doc.id }) as AutomationRule);
            
            const allRules: AutomationRule[] = stagesList.map(stage => {
                const existingRule = rulesList.find(r => r.stageId === stage.id);
                return existingRule || { stageId: stage.id, enabled: false, triggerDays: 30, action: 'Move to Next Stage' };
            });
            setRules(allRules);
        };
        fetchData();
    }, []);
    
    const activeStages = stages.filter(stage => !stage.isIsolated);
    
    const handleRuleChange = (stageId: string, field: keyof AutomationRule, value: any) => {
        setRules(rules.map(r => r.stageId === stageId ? { ...r, [field]: value } : r));
    }

    const handleSaveRule = async (stageId: string) => {
        const ruleToSave = rules.find(r => r.stageId === stageId);
        if (ruleToSave) {
            try {
                const stageName = stages.find(s => s.id === stageId)?.name || 'Unknown Stage';
                const ruleRef = doc(db, 'automationRules', stageId);
                
                const originalRule = (await getDocs(collection(db, 'automationRules'))).docs
                    .map(d => ({...d.data(), stageId: d.id}))
                    .find(r => r.stageId === stageId) || { stageId: stageId, enabled: false, triggerDays: 30, action: 'Move to Next Stage' };

                await setDoc(ruleRef, ruleToSave);

                await logAudit({
                    action: 'save_automation_rule',
                    from: originalRule,
                    to: ruleToSave,
                    details: { stageName },
                    user,
                });

                toast({ title: "Rule Saved", description: `Automation rule for stage has been saved.`});
            } catch (error) {
                console.error("Error saving rule: ", error);
                toast({ title: "Error", description: "Failed to save automation rule.", variant: "destructive"});
            }
        }
    }


    return (
        <Card>
            <CardHeader>
                 <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Pipeline Automation</CardTitle>
                        <CardDescription>Create rules to automatically move leads and improve efficiency.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                {activeStages.map(stage => {
                    const rule = rules.find(r => r.stageId === stage.id);
                    if (!rule) return null;

                    return (
                        <div key={stage.id} className="flex flex-col gap-4 rounded-md border p-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor={`switch-${stage.id}`} className="font-semibold">{stage.name}</Label>
                                <Switch id={`switch-${stage.id}`} checked={rule.enabled} onCheckedChange={(checked) => handleRuleChange(stage.id, 'enabled', checked)} />
                            </div>
                           {rule.enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>Trigger after (days)</Label>
                                    <Input type="number" value={rule.triggerDays} onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        handleRuleChange(stage.id, 'triggerDays', isNaN(value) ? 0 : value)}
                                    }/>
                                </div>
                                <div className="space-y-2">
                                     <Label>Action</Label>
                                      <Select value={rule.action} onValueChange={(value: 'Move to Next Stage' | 'Move to Global Stage') => handleRuleChange(stage.id, 'action', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an action" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Move to Next Stage">Move to Next Stage</SelectItem>
                                            <SelectItem value="Move to Global Stage">Move to Global Stage</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={() => handleSaveRule(stage.id)}>Save Rule</Button>
                            </div>
                           )}
                        </div>
                    )
                })}
                </div>
            </CardContent>
        </Card>
    );
}
