// Workflow Recommendation Flow
'use server';

/**
 * @fileOverview An AI agent that suggests optimal automation rules for the sales pipeline.
 *
 * - suggestAutomationRules - A function that handles the automation rule suggestion process.
 * - SuggestAutomationRulesInput - The input type for the suggestAutomationRules function.
 * - SuggestAutomationRulesOutput - The return type for the suggestAutomationRules function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAutomationRulesInputSchema = z.object({
  leadAttributes: z.record(z.any()).describe('Lead attributes and their current values, such as stage, sector, contract type, amount, etc.'),
  historicalData: z.array(z.record(z.any())).describe('Historical data on lead conversions and outcomes, including attributes and timestamps.'),
  currentPipelineStages: z.array(z.string()).describe('The names of the current pipeline stages in order.'),
});
export type SuggestAutomationRulesInput = z.infer<typeof SuggestAutomationRulesInputSchema>;

const SuggestAutomationRulesOutputSchema = z.object({
  recommendations: z.array(z.object({
    stage: z.string().describe('The stage to apply the automation rule to.'),
    triggerDays: z.number().describe('The number of days a lead has been in the stage before triggering the automation.'),
    action: z.enum(['Move to Next Stage', 'Move to Global Stage']).describe('The action to take when the trigger is met.'),
    confidence: z.number().describe('A confidence score (0-1) for the recommendation.'),
    rationale: z.string().describe('The AI rationale for the recommendation.'),
  })).describe('Recommended automation rules for the sales pipeline.'),
});
export type SuggestAutomationRulesOutput = z.infer<typeof SuggestAutomationRulesOutputSchema>;

export async function suggestAutomationRules(input: SuggestAutomationRulesInput): Promise<SuggestAutomationRulesOutput> {
  return suggestAutomationRulesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAutomationRulesPrompt',
  input: {
    schema: SuggestAutomationRulesInputSchema,
  },
  output: {
    schema: SuggestAutomationRulesOutputSchema,
  },
  prompt: `You are an AI assistant designed to optimize sales pipelines by suggesting automation rules.

  Analyze the provided lead attributes, historical data, and current pipeline stages to recommend automation rules that will improve pipeline efficiency.

  Consider factors such as lead conversion rates, average time spent in each stage, and lead attributes that correlate with successful conversions.

  Historical Data:
  {{#each historicalData}}
  - {{{this}}}
  {{/each}}

  Lead Attributes:
  {{leadAttributes}}

  Current Pipeline Stages:
  {{currentPipelineStages}}

  Provide recommendations for each stage, including the trigger (number of days a lead has been in the stage), the action to take (Move to Next Stage, Move to Global Stage) when the trigger is met, a confidence score, and a brief rationale for the recommendation.

  Ensure that the suggested automation rules are practical and aligned with the overall goal of improving sales pipeline efficiency.

  Format your response as a JSON object matching the following schema:
  ${JSON.stringify(SuggestAutomationRulesOutputSchema.describe)}
  `,
});

const suggestAutomationRulesFlow = ai.defineFlow(
  {
    name: 'suggestAutomationRulesFlow',
    inputSchema: SuggestAutomationRulesInputSchema,
    outputSchema: SuggestAutomationRulesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
