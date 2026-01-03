import { Pencil } from "lucide-react";
import aibLogo from "@/assets/logos/lenders/aib.webp";
import avantLogo from "@/assets/logos/lenders/avant.png";
import boiLogo from "@/assets/logos/lenders/boi.png";
import cuLogo from "@/assets/logos/lenders/cu.png";
import ebsLogo from "@/assets/logos/lenders/ebs.webp";
import havenLogo from "@/assets/logos/lenders/haven.png";
import icsLogo from "@/assets/logos/lenders/ics.png";
import mocoLogo from "@/assets/logos/lenders/moco.png";
import nuaLogo from "@/assets/logos/lenders/nua.png";
import ptsbLogo from "@/assets/logos/lenders/ptsb.png";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const logos: Record<string, ImageMetadata> = {
	aib: aibLogo,
	avant: avantLogo,
	boi: boiLogo,
	cu: cuLogo,
	ebs: ebsLogo,
	haven: havenLogo,
	ics: icsLogo,
	moco: mocoLogo,
	nua: nuaLogo,
	ptsb: ptsbLogo,
};

interface LenderLogoProps {
	lenderId: string;
	size?: number;
	className?: string;
	isCustom?: boolean;
}

export function LenderLogo({
	lenderId,
	size = 48,
	className,
	isCustom = false,
}: LenderLogoProps) {
	const logo = logos[lenderId];
	const iconSize = Math.max(12, Math.floor(size * 0.35));

	// Treat as custom if explicitly marked OR if lenderId is not a known lender
	const effectiveIsCustom = isCustom || !logo;

	// Custom badge component
	const CustomBadge = () => (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5 shadow-sm cursor-help">
					<Pencil className="h-2.5 w-2.5 text-primary-foreground" />
				</div>
			</TooltipTrigger>
			<TooltipContent side="top">
				<p className="text-xs">Custom Rate</p>
			</TooltipContent>
		</Tooltip>
	);

	// Custom rate with unknown lender: show pencil icon (no badge needed - icon is sufficient)
	if (effectiveIsCustom && !logo) {
		return (
			<div
				className={cn(
					"bg-primary/10 rounded-md flex items-center justify-center",
					className,
				)}
				style={{ width: size, height: size }}
			>
				<Pencil
					className="text-primary"
					style={{ width: iconSize, height: iconSize }}
				/>
			</div>
		);
	}

	// Unknown lender (fallback to text)
	if (!logo) {
		return (
			<div
				className={cn(
					"bg-muted rounded-md flex items-center justify-center",
					className,
				)}
				style={{ width: size, height: size }}
			>
				<span className="text-xs text-muted-foreground font-medium">
					{lenderId.toUpperCase().slice(0, 4)}
				</span>
			</div>
		);
	}

	// Known lender with logo (with optional custom badge)
	return (
		<div className={cn("relative", className)}>
			<div
				className="bg-white rounded-md flex items-center justify-center p-1"
				style={{ width: size, height: size }}
			>
				<img
					src={logo.src}
					alt={`${lenderId} logo`}
					className="max-w-full max-h-full object-contain"
					width={size - 8}
					height={size - 8}
				/>
			</div>
			{isCustom && <CustomBadge />}
		</div>
	);
}
