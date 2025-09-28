
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, formatISO } from 'date-fns';
import React, { useEffect, useState, useRef } from 'react';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { db } from "@/lib/firebase";
import { arrayUnion, doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Lead, Stage, AutomationRule, Entity } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { logAudit } from "@/lib/audit-log";
import { Separator } from "./ui/separator";
import { Timeline } from "./ui/timeline";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Check, ChevronDown, PlusCircle } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";

const formSchema = z.object({
    accountName: z.string().min(2, { message: "Account name must be at least 2 characters." }),
    sector: z.string().optional(),
    amount: z.coerce.number().min(0, "Amount must be a positive number.").optional(),
    stageId: z.string().optional(),
    ownerEntityId: z.string().optional(),
    contractType: z.string().optional(),
    contractDuration: z.coerce.number().min(0, "Duration must be a positive number.").optional(),
    contractStartDate: z.coerce.date().optional(),
    contractEndDate: z.coerce.date().optional(),
});


interface EditLeadDialogProps {
    lead: Lead;
    stages: Stage[];
    entities: Entity[];
    sectors: string[];
    onSectorAdded: (sector: string) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children?: React.ReactNode;
    automationRules?: AutomationRule[];
}

const isValidDate = (date: any) => date && !isNaN(new Date(date).getTime());

