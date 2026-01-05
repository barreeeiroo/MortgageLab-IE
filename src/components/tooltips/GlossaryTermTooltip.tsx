import { HelpCircle } from "lucide-react";

import {
	type GLOSSARY_TERMS,
	GLOSSARY_TERMS_MAP,
} from "@/lib/constants/glossary";
import { cn } from "@/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export type GlossaryTermId = (typeof GLOSSARY_TERMS)[number]["id"];

type IconSize = "sm" | "default";

interface GlossaryTermTooltipProps {
	termId: GlossaryTermId;
	/** Whether to show the full description below the short description. Default: true */
	showFull?: boolean;
	/** Icon size variant. Default: "default" */
	size?: IconSize;
	/** Tooltip placement side */
	side?: "top" | "right" | "bottom" | "left";
	/** Additional class name for the icon */
	className?: string;
}

const iconSizeClasses: Record<IconSize, string> = {
	sm: "h-3 w-3",
	default: "h-3.5 w-3.5",
};

export function GlossaryTermTooltip({
	termId,
	showFull = true,
	size = "default",
	side,
	className,
}: GlossaryTermTooltipProps) {
	const term = GLOSSARY_TERMS_MAP[termId];

	if (!term) {
		return null;
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex items-center justify-center cursor-help">
					<HelpCircle
						className={cn(
							iconSizeClasses[size],
							"text-muted-foreground",
							className,
						)}
					/>
				</span>
			</TooltipTrigger>
			<TooltipContent side={side} className="max-w-xs">
				<p className="font-medium">{term.shortDescription}</p>
				{showFull && (
					<p className="text-xs text-muted-foreground mt-1">
						{term.fullDescription}
					</p>
				)}
			</TooltipContent>
		</Tooltip>
	);
}
