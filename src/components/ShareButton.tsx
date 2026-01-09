import { Check, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, type ButtonProps } from "./ui/button";

interface ShareButtonProps {
	/** Function that returns the URL to copy. ShareButton handles clipboard copy. */
	onShare: () => Promise<string>;
	/** Label text to display. Defaults to "Share". */
	label?: string;
	/** If true, hides text on small screens (shows only icon). */
	responsive?: boolean;
	/** Additional class names for the button. */
	className?: string;
	/** Button size. Defaults to "sm". */
	size?: ButtonProps["size"];
}

/**
 * A reusable share button component with "Copied!" feedback.
 * onShare returns a URL string, and ShareButton handles clipboard copy.
 */
export function ShareButton({
	onShare,
	label = "Share",
	responsive = false,
	className,
	size = "sm",
}: ShareButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleClick = useCallback(async () => {
		try {
			const url = await onShare();
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Share or clipboard copy failed
		}
	}, [onShare]);

	return (
		<Button
			variant="outline"
			size={size}
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
