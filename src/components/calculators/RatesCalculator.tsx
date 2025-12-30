import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import {
	calculateStampDuty,
	ESTIMATED_LEGAL_FEES,
	formatCurrency,
	formatCurrencyInput,
	parseCurrency,
} from "@/lib/utils";
import { BerSelector } from "../selectors/BerSelector";
import { MortgageTermSelector } from "../selectors/MortgageTermSelector";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const FTB_MAX_LTV = 0.9; // 90% LTV (10% deposit minimum)

interface MortgageResult {
	propertyValue: number;
	mortgageAmount: number;
	mortgageTerm: number;
	berRating: string;
	ltv: number;
}

function ResultCard({
	result,
	issues = [],
}: {
	result: MortgageResult;
	issues?: string[];
}) {
	const hasIssues = issues.length > 0;
	const stampDuty = calculateStampDuty(result.propertyValue);
	const legalFees = ESTIMATED_LEGAL_FEES;
	const totalFees = stampDuty + legalFees;
	const deposit = result.propertyValue - result.mortgageAmount;
	const totalCashRequired = deposit + totalFees;

	const cardStyles = hasIssues
		? "bg-destructive/5 border-destructive/20"
		: "bg-primary/5 border-primary/20";

	return (
		<Card className={cardStyles}>
			<CardContent className="pt-6 pb-4">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
					<div>
						<p className="text-sm text-muted-foreground">Property Value</p>
						<p className="text-xl font-bold">
							{formatCurrency(result.propertyValue)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Mortgage Amount</p>
						<p className="text-xl font-bold text-primary">
							{formatCurrency(result.mortgageAmount)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Mortgage Term</p>
						<p className="text-xl font-bold">{result.mortgageTerm} years</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">BER Rating</p>
						<p className="text-xl font-bold">{result.berRating}</p>
					</div>
				</div>
				<div className="pt-4 border-t border-border">
					<div>
						<p className="text-sm text-muted-foreground">Loan-to-Value (LTV)</p>
						<p
							className={`text-lg font-semibold ${result.ltv > 90 ? "text-destructive" : ""}`}
						>
							{result.ltv.toFixed(1)}%
						</p>
					</div>
				</div>
				<div className="pt-4 border-t border-border mt-4">
					<p className="text-sm font-medium mb-2">Cash Required</p>
					<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
						<div>
							<p className="text-muted-foreground">
								Deposit ({(100 - result.ltv).toFixed(0)}%)
							</p>
							<p className="font-semibold">{formatCurrency(deposit)}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Stamp Duty</p>
							<p className="font-semibold">{formatCurrency(stampDuty)}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Legal Fees (est.)</p>
							<p className="font-semibold">{formatCurrency(legalFees)}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Total Cash Required</p>
							<p className="font-semibold text-primary">
								{formatCurrency(totalCashRequired)}
							</p>
						</div>
					</div>
					<p className="text-xs text-muted-foreground mt-2">
						Legal fees typically range from €3,000 to €5,000 and include
						solicitor fees, searches, and registration.
					</p>
				</div>
				{issues.length > 0 && (
					<div className="space-y-2 pt-4 border-t border-border mt-4">
						{issues.map((issue, i) => (
							<p key={i} className="text-sm text-destructive">
								{issue}
							</p>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

const STORAGE_KEY = "rates-calculator";

interface FormState {
	propertyValue: string;
	deposit: string;
	mortgageTerm: string;
	berRating: string;
}

function loadFormState(): Partial<FormState> {
	if (typeof window === "undefined") return {};
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

function saveFormState(state: FormState): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Ignore storage errors
	}
}

export function RatesCalculator() {
	const [propertyValue, setPropertyValue] = useState("");
	const [deposit, setDeposit] = useState("");
	const [mortgageTerm, setMortgageTerm] = useState("30");
	const [berRating, setBerRating] = useState("C1");
	const [result, setResult] = useState<MortgageResult | null>(null);
	const [issues, setIssues] = useState<string[]>([]);

	// Load from localStorage on mount
	useEffect(() => {
		const saved = loadFormState();
		if (saved.propertyValue) setPropertyValue(saved.propertyValue);
		if (saved.deposit) setDeposit(saved.deposit);
		if (saved.mortgageTerm) setMortgageTerm(saved.mortgageTerm);
		if (saved.berRating) setBerRating(saved.berRating);
	}, []);

	// Save to localStorage when form changes
	useEffect(() => {
		saveFormState({
			propertyValue,
			deposit,
			mortgageTerm,
			berRating,
		});
	}, [propertyValue, deposit, mortgageTerm, berRating]);

	const calculate = () => {
		const property = parseCurrency(propertyValue);
		const dep = parseCurrency(deposit);

		if (property <= 0) return;

		const mortgageAmount = property - dep;
		const ltv = (mortgageAmount / property) * 100;

		const newIssues: string[] = [];
		if (ltv > 90) {
			newIssues.push(
				`LTV of ${ltv.toFixed(1)}% exceeds the default 90% limit. Some lenders may offer higher LTV.`,
			);
		}

		setResult({
			propertyValue: property,
			mortgageAmount,
			mortgageTerm: Number.parseInt(mortgageTerm),
			berRating,
			ltv,
		});
		setIssues(newIssues);
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardContent className="pt-6">
					<div className="mb-6">
						<CardTitle className="text-lg mb-1">
							Enter Your Property Details
						</CardTitle>
						<CardDescription>
							<a
								href="https://www.centralbank.ie/consumer-hub/explainers/what-are-the-mortgage-measures"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center hover:text-foreground"
								aria-label="Central Bank mortgage measures"
							>
								Central Bank rules
								<ExternalLink className="h-3 w-3 ml-1" />
							</a>{" "}
							set a default of 4× income and 10% minimum deposit for first time
							buyers, but some lenders may offer different terms.
						</CardDescription>
					</div>
					<div className="space-y-6">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="propertyValue">Property Value</Label>
								<Input
									id="propertyValue"
									type="text"
									inputMode="numeric"
									placeholder="€350,000"
									value={formatCurrencyInput(propertyValue)}
									onChange={(e) =>
										setPropertyValue(e.target.value.replace(/[^0-9]/g, ""))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="deposit">Your Deposit</Label>
								<Input
									id="deposit"
									type="text"
									inputMode="numeric"
									placeholder="€35,000"
									value={formatCurrencyInput(deposit)}
									onChange={(e) => setDeposit(e.target.value.replace(/[^0-9]/g, ""))}
								/>
							</div>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<MortgageTermSelector
								value={mortgageTerm}
								onChange={setMortgageTerm}
								id="mortgageTerm"
							/>
							<BerSelector
								value={berRating}
								onChange={setBerRating}
								id="berRating"
							/>
						</div>
						<Button onClick={calculate} className="w-full sm:w-auto">
							Compare Rates
						</Button>
					</div>
				</CardContent>
			</Card>

			{result && <ResultCard result={result} issues={issues} />}
		</div>
	);
}
