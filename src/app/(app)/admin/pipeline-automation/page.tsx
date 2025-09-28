
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb } from "lucide-react";
import { suggestAutomationRules, SuggestAutomationRulesOutput } from '@/ai/flows/workflow-recommendation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { Lead, Stage, AutomationRule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit-log';

export default function AdminPipelineAutomationPage() {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [stages, setStages] = useState<Stage[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [recommendations, setRecommendations] = useState<SuggestAutomationRulesOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

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

            const leadsCollection = collection(db, 'leads');
            const leadsSnapshot = await getDocs(leadsCollection);
            const leadsList = leadsSnapshot.docs.map(doc => doc.data() as Lead);
            setLeads(leadsList);
        };
        fetchData();
    }, []);
    
    const activeStages = stages.filter(stage => !stage.isIsolated);

    const handleGetRecommendations = async () => {
        setIsLoading(true);
        setRecommendations(null);
        try {
            if (leads.length === 0) {
                toast({ title: "Not enough data", description: "Need at least one lead to generate recommendations."});
                setIsLoading(false);
                return;
            }

            const input = {
                leadAttributes: leads[0], 
                historicalData: leads,
                currentPipelineStages: activeStages.map(s => s.name),
            };
            const result = await suggestAutomationRules(input);
            await logAudit({
                action: 'generate_ai_recommendations',
                details: { recommendationCount: result.recommendations.length }
            });
            setRecommendations(result);
        } catch (error) {
            console.error("Error getting AI recommendations:", error);
            toast({ title: "Error", description: "Failed to get AI recommendations.", variant: "destructive"});
        } finally {
            setIsLoading(false);
        }
    }
    
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
                    details: { stageName }
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
                     <Button onClick={handleGetRecommendations} disabled={isLoading}>
                        {isLoading ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary-foreground border-t-transparent mr-2"></div>
                        ): (
                            <Lightbulb className="mr-2 h-4 w-4"/>
                        )}
                        Get AI Recommendations
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {recommendations && (
                     <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>AI Recommendations</AlertTitle>
                        <AlertDescription>
                            <ul className="space-y-2 mt-2">
                            {recommendations.recommendations.map((rec, index) => (
                                <li key={index} className="text-sm">
                                    - For stage <span className="font-semibold">{rec.stage}</span>, suggest action <span className="font-semibold">{`'${rec.action}'`}</span> after <span className="font-semibold">{rec.triggerDays} days</span>. (Confidence: {Math.round(rec.confidence * 100)}%)
                                    <p className="text-xs text-muted-foreground pl-4">{rec.rationale}</p>
                                </li>
                            ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

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
