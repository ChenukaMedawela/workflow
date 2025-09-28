
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Lead, Stage, AutomationRule } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, formatISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, arrayUnion } from 'firebase/firestore';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import Link from 'next/link';
import { Timeline } from '@/components/ui/timeline';
import { logAudit } from '@/lib/audit-log';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const formSchema = z.object({
  accountName: z.string().min(2, { message: "Account name must be at least 2 characters." }),
  sector: z.string().optional(),
  amount: z.coerce.number().min(0, "Amount must be a positive number.").optional(),
  stageId: z.string().optional(),
  contractType: z.string().optional(),
  contractStartDate: z.coerce.date().optional(),
  contractEndDate: z.coerce.date().optional(),
});

const isValidDate = (date: any) => date && !isNaN(new Date(date).getTime());

export default function ManageLeadPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const leadId = params.leadId as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [allSectors, setAllSectors] = useState<string[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (!leadId) return;

    const fetchLeadData = async () => {
      setLoading(true);
      try {
        const leadDocRef = doc(db, 'leads', leadId);
        const leadDoc = await getDoc(leadDocRef);

        if (leadDoc.exists()) {
          const leadData = { id: leadDoc.id, ...leadDoc.data() } as Lead;
          setLead(leadData);
          form.reset({
            accountName: leadData.accountName,
            sector: leadData.sector,
            amount: leadData.amount,
            stageId: leadData.stageId,
            contractType: leadData.contractType,
            contractStartDate: isValidDate(leadData.contractStartDate) ? new Date(leadData.contractStartDate) : undefined,
            contractEndDate: isValidDate(leadData.contractEndDate) ? new Date(leadData.contractEndDate) : undefined,
          });
        } else {
          toast({ title: 'Error', description: 'Lead not found.', variant: 'destructive' });
          router.push('/leads');
        }

        const stagesCollection = collection(db, 'pipelineStages');
        const stagesSnapshot = await getDocs(stagesCollection);
        const stagesList = stagesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Stage).sort((a, b) => a.order - b.order);
        setStages(stagesList);
        
        const rulesCollection = collection(db, 'automationRules');
        const rulesSnapshot = await getDocs(rulesCollection);
        const rulesList = rulesSnapshot.docs.map(doc => ({ ...doc.data(), stageId: doc.id }) as AutomationRule);
        setAutomationRules(rulesList);

        const leadsCollection = collection(db, 'leads');
        const leadsSnapshot = await getDocs(leadsCollection);
        const leadsData = leadsSnapshot.docs.map(doc => doc.data() as Lead);
        const uniqueSectors = [...new Set(leadsData.map(l => l.sector).filter(Boolean))] as string[];
        setAllSectors(uniqueSectors);


      } catch (error) {
        console.error('Error fetching lead:', error);
        toast({ title: 'Error', description: 'Failed to fetch lead data.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchLeadData();
  }, [leadId, form, router, toast]);

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!lead) return;
    
    try {
      const leadRef = doc(db, 'leads', leadId);

      const updatedData: any = {
        ...data,
        amount: data.amount || 0,
        contractStartDate: data.contractStartDate ? formatISO(data.contractStartDate) : null,
        contractEndDate: data.contractEndDate ? formatISO(data.contractEndDate) : null,
      };

      if (data.stageId && data.stageId !== lead.stageId) {
        const now = formatISO(new Date());
        const newHistoryEntry = { stageId: data.stageId, timestamp: now };
        updatedData.stageHistory = arrayUnion(newHistoryEntry);
      }
      
      const originalLead = {...lead};

      await updateDoc(leadRef, updatedData);
      
      await logAudit({
        action: 'update_lead',
        from: originalLead,
        to: { ...originalLead, ...updatedData },
        details: { leadId: lead.id, leadName: lead.accountName }
      });


      toast({
        title: 'Lead Updated',
        description: 'The lead has been successfully updated.',
      });
      router.push('/leads');
    } catch (error) {
      console.error('Error updating lead: ', error);
      toast({
        title: 'Error',
        description: 'There was an error updating the lead. Please try again.',
        variant: 'destructive',
      });
    }
  }
  
  const activeStages = stages.filter(s => !s.isIsolated);
  const filteredSectors = allSectors.filter(sector => sector.toLowerCase().includes(inputValue.toLowerCase()));
  const showAddOption = inputValue && !filteredSectors.some(s => s.toLowerCase() === inputValue.toLowerCase());

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!lead) {
    return null; 
  }

  return (
    <>
      <PageHeader
        title="Manage Lead"
        description={`Editing details for ${lead.accountName}`}
      />
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/leads">Leads</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{lead.accountName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Lead Information</CardTitle>
                        <CardDescription>Basic details about the lead.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
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
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                                                                form.setValue("sector", newSector);
                                                                setAllSectors(prev => [...prev, newSector]);
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
                                <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select a stage" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {activeStages.map((stage) => (
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
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contract Details</CardTitle>
                        <CardDescription>Information about the contract agreement.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-6 pt-6">
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
                            name="contractStartDate"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contract Start Date</FormLabel>
                                <FormControl>
                                <Input
                                    type="date"
                                    {...field}
                                    value={isValidDate(field.value) ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                                />
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
                                <Input
                                    type="date"
                                    {...field}
                                    value={isValidDate(field.value) ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
                
                <div className="flex gap-2">
                    <Button type="submit">Save Changes</Button>
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                </div>
            </form>
        </Form>
        </div>
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Lead Journey</CardTitle>
                    <CardDescription>A timeline of this lead's progression.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Timeline history={lead.stageHistory} stages={stages} lead={lead} automationRules={automationRules} />
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}

    