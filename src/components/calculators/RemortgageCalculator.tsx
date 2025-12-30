import { Info } from "lucide-react";
import { useState } from "react";
import {
	formatCurrency,
	formatCurrencyInput,
	parseCurrency,
} from "@/lib/utils";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface RemortgageCalculatorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCalculate: (remainingAmount: number, remainingTerm: number) => void;
}

export function RemortgageCalculator({
	open,
	onOpenChange,
	onCalculate,
}: RemortgageCalculatorProps) {
	const [originalAmount, setOriginalAmount] = useState("");
	const [originalTerm, setOriginalTerm] = useState("");
	const [yearsPaid, setYearsPaid] = useState("");
	const [interestRate, setInterestRate] = useState("");

	const original = parseCurrency(originalAmount);
	const term = Number.parseInt(originalTerm, 10) || 0;
	const paid = Number.parseInt(yearsPaid, 10) || 0;
	const rate = Number.parseFloat(interestRate) || 0;

	const remainingTerm = Math.max(0, term - paid);
	const monthlyRate = rate / 100 / 12;
	const totalMonths = term * 12;
	const monthsPaid = paid * 12;

	let remainingBalance = 0;
	if (original > 0 && term > 0 && rate > 0 && paid >= 0 && paid < term) {
		// Calculate monthly payment
		const monthlyPayment =
			(original * monthlyRate * (1 + monthlyRate) ** totalMonths) /
			((1 + monthlyRate) ** totalMonths - 1);

		// Calculate remaining balance after monthsPaid
		remainingBalance =
			original * (1 + monthlyRate) ** monthsPaid -
			monthlyPayment * (((1 + monthlyRate) ** monthsPaid - 1) / monthlyRate);
	}

	const isValid =
		original > 0 && term > 0 && rate > 0 && paid >= 0 && paid < term;

	const handleUseValues = () => {
		if (isValid && remainingBalance > 0) {
			onCalculate(Math.round(remainingBalance), remainingTerm);
			onOpenChange(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="sm:max-w-2xl">
				<AlertDialogHeader>
					<AlertDialogTitle>Remortgage Calculator</AlertDialogTitle>
					<AlertDialogDescription>
						Calculate your remaining mortgage balance to compare rates.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="flex gap-2 p-3 rounded-md bg-muted/50 text-sm">
					<Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
					<p className="text-muted-foreground">
						Remortgaging doesn't change your buyer type—what matters is your{" "}
						<strong>remaining term</strong>,{" "}
						<strong>current property value</strong>, and{" "}
						<strong>remaining mortgage amount</strong>. The amount you've
						already paid off counts as equity (like a deposit). A property
						valuation may be required to switch mortgages.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1">
						<Label htmlFor="originalAmount" className="text-xs">
							Original Mortgage
						</Label>
						<Input
							id="originalAmount"
							type="text"
							inputMode="numeric"
							placeholder="€300,000"
							className="h-9"
							value={formatCurrencyInput(originalAmount)}
							onChange={(e) =>
								setOriginalAmount(e.target.value.replace(/[^0-9]/g, ""))
							}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="originalTerm" className="text-xs">
							Original Term (years)
						</Label>
						<Input
							id="originalTerm"
							type="text"
							inputMode="numeric"
							placeholder="30"
							className="h-9"
							value={originalTerm}
							onChange={(e) =>
								setOriginalTerm(e.target.value.replace(/[^0-9]/g, ""))
							}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="yearsPaid" className="text-xs">
							Years Paid
						</Label>
						<Input
							id="yearsPaid"
							type="text"
							inputMode="numeric"
							placeholder="5"
							className="h-9"
							value={yearsPaid}
							onChange={(e) =>
								setYearsPaid(e.target.value.replace(/[^0-9]/g, ""))
							}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="interestRate" className="text-xs">
							Interest Rate (%)
						</Label>
						<Input
							id="interestRate"
							type="text"
							inputMode="decimal"
							placeholder="3.5"
							className="h-9"
							value={interestRate}
							onChange={(e) =>
								setInterestRate(e.target.value.replace(/[^0-9.]/g, ""))
							}
						/>
					</div>
				</div>

				{isValid && remainingBalance > 0 && (
					<div className="flex gap-6 p-3 rounded-md bg-primary/5 border border-primary/20">
						<div>
							<p className="text-xs text-muted-foreground">Remaining Balance</p>
							<p className="text-lg font-semibold text-primary">
								{formatCurrency(remainingBalance)}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Remaining Term</p>
							<p className="text-lg font-semibold">{remainingTerm} years</p>
						</div>
					</div>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<Button
						onClick={handleUseValues}
						disabled={!isValid || remainingBalance <= 0}
					>
						Use These Values
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
