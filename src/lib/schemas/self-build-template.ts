import { z } from "zod";

// A single stage in a self-build template (percentage-based with default timing)
export const SelfBuildTemplateStageSchema = z.object({
	label: z.string(),
	percentOfTotal: z.number().min(0).max(100), // Percentage of total approved amount
	defaultMonth: z.number().int().positive(), // Default month when this stage typically occurs
});
export type SelfBuildTemplateStage = z.infer<
	typeof SelfBuildTemplateStageSchema
>;

// A self-build template (stage breakdown with percentages)
export const SelfBuildTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	stages: z.array(SelfBuildTemplateStageSchema),
});
export type SelfBuildTemplate = z.infer<typeof SelfBuildTemplateSchema>;

// Array of templates
export const SelfBuildTemplatesFileSchema = z.array(SelfBuildTemplateSchema);