export function EditLeadDialog({ lead, stages, entities, sectors, onSectorAdded, open, onOpenChange, children, automationRules }: EditLeadDialogProps) {
    const router = useRouter();
    const [shake, setShake] = useState(false);
    const saveButtonRef = useRef<HTMLButtonElement>(null);
    
    const [allSectors, setAllSectors] = useState<string[]>(sectors);
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        setAllSectors(sectors);
    }, [sectors]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            accountName: lead.accountName,
            sector: lead.sector,
            amount: lead.amount,
            stageId: lead.stageId,
            ownerEntityId: lead.ownerEntityId,
            contractType: lead.contractType,
            contractDuration: lead.contractDuration,
            contractStartDate: isValidDate(lead.contractStartDate) ? new Date(lead.contractStartDate) : undefined,
            contractEndDate: isValidDate(lead.contractEndDate) ? new Date(lead.contractEndDate) : undefined,
        }
    });

    const { formState: { isDirty } } = form;
    
    useEffect(() => {
        if (lead && open) {
            form.reset({
                accountName: lead.accountName,
                sector: lead.sector,
                amount: lead.amount,
                stageId: lead.stageId,
                ownerEntityId: lead.ownerEntityId,
                contractType: lead.contractType,
                contractDuration: lead.contractDuration,
                contractStartDate: isValidDate(lead.contractStartDate) ? new Date(lead.contractStartDate) : undefined,
                contractEndDate: isValidDate(lead.contractEndDate) ? new Date(lead.contractEndDate) : undefined,
            });
        }
    }, [lead, form, open]);

    async function onSubmit(data: z.infer<typeof formSchema>) {
        try {
            const leadRef = doc(db, "leads", lead.id);

            const updatedData: any = {
                ...data,
                amount: data.amount || 0,
                contractDuration: data.contractDuration || 0,
                contractStartDate: data.contractStartDate ? formatISO(data.contractStartDate) : null,
                contractEndDate: data.contractEndDate ? formatISO(data.contractEndDate) : null,
            };

            // If stageId has changed, add to history
            if (data.stageId && data.stageId !== lead.stageId) {
                const now = formatISO(new Date());
                const newHistoryEntry = { stageId: data.stageId, timestamp: now };
                updatedData.stageHistory = arrayUnion(newHistoryEntry);
            }
            
            const toPlainObject = (obj: any) => {
                const plainObj: {[key: string]: any} = { };
                for (const key in obj) {
                    const value = obj[key];
                    if (value?.toDate && typeof value.toDate === 'function') {
                        plainObj[key] = value.toDate().toISOString();
                    } else if (value instanceof Date) {
                        plainObj[key] = value.toISOString();
                    } else if (key === 'contractStartDate' || key === 'contractEndDate') {
                        plainObj[key] = value ? new Date(value).toISOString() : null;
                    }
                    else {
                        plainObj[key] = value;
                    }
                }
                return plainObj;
            };
            
            const originalLeadPlain = toPlainObject(lead);
            const updatedDataPlain = toPlainObject({ ...data, amount: data.amount || 0 });
            const updatedLeadPlain = { ...originalLeadPlain, ...updatedDataPlain };

            await updateDoc(leadRef, updatedData);
            
            await logAudit({
                action: 'update_lead',
                from: originalLeadPlain,
                to: updatedLeadPlain,
                details: { leadId: lead.id, leadName: lead.accountName }
            });

            toast({
                title: "Lead Updated",
                description: "The lead has been successfully updated.",
            });
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Error updating lead: ", error);
            toast({
                title: "Error",
                description: "There was an error updating the lead. Please try again.",
                variant: "destructive",
            });
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen && isDirty) {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            saveButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        onOpenChange(isOpen);
    }
    
    const handleCancel = () => {
        form.reset(); // This will revert changes to initial state, making isDirty false
        onOpenChange(false);
    }

    const trigger = children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
    ) : null;
    
    const filteredSectors = allSectors.filter(sector => sector.toLowerCase().includes(inputValue.toLowerCase()));
    const showAddOption = inputValue && !filteredSectors.some(s => s.toLowerCase() === inputValue.toLowerCase());

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Lead</DialogTitle>
                    <DialogDescription>
                        Update the details of the lead.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                            control={form.control}
                            name="accountName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Account Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Acme Inc." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                                control={form.control}
                                name="stageId"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Stage</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a stage" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {stages.map((stage) => (
                                            <SelectItem key={stage.id} value={stage.id}>
                                            {stage.name}
                                            </SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                             <FormField
                                control={form.control}
                                name="sector"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Sector</FormLabel>
                                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                            <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                >
                                                {field.value
                                                    ? allSectors.find(
                                                        (sector) => sector === field.value
                                                    )
                                                    : "Select sector"}
                                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput 
                                                        placeholder="Search sector..." 
                                                        value={inputValue}
                                                        onValueChange={setInputValue}
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>
                                                            {showAddOption ? ' ' : 'No sector found.'}
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                        {filteredSectors.map((sector) => (
                                                            <CommandItem
                                                            key={sector}
                                                            value={sector}
                                                            onSelect={() => {
                                                                form.setValue("sector", sector);
                                                                setComboboxOpen(false);
                                                            }}
                                                            >
                                                            <Check
                                                                className={cn(
                                                                "mr-2 h-4 w-4",
                                                                sector === field.value
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                                )}
                                                            />
                                                            {sector}
                                                            </CommandItem>
                                                        ))}
                                                        {showAddOption && (
                                                            <CommandItem
                                                                value={inputValue}
                                                                onSelect={() => {
                                                                    const newSector = inputValue.trim();
                                                                    form.setValue("sector", newSector, { shouldDirty: true });
                                                                    if (!allSectors.includes(newSector)) {
                                                                        const updatedSectors = [...allSectors, newSector];
                                                                        setAllSectors(updatedSectors);
                                                                        onSectorAdded(newSector);
                                                                    }
                                                                    setComboboxOpen(false);
                                                                    setInputValue('');
                                                                }}
                                                                >
                                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                                Add: {inputValue}
                                                            </CommandItem>
                                                            )}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ownerEntityId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Owner Entity</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an entity" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {entities.map(entity => (
                                                    <SelectItem key={entity.id} value={entity.id}>
                                                        {entity.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Amount</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name="contractType"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Contract Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select contract type" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Annual">Annual</SelectItem>
                                        <SelectItem value="Monthly">Monthly</SelectItem>
                                        <SelectItem value="One-Time">One-Time</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                             <FormField
                                control={form.control}
                                name="contractDuration"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contract Duration (months)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                            control={form.control}
                            name="contractStartDate"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Contract Start Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} value={isValidDate(field.value) ? format(new Date(field.value), 'yyyy-MM-dd') : ''} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name="contractEndDate"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Contract End Date</FormLabel>
                                <FormControl>
                                <Input type="date" {...field} value={isValidDate(field.value) ? format(new Date(field.value), 'yyyy-MM-dd') : ''} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-lg font-medium mb-4">Lead Journey</h3>
                            <Timeline history={lead.stageHistory} stages={stages} lead={lead} automationRules={automationRules} />
                        </div>
                        
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
                            <Button ref={saveButtonRef} type="submit" className={cn("hover:bg-primary/90", { 'animate-shake': shake })}>Save Changes</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
