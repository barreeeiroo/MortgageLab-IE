import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";

const BER_RATINGS = [
	"A1", "A2", "A3",
	"B1", "B2", "B3",
	"C1", "C2", "C3",
	"D1", "D2",
	"E1", "E2",
	"F",
	"G",
	"Exempt",
] as const;

interface BerSelectorProps {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	label?: string;
}

export function BerSelector({
	value,
	onChange,
	id = "berRating",
	label = "BER Rating",
}: BerSelectorProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger id={id}>
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
