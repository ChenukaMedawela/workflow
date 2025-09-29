
"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { AddLeadDialog } from "./_components/add-lead-dialog";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, getDocs, query, writeBatch, doc } from 'firebase/firestore';
import { Lead, Stage, Entity, AutomationRule } from '@/lib/types';
import { useAuth } from "@/hooks/use-auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, formatISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Edit, X } from "lucide-react";
import { EditLeadDialog } from "@/components/edit-lead-dialog";
import { ExportDialog } from "./_components/export-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit-log";

const contractTypes = ['Annual', 'Monthly', 'One-Time'];
const isValidDate = (date: any) => date && !isNaN(new Date(date).getTime());

export default function LeadsPage() {
    const [allLeads, setAllLeads] = useState<Lead[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
    const [stages, setStages] = useState<Stage[]>([]);
    const [sectors, setSectors] = useState<string[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, hasRole } = useAuth();
    const [stageFilter, setStageFilter] = useState('all');
    const [sectorFilter, setSectorFilter] = useState('all');
    const [entityFilter, setEntityFilter] = useState('all');
    const [contractTypeFilter, setContractTypeFilter] = useState('all');

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [isBulkEditMode, setIsBulkEditMode] = useState(false);
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [bulkActionType, setBulkActionType] = useState('');
    const [bulkActionValue, setBulkActionValue] = useState('');
    const { toast } = useToast();

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);


    useEffect(() => {
        if (!user) return;

        setLoading(true);
        
        const fetchAuxiliaryData = async () => {
            const stagesPromise = getDocs(collection(db, 'pipelineStages'));
            const entitiesPromise = getDocs(collection(db, 'entities'));
            const rulesPromise = getDocs(collection(db, 'automationRules'));
            const [stagesSnapshot, entitiesSnapshot, rulesSnapshot] = await Promise.all([stagesPromise, entitiesPromise, rulesPromise]);
            
            const stagesData = stagesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Stage).sort((a,b) => a.order - b.order);
            setStages(stagesData);
            const entitiesData = entitiesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Entity);
            setEntities(entitiesData);
            const rulesData = rulesSnapshot.docs.map(doc => ({ ...doc.data(), stageId: doc.id }) as AutomationRule);
            setAutomationRules(rulesData);

            return { stagesData, entitiesData, rulesData };
        };

        const setupListener = async () => {
            await fetchAuxiliaryData();

            const leadsQuery = query(collection(db, 'leads'));
            const unsubscribe = onSnapshot(leadsQuery, (leadsSnapshot) => {
                const leadsData = leadsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Lead);
                
                const uniqueSectors = [...new Set(leadsData.map(lead => lead.sector).filter(Boolean))] as string[];
                setSectors(uniqueSectors);
                setAllLeads(leadsData);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching leads:", error);
                setLoading(false);
            });

            return unsubscribe;
        }

        const unsubscribePromise = setupListener();

        return () => {
            unsubscribePromise.then(unsub => unsub && unsub());
        };
    }, [user]);

    useEffect(() => {
        let leadsView = allLeads;
        const isSuper = hasRole(['Super User', 'Super Admin']);

        if (!isSuper && user && user.entityId) {
            const globalStage = stages.find(s => s.name === 'Global');
            leadsView = allLeads.filter(lead => lead.ownerEntityId === user.entityId || lead.stageId === globalStage?.id);
        }

        let filtered = leadsView;

        if (stageFilter !== 'all') {
            const selectedStage = stages.find(s => s.name === stageFilter);
            filtered = filtered.filter(lead => lead.stageId === selectedStage?.id);
        }
        if (sectorFilter !== 'all') {
            filtered = filtered.filter(lead => lead.sector === sectorFilter);
        }
        if (entityFilter !== 'all' && isSuper) {
             if (entityFilter === 'Global') {
                const globalStage = stages.find(s => s.name === 'Global');
                filtered = filtered.filter(lead => lead.stageId === globalStage?.id && !lead.ownerEntityId);
            } else {
                const selectedEntity = entities.find(e => e.name === entityFilter);
                filtered = filtered.filter(lead => lead.ownerEntityId === selectedEntity?.id);
            }
        }
        if (contractTypeFilter !== 'all') {
            filtered = filtered.filter(lead => lead.contractType === contractTypeFilter);
        }
        setFilteredLeads(filtered);
        setCurrentPage(1); // Reset to first page on filter change
    }, [stageFilter, sectorFilter, entityFilter, contractTypeFilter, allLeads, stages, entities, user, hasRole]);

    // Handle ESC key press to exit bulk edit mode
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsBulkEditMode(false);
                setSelectedLeadIds([]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);


    const handleRowClick = (lead: Lead) => {
        if (isBulkEditMode) {
            handleSelectLead(lead.id);
        } else {
            setSelectedLead(lead);
            setIsEditDialogOpen(true);
        }
    }
    
    const getStageName = (stageId?: string) => stages.find(s => s.id === stageId)?.name || 'N/A';
    
    const getOwnerEntityName = (lead: Lead) => {
        const stageName = getStageName(lead.stageId);
        if (stageName === 'Global') return 'Global';
        if (lead.ownerEntityId) {
            return entities.find(e => e.id === lead.ownerEntityId)?.name || 'N/A';
        }
        return 'N/A';
    }

    const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);
    const paginatedLeads = filteredLeads.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const isSuper = hasRole(['Super User', 'Super Admin']);

    const toggleBulkEditMode = () => {
        setIsBulkEditMode(!isBulkEditMode);
        setSelectedLeadIds([]);
    }

    const handleSelectLead = (leadId: string) => {
        setSelectedLeadIds(prev =>
            prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
        );
    }

    const handleSelectAll = () => {
        if (selectedLeadIds.length === paginatedLeads.length) {
            setSelectedLeadIds([]);
        } else {
            setSelectedLeadIds(paginatedLeads.map(lead => lead.id));
        }
    }
    
    const handleApplyBulkAction = async () => {
        if (selectedLeadIds.length === 0 || !bulkActionType || !bulkActionValue) {
            toast({
                title: "Invalid Action",
                description: "Please select leads, an action, and a value to apply.",
                variant: "destructive"
            });
            return;
        }

        const batch = writeBatch(db);
        const now = formatISO(new Date());

        selectedLeadIds.forEach(leadId => {
            const leadRef = doc(db, 'leads', leadId);
            let updateData: { [key: string]: any } = { [bulkActionType]: bulkActionValue };
            
            if (bulkActionType === 'stageId') {
                const leadToUpdate = allLeads.find(l => l.id === leadId);
                if (leadToUpdate && leadToUpdate.stageId !== bulkActionValue) {
                    const newHistoryEntry = { stageId: bulkActionValue, timestamp: now };
                    updateData.stageHistory = [...(leadToUpdate.stageHistory || []), newHistoryEntry];
                }
            }
            batch.update(leadRef, updateData);
        });

        try {
            await batch.commit();

            const actionName = `bulk_update_${bulkActionType}`;
            await logAudit({
                action: actionName,
                to: { [bulkActionType]: bulkActionValue },
                details: { leadIds: selectedLeadIds, count: selectedLeadIds.length },
                user,
            });

            toast({
                title: "Bulk Update Successful",
                description: `${selectedLeadIds.length} leads have been updated.`
            });
            setIsBulkEditMode(false);
            setSelectedLeadIds([]);
        } catch (error) {
            console.error("Error during bulk update: ", error);
            toast({
                title: "Error",
                description: "An error occurred during the bulk update.",
                variant: "destructive"
            });
        }
    }
    
    const renderBulkActionInput = () => {
        if (!bulkActionType) return null;

        switch (bulkActionType) {
            case 'stageId':
                return (
                    <Select onValueChange={setBulkActionValue} value={bulkActionValue}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Stage" />
                        </SelectTrigger>
                        <SelectContent>
                            {stages.filter(s => !s.isIsolated).map(stage => (
                                <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case 'ownerEntityId':
                return (
                    <Select onValueChange={setBulkActionValue} value={bulkActionValue}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Entity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="global">Global (Unassigned)</SelectItem>
                            {entities.map(entity => (
                                <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            default:
                return null;
        }
    };


    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title="Leads"
                description="A simple list of all leads and their current stage."
            >
                <div className="flex items-center gap-2">
                    {isBulkEditMode ? (
                        <Button variant="outline" onClick={toggleBulkEditMode}>
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={toggleBulkEditMode}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Leads
                        </Button>
                    )}
                    <AddLeadDialog sectors={sectors} onSectorAdded={(newSector) => setSectors(prev => [...prev, newSector])} />
                </div>
            </PageHeader>

            <div className="mb-4 flex flex-wrap items-end gap-4">
                <div className="w-64">
                    <Label htmlFor="stage-filter">Filter by Stage</Label>
                    <Select value={stageFilter} onValueChange={setStageFilter}>
                        <SelectTrigger id="stage-filter">
                            <SelectValue placeholder="Select a stage to filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stages</SelectItem>
                            {stages.map(stage => (
                                <SelectItem key={stage.id} value={stage.name}>
                                    {stage.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-64">
                    <Label htmlFor="sector-filter">Filter by Sector</Label>
                    <Select value={sectorFilter} onValueChange={setSectorFilter}>
                        <SelectTrigger id="sector-filter">
                            <SelectValue placeholder="Select a sector to filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sectors</SelectItem>
                            {sectors.map(sector => (
                                <SelectItem key={sector} value={sector}>
                                    {sector}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {isSuper && <div className="w-64">
                    <Label htmlFor="entity-filter">Filter by Owner Entity</Label>
                    <Select value={entityFilter} onValueChange={setEntityFilter}>
                        <SelectTrigger id="entity-filter">
                            <SelectValue placeholder="Select an entity to filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Entities</SelectItem>
                            <SelectItem value="Global">Global (Unassigned)</SelectItem>
                            {entities.map(entity => (
                                <SelectItem key={entity.id} value={entity.name}>
                                    {entity.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>}
                 <div className="w-64">
                    <Label htmlFor="contract-type-filter">Filter by Contract Type</Label>
                    <Select value={contractTypeFilter} onValueChange={setContractTypeFilter}>
                        <SelectTrigger id="contract-type-filter">
                            <SelectValue placeholder="Select a contract type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Contract Types</SelectItem>
                            {contractTypes.map(type => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-grow" />
            </div>


            <div className="flex-1 min-h-0">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="rounded-md border relative overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card z-10">
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        {isBulkEditMode && (
                                            <Checkbox
                                                checked={selectedLeadIds.length === paginatedLeads.length && paginatedLeads.length > 0}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                            />
                                        )}
                                    </TableHead>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Sector</TableHead>
                                    <TableHead>Owner Entity</TableHead>
                                    <TableHead>Contract Type</TableHead>
                                    <TableHead>Contract Start</TableHead>
                                    <TableHead>Contract End</TableHead>
                                    <TableHead className="text-right w-[120px]">
                                        {!isBulkEditMode && (
                                            <ExportDialog 
                                                leads={filteredLeads} 
                                                getStageName={getStageName} 
                                                getOwnerEntityName={getOwnerEntityName} 
                                                stages={stages}
                                                entities={entities}
                                            />
                                        )}
                                    </TableHead>
                                </TableRow>
                                {isBulkEditMode && (
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableCell colSpan={9} className="p-2">
                                            <div className="flex items-center gap-2">
                                                 <span className="text-sm font-medium pl-2">{selectedLeadIds.length} selected</span>
                                                <Select onValueChange={setBulkActionType} value={bulkActionType}>
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="Select Bulk Action" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="stageId">Change Stage</SelectItem>
                                                        <SelectItem value="ownerEntityId">Change Owner Entity</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {renderBulkActionInput()}
                                                <Button onClick={handleApplyBulkAction} disabled={selectedLeadIds.length === 0 || !bulkActionType || !bulkActionValue}>Apply</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableHeader>
                            <TableBody>
                                {paginatedLeads.length > 0 ? (
                                    paginatedLeads.map((lead) => (
                                        <TableRow 
                                            key={lead.id} 
                                            onClick={() => handleRowClick(lead)} 
                                            className={isBulkEditMode ? 'cursor-pointer' : ''}
                                            data-state={selectedLeadIds.includes(lead.id) ? "selected" : ""}
                                        >
                                            <TableCell>
                                                {isBulkEditMode && (
                                                    <Checkbox
                                                        checked={selectedLeadIds.includes(lead.id)}
                                                        onCheckedChange={() => handleSelectLead(lead.id)}
                                                        aria-label="Select row"
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{lead.accountName || 'N/A'}</TableCell>
                                            <TableCell>{getStageName(lead.stageId)}</TableCell>
                                            <TableCell>{lead.sector || 'N/A'}</TableCell>
                                            <TableCell>{getOwnerEntityName(lead)}</TableCell>
                                            <TableCell>{lead.contractType || 'N_A'}</TableCell>
                                            <TableCell>{isValidDate(lead.contractStartDate) ? format(new Date(lead.contractStartDate), "PPP") : 'N_A'}</TableCell>
                                            <TableCell>{isValidDate(lead.contractEndDate) ? format(new Date(lead.contractEndDate), "PPP") : 'N_A'}</TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                {!isBulkEditMode && (
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/leads/${lead.id}`}>
                                                            Open <ArrowRight className="ml-2 h-4 w-4"/>
                                                        </Link>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            No leads found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
             <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * rowsPerPage + 1, filteredLeads.length)} to {Math.min(currentPage * rowsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="rows-per-page">Rows per page</Label>
                        <Select value={String(rowsPerPage)} onValueChange={(value) => setRowsPerPage(Number(value))}>
                            <SelectTrigger id="rows-per-page" className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[10, 20, 50, 100, 200].map(size => (
                                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
            {selectedLead && (
                <EditLeadDialog
                    lead={selectedLead}
                    stages={stages}
                    entities={entities}
                    sectors={sectors}
                    onSectorAdded={(newSector) => setSectors(prev => [...prev, newSector])}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    automationRules={automationRules}
                />
            )}
        </div>
    );
}

    

    