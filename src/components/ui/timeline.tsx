
'use client';

import { cn } from "@/lib/utils";
import { AutomationRule, Lead, Stage, StageHistoryEntry } from "@/lib/types";
import { addDays, format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import React from "react";
import { Clock, Bot } from "lucide-react";

interface TimelineProps {
  history: StageHistoryEntry[];
  stages: Stage[];
  lead?: Lead;
  automationRules?: AutomationRule[];
}

export function Timeline({ history, stages, lead, automationRules }: TimelineProps) {
  const getStageName = (stageId: string) => {
    return stages.find(s => s.id === stageId)?.name || "Unknown Stage";
  }

  if (!history || history.length === 0) {
    return <p className="text-sm text-muted-foreground">No stage history available for this lead.</p>;
  }

  // Sort history from oldest to newest
  const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const currentStageEntry = sortedHistory[sortedHistory.length - 1];
  const currentStageId = lead?.stageId;
  const activeRule = automationRules?.find(r => r.stageId === currentStageId && r.enabled);

  let automationEntry = null;
  if (activeRule && currentStageEntry) {
    const moveDate = addDays(new Date(currentStageEntry.timestamp), activeRule.triggerDays);
    const nextStageName = stages.find(s => s.order === stages.find(s => s.id === currentStageId)!.order + 1)?.name || 'Next Stage';

    automationEntry = {
      stageName: activeRule.action === 'Move to Next Stage' ? nextStageName : 'Global Stage',
      timestamp: moveDate.toISOString()
    };
  }

  return (
    <div className="relative">
      <div className="absolute left-2.5 top-2.5 h-full w-0.5 -translate-x-1/2 bg-border" />
      <div className="space-y-6">
        {sortedHistory.map((entry, index) => (
          <div key={index} className="relative flex items-center gap-4">
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center ring-8 ring-background z-10">
                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
              </div>
              <div className="grow">
                  <p className="font-semibold text-foreground">
                      {`Moved to '${getStageName(entry.stageId)}'`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.timestamp), "MMM d, yyyy 'at' h:mm a")}
                  </p>
              </div>
          </div>
        ))}
        {automationEntry && (
            <div className="relative flex items-center gap-4">
                <div className="absolute left-2.5 bottom-full h-6 w-0.5 -translate-x-1/2 bg-border border-dashed" />
                 <div className="h-5 w-5 rounded-full bg-muted border-2 border-dashed border-primary flex items-center justify-center ring-8 ring-background z-10">
                    <Bot className="h-3 w-3 text-primary" />
                </div>
                <div className="grow">
                     <p className="font-semibold text-foreground">
                        {`Automated move to '${automationEntry.stageName}'`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {format(new Date(automationEntry.timestamp), "MMM d, yyyy")} (Predicted)
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}


export function HorizontalTimeline({ history, stages, lead, automationRules }: TimelineProps) {
    const getStageInfo = (stageId: string, timestamp: string) => {
        const name = stages.find(s => s.id === stageId)?.name || "Unknown";
        const date = format(new Date(timestamp), "MMM d, yyyy");
        return { name, date };
    }

    if (!history || history.length === 0) {
        return null;
    }

    const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const currentStageEntry = sortedHistory[sortedHistory.length - 1];
    const currentStageId = lead?.stageId;
    const activeRule = automationRules?.find(r => r.stageId === currentStageId && r.enabled);

    let automationEntry = null;
    if (activeRule && currentStageEntry) {
        const moveDate = addDays(new Date(currentStageEntry.timestamp), activeRule.triggerDays);
        const nextStageName = stages.find(s => s.order === stages.find(s => s.id === currentStageId)!.order + 1)?.name || 'Next Stage';

        automationEntry = {
          stageName: activeRule.action === 'Move to Next Stage' ? nextStageName : 'Global Stage',
          timestamp: moveDate.toISOString()
        };
    }

    return (
        <TooltipProvider>
            <div className="flex items-center space-x-2 pt-3 mt-3 border-t">
                {sortedHistory.map((entry, index) => (
                    <React.Fragment key={entry.timestamp}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="h-3 w-3 rounded-full bg-primary/50 hover:bg-primary" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-semibold">{getStageInfo(entry.stageId, entry.timestamp).name}</p>
                                <p className="text-sm text-muted-foreground">{getStageInfo(entry.stageId, entry.timestamp).date}</p>
                            </TooltipContent>
                        </Tooltip>
                        {index < sortedHistory.length - 1 && (
                            <div className="h-px flex-1 bg-border" />
                        )}
                    </React.Fragment>
                ))}
                 {automationEntry && (
                    <>
                        <div className="h-px flex-1 bg-border border-dashed" />
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="h-3 w-3 rounded-full bg-transparent border border-dashed border-primary hover:bg-primary/20" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-semibold">{`Auto-move to ${automationEntry.stageName}`}</p>
                                <p className="text-sm text-muted-foreground">{format(new Date(automationEntry.timestamp), "MMM d, yyyy")} (Predicted)</p>
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}
            </div>
        </TooltipProvider>
    );
}
