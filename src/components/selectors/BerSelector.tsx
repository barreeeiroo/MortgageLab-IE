import { BER_RATINGS, type BerRating } from "@/lib/constants";
import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";

interface BerSelectorProps {
	value: BerRating;
	onChange: (value: BerRating) => void;
	id?: string;
	label?: string;
	compact?: boolean;
}

export function BerSelector({
	value,
	onChange,
	id = "berRating",
	label = "BER Rating",
	compact = false,
}: BerSelectorProps) {
	if (compact) {
		return (
			<Select value={value} onValueChange={(v) => onChange(v as BerRating)}>
				<SelectTrigger id={id} className="h-9 w-full">
					<SelectValue placeholder="BER" />
				</SelectTrigger>
				<SelectContent>
					{BER_RATINGS.map((ber) => (
						<SelectItem key={ber} value={ber}>
							{ber}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Select value={value} onValueChange={(v) => onChange(v as BerRating)}>
				<SelectTrigger id={id} className="w-full">
					<SelectValue placeholder="Select BER" />
				</SelectTrigger>
				<SelectContent>
					{BER_RATINGS.map((ber) => (
						<SelectItem key={ber} value={ber}>
							{ber}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
