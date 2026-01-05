import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

interface ShareButtonProps {
	/** Function to call when share is clicked. Should return true on success. */
	onShare: () => Promise<boolean>;
	/** Label text to display. Defaults to "Share". */
	label?: string;
	/** If true, hides text on small screens (shows only icon). */
	responsive?: boolean;
	/** Additional class names for the button. */
	className?: string;
}

/**
 * A reusable share button component with "Copied!" feedback.
 */
export function ShareButton({
	onShare,
	label = "Share",
	responsive = false,
	className,
}: ShareButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleClick = async () => {
		const success = await onShare();
		if (success) {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			className={`gap-1.5 ${className ?? ""}`}
			onClick={handleClick}
		>
			{copied ? (
				<>
					<Check className="h-4 w-4" />
					{responsive ? (
						<span className="hidden sm:inline">Copied!</span>
					) : (
						"Copied!"
					)}
				</>
			) : (
				<>
					<Share2 className="h-4 w-4" />
					{responsive ? (
						<span className="hidden sm:inline">{label}</span>
					) : (
						label
					)}
				</>
			)}
		</Button>
	);
}
