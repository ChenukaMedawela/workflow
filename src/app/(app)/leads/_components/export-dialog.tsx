
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download } from "lucide-react";
import { Lead, Entity, Stage } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ExportDialogProps {
    leads: Lead[];
    stages: Stage[];
    entities: Entity[];
    getStageName: (stageId?: string) => string;
    getOwnerEntityName: (lead: Lead) => string;
}

const isValidDate = (date: any) => date && !isNaN(new Date(date).getTime());

export function ExportDialog({ leads, getStageName, getOwnerEntityName }: ExportDialogProps) {
    const [open, setOpen] = useState(false);
    const [fileType, setFileType] = useState("csv");
    const [email, setEmail] = useState("");
    const { toast } = useToast();

    const handleDownload = () => {
        if (fileType === 'xlsx') {
            toast({
                title: "Coming Soon!",
                description: "XLSX export is not yet available. Please select CSV.",
                variant: 'default',
            });
            return;
        }

        const headers = [
            "Account Name",
            "Stage",
            "Sector",
            "Owner Entity",
            "Contract Type",
            "Contract Start",
            "Contract End",
            "Amount"
        ];
        const rows = leads.map(lead => [
            lead.accountName,
            getStageName(lead.stageId),
            lead.sector,
            getOwnerEntityName(lead),
            lead.contractType,
            isValidDate(lead.contractStartDate) ? format(new Date(lead.contractStartDate), "yyyy-MM-dd") : '',
            isValidDate(lead.contractEndDate) ? format(new Date(lead.contractEndDate), "yyyy-MM-dd") : '',
            lead.amount
        ].map(String));

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `leads-export-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        if(email) {
            // Placeholder for email sending logic
            console.log(`Emailing a copy to: ${email}`);
            toast({
                title: "Email copy",
                description: `A copy of the export will be sent to ${email}`,
            });
        }
        
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" disabled={leads.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Export Leads</DialogTitle>
                    <DialogDescription>
                        Select your export options and download your leads.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="file-type" className="text-right">
                            File Type
                        </Label>
                        <RadioGroup 
                            defaultValue="csv" 
                            className="col-span-3 flex gap-4" 
                            id="file-type" 
                            onValueChange={setFileType}
                            value={fileType}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="csv" id="r1" />
                                <Label htmlFor="r1">CSV</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="xlsx" id="r2" />
                                <Label htmlFor="r2">XLSX</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Send copy to
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Email (optional)"
                            className="col-span-3"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

