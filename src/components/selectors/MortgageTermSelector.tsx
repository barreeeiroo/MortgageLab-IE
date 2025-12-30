import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";

const MORTGAGE_TERMS = [5, 10, 15, 20, 25, 30, 35] as const;

interface MortgageTermSelectorProps {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	label?: string;
}

export function MortgageTermSelector({
	value,
	onChange,
	id = "mortgageTerm",
	label = "Mortgage Term",
}: MortgageTermSelectorProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger id={id}>
					<SelectValue placeholder="Select term" />
				</SelectTrigger>
				<SelectContent>
					{MORTGAGE_TERMS.map((term) => (
						<SelectItem key={term} value={term.toString()}>
							{term} years
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
