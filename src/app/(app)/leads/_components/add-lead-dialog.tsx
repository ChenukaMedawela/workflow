

"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, PlusCircle, ChevronDown, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, formatISO } from "date-fns";
import { collection, addDoc, getDocs, query, where, limit } from "firebase/firestore";

import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Entity, Stage } from "@/lib/types";
import { logAudit } from "@/lib/audit-log";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const leadSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  sector: z.string().min(1, "Sector is required"),
  amount: z.coerce.number().min(0, "Amount must be a positive number").optional(),
  ownerEntityId: z.string().optional(),
  stageId: z.string().optional(),
  contractType: z.enum(["Annual", "Monthly", "One-Time"]),
  contractDuration: z.coerce.number().min(0, "Duration must be a positive number.").optional(),
  contractStartDate: z.date(),
  contractEndDate: z.date(),
});

interface AddLeadDialogProps {
    sectors: string[];
    onSectorAdded: (sector: string) => void;
}

export function AddLeadDialog({ sectors, onSectorAdded }: AddLeadDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [entities, setEntities] = React.useState<Entity[]>([]);
  const [stages, setStages] = React.useState<Stage[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [allSectors, setAllSectors] = React.useState<string[]>(sectors);
  const [comboboxOpen, setComboboxOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    setAllSectors(sectors);
  }, [sectors]);

  const form = useForm<z.infer<typeof leadSchema>>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      accountName: "",
      sector: "",
      amount: 0,
      contractType: "Annual",
      contractDuration: 12,
      contractStartDate: new Date(),
      contractEndDate: new Date(),
    },
  });

  React.useEffect(() => {
    const fetchData = async () => {
        const entitiesCollection = collection(db, 'entities');
        const entitiesSnapshot = await getDocs(entitiesCollection);
        setEntities(entitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entity)))

        const stagesCollection = collection(db, 'pipelineStages');
        const stagesSnapshot = await getDocs(stagesCollection);
        setStages(stagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stage)).sort((a,b) => a.order - b.order));
    }
    fetchData();
  }, []);

  React.useEffect(() => {
    if (user?.entityId) {
      form.setValue('ownerEntityId', user.entityId);
    }
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof leadSchema>) => {
    if (!user) {
        toast({
            title: "Error",
            description: "You must be logged in to create a lead.",
            variant: "destructive",
        });
        return;
    }

    try {
        let stageId = values.stageId;
        const now = formatISO(new Date());

        // If no stage is selected, default to the "Global" stage.
        if (!stageId) {
            const globalStageQuery = query(collection(db, 'pipelineStages'), where('name', '==', 'Global'), limit(1));
            const globalStageSnapshot = await getDocs(globalStageQuery);
            if (globalStageSnapshot.docs.length > 0) {
                stageId = globalStageSnapshot.docs[0].id;
            } else {
                // Fallback if Global stage doesn't exist for some reason
                toast({ title: "Error", description: "Default 'Global' stage not found. Please create it.", variant: "destructive" });
                return;
            }
        }
        
        const { stageId: formStageId, ...leadData } = values;
        
        const newLeadData = {
            ...leadData,
            stageId: stageId,
            amount: leadData.amount || 0,
            contractDuration: values.contractDuration || 0,
            contractStartDate: formatISO(values.contractStartDate),
            contractEndDate: formatISO(values.contractEndDate),
            addedUserId: user.id,
            addedDate: now,
            stageHistory: [{ stageId, timestamp: now }],
        };

        const docRef = await addDoc(collection(db, "leads"), newLeadData);

        await logAudit({
            action: 'create_lead',
            to: { id: docRef.id, ...newLeadData },
            details: { leadName: values.accountName }
        });

        toast({
            title: "Lead Created",
            description: `${values.accountName} has been added to the pipeline.`,
        });
        setOpen(false);
        form.reset();
    } catch (error) {
      console.error("Error adding document: ", error);
      toast({
        title: "Error",
        description: "An error occurred while creating the lead.",
        variant: "destructive",
      });
    }
  }

  const filteredSectors = allSectors.filter(sector => sector.toLowerCase().includes(inputValue.toLowerCase()));
  const showAddOption = inputValue && !filteredSectors.some(s => s.toLowerCase() === inputValue.toLowerCase());


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Enter the details of the new lead below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                  </FormControl>
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
                    <PopoverContent className="w-[375px] p-0">
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
                                        form.setValue("sector", newSector);
                                        setAllSectors(prev => [...prev, newSector]);
                                        onSectorAdded(newSector);
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50000" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                  </FormControl>
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an entity (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {entities.map((entity) => (
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
                        <SelectValue placeholder="Select a stage (optional)" />
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
                    <Input type="number" placeholder="12" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="contractStartDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Contract Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="contractEndDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Contract End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="hover:bg-primary/90">Create Lead</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
