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
}

export function LenderLogo({
	lenderId,
	size = 48,
	className,
}: LenderLogoProps) {
	const logo = logos[lenderId];

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
					{lenderId.toUpperCase()}
				</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"bg-white rounded-md flex items-center justify-center p-1",
				className,
			)}
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
	);
}
