'use client';

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Lead } from "@/lib/types";

interface SearchResult {
    title: string;
    link: string;
    snippet: string;
}

export default function NextBestActionPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

    useEffect(() => {
        const fetchLeads = async () => {
            const leadsCollection = collection(db, 'leads');
            const leadsSnapshot = await getDocs(leadsCollection);
            const leadsList = leadsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Lead);
            setLeads(leadsList);
        };
        fetchLeads();
    }, []);

    const handleLeadSelect = (leadId: string) => {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
            setSelectedLead(lead);
            // Simulate web search
            setSearchResults([
                {
                    title: `${lead.accountName} - Company Website`,
                    link: `#`,
                    snippet: `Official website for ${lead.accountName}, a leader in the industry.`
                },
                {
                    title: `${lead.accountName} on LinkedIn`,
                    link: `#`,
                    snippet: `View ${lead.accountName}'s professional profile on LinkedIn.`
                },
                {
                    title: `Recent News About ${lead.accountName}`,
                    link: `#`,
                    snippet: `Latest news and articles mentioning ${lead.accountName}.`
                }
            ]);
        }
    };

    return (
        <div>
            <PageHeader
                title="Next Best Action"
                description="AI-powered market research to understand your leads better."
            />
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Lead Selection</CardTitle>
                        <CardDescription>
                            Select a lead to begin your research. The AI will gather and analyze information to provide you with strategic insights.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-md">
                            <Select onValueChange={handleLeadSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a lead..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {leads.map(lead => (
                                        <SelectItem key={lead.id} value={lead.id}>{lead.accountName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Separator />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Lead Activity & Trends</CardTitle>
                                <CardDescription>
                                    An overview of the lead's recent activities and business interests.
                                </CardDescription>
                            </Header>
                            <CardContent>
                                {selectedLead ? (
                                    <p>Showing activity for {selectedLead.accountName}.</p>
                                ) : (
                                    <p className="text-muted-foreground">Select a lead to see their activity and trends.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Related Links</CardTitle>
                                <CardDescription>
                                    Recent social media posts and other relevant links.
                                </CardDescription>
                            </Header>
                            <CardContent>
                                {selectedLead ? (
                                    <div className="space-y-4">
                                        {searchResults.map((result, index) => (
                                            <div key={index}>
                                                <a href={result.link} className="text-primary hover:underline font-semibold">{result.title}</a>
                                                <p className="text-muted-foreground text-sm">{result.snippet}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">Select a lead to see related links.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
