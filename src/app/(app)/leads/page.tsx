

"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { ExternalLink, Edit, X, ChevronDown, Filter, Plus, XCircle, Check } from "lucide-react";
import { EditLeadDialog } from "@/components/edit-lead-dialog";
import { ExportDialog } from "./_components/export-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit-log";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExpandingSearch } from "@/components/ui/expanding-search";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [stageFilter, setStageFilter] = useState<string[]>([]);
    const [sectorFilter, setSectorFilter] = useState<string[]>([]);
    const [entityFilter, setEntityFilter] = useState<string[]>([]);
    const [contractTypeFilter, setContractTypeFilter] = useState<string[]>([]);


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

        if (searchQuery) {
            filtered = filtered.filter(lead =>
                lead.accountName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (stageFilter.length > 0) {
            const stageIds = stages.filter(s => stageFilter.includes(s.name)).map(s => s.id);
            filtered = filtered.filter(lead => stageIds.includes(lead.stageId || ''));
        }
        if (sectorFilter.length > 0) {
            filtered = filtered.filter(lead => sectorFilter.includes(lead.sector));
        }
        if (entityFilter.length > 0 && isSuper) {
             const entityIds = entities.filter(e => entityFilter.includes(e.name)).map(e => e.id);
             filtered = filtered.filter(lead => entityIds.includes(lead.ownerEntityId));
        }
        if (contractTypeFilter.length > 0) {
            filtered = filtered.filter(lead => contractTypeFilter.includes(lead.contractType));
        }
        setFilteredLeads(filtered);
        setCurrentPage(1); // Reset to first page on filter change
    }, [stageFilter, sectorFilter, entityFilter, contractTypeFilter, searchQuery, allLeads, stages, entities, user, hasRole]);

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

    const handleSelectInverse = () => {
        const currentPageIds = paginatedLeads.map(lead => lead.id);
        const newSelectedIds = currentPageIds.filter(id => !selectedLeadIds.includes(id));
        setSelectedLeadIds(newSelectedIds);
    };
    
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
    
    const isFiltered = stageFilter.length > 0 || sectorFilter.length > 0 || entityFilter.length > 0 || contractTypeFilter.length > 0;

    const clearFilters = () => {
        setStageFilter([]);
        setSectorFilter([]);
        setEntityFilter([]);
        setContractTypeFilter([]);
    };

    const filters = [
        { title: "Stage", state: stageFilter, setState: setStageFilter, options: stages.map(s => s.name) },
        { title: "Sector", state: sectorFilter, setState: setSectorFilter, options: sectors },
        ...(isSuper ? [{ title: "Entity", state: entityFilter, setState: setEntityFilter, options: entities.map(e => e.name) }] : []),
        { title: "Contract Type", state: contractTypeFilter, setState: setContractTypeFilter, options: contractTypes },
    ];
    
    const activeFilters = useMemo(() => [
        ...stageFilter.map(value => ({ type: 'Stage', value, clear: () => setStageFilter(p => p.filter(v => v !== value))})),
        ...sectorFilter.map(value => ({ type: 'Sector', value, clear: () => setSectorFilter(p => p.filter(v => v !== value))})),
        ...entityFilter.map(value => ({ type: 'Entity', value, clear: () => setEntityFilter(p => p.filter(v => v !== value))})),
        ...contractTypeFilter.map(value => ({ type: 'Contract Type', value, clear: () => setContractTypeFilter(p => p.filter(v => v !== value))})),
    ], [stageFilter, sectorFilter, entityFilter, contractTypeFilter]);


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
            
             <div className="flex items-center gap-2 mb-4">
                <ExpandingSearch onSearch={setSearchQuery} />

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-1.5">
                            <Filter className="h-4 w-4" />
                            Filter
                            {activeFilters.length > 0 && (
                                <>
                                 <Separator orientation="vertical" className="h-4 mx-1" />
                                 <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                    {activeFilters.length}
                                </Badge>
                               </>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                         <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">Filter Leads</h4>
                                {isFiltered && <Button variant="link" size="sm" onClick={clearFilters} className="h-auto p-0">Clear all</Button>}
                             </div>
                            
                            {filters.map(({ title, state, setState, options }) => (
                                <div key={title}>
                                    <p className="text-xs text-muted-foreground mb-2">{title}</p>
                                    <Command>
                                        <CommandInput placeholder={`Filter by ${title.toLowerCase()}...`} />
                                        <CommandList>
                                            <CommandEmpty>No results found.</CommandEmpty>
                                            <CommandGroup>
                                                {options.map((option) => {
                                                    const isSelected = state.includes(option);
                                                    return (
                                                    <CommandItem
                                                        key={option}
                                                        onSelect={() => {
                                                            if (isSelected) {
                                                                setState(state.filter((s) => s !== option));
                                                            } else {
                                                                setState([...state, option]);
                                                            }
                                                        }}
                                                    >
                                                        <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"}`}>
                                                            <Checkbox.Indicator>
                                                                <Check className="h-4 w-4" />
                                                            </Checkbox.Indicator>
                                                        </div>
                                                        <span>{option}</span>
                                                    </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </div>
                            ))}
                         </div>
                    </PopoverContent>
                </Popover>

                {isFiltered && (
                     <div className="flex-1 flex items-center gap-2">
                         {activeFilters.map(({ type, value, clear }) => (
                            <Badge key={`${type}-${value}`} variant="outline" className="gap-1.5 pr-1">
                                <span className="font-normal text-muted-foreground">{type}:</span>
                                <span>{value}</span>
                                <button onClick={clear} className="rounded-full hover:bg-muted p-0.5">
                                    <XCircle className="h-3 w-3" />
                                    <span className="sr-only">Remove filter</span>
                                </button>
                            </Badge>
                         ))}
                    </div>
                )}
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
                                    <TableHead>Account Name</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Sector</TableHead>
                                    <TableHead>Owner Entity</TableHead>
                                    <TableHead>Contract Type</TableHead>
                                    <TableHead>Contract Start</TableHead>
                                    <TableHead>Contract End</TableHead>
                                    <TableHead className="text-right w-[150px]">
                                        {!isBulkEditMode ? (
                                            <ExportDialog 
                                                leads={filteredLeads} 
                                                getStageName={getStageName} 
                                                getOwnerEntityName={getOwnerEntityName} 
                                                stages={stages}
                                                entities={entities}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-end pr-4">
                                                 <Checkbox
                                                    checked={selectedLeadIds.length === paginatedLeads.length && paginatedLeads.length > 0}
                                                    onCheckedChange={handleSelectAll}
                                                    aria-label="Select all"
                                                />
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
                                                            <ChevronDown className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={handleSelectInverse}>
                                                            Select Inverse
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        )}
                                    </TableHead>
                                </TableRow>
                                {isBulkEditMode && (
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableCell colSpan={8} className="p-2">
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
                                            <TableCell className="font-medium">{lead.accountName || 'N/A'}</TableCell>
                                            <TableCell>{getStageName(lead.stageId)}</TableCell>
                                            <TableCell>{lead.sector || 'N/A'}</TableCell>
                                            <TableCell>{getOwnerEntityName(lead)}</TableCell>
                                            <TableCell>{lead.contractType || 'N_A'}</TableCell>
                                            <TableCell>{isValidDate(lead.contractStartDate) ? format(new Date(lead.contractStartDate), "PPP") : 'N_A'}</TableCell>
                                            <TableCell>{isValidDate(lead.contractEndDate) ? format(new Date(lead.contractEndDate), "PPP") : 'N_A'}</TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                {isBulkEditMode ? (
                                                    <div className="flex justify-end pr-4">
                                                        <Checkbox
                                                            checked={selectedLeadIds.includes(lead.id)}
                                                            onCheckedChange={() => handleSelectLead(lead.id)}
                                                            aria-label="Select row"
                                                        />
                                                    </div>
                                                ) : (
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link href={`/leads/${lead.id}`}>
                                                            <ExternalLink className="h-4 w-4"/>
                                                            <span className="sr-only">Open lead</span>
                                                        </Link>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
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

    

    

    

    

    

    

    
