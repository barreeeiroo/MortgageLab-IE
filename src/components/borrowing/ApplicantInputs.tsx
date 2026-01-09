import type { ReactNode } from "react";
import { AGE_LIMITS } from "@/lib/constants/central-bank";
import { formatCurrencyInput } from "@/lib/utils/currency";
import { calculateAge } from "@/lib/utils/date";
import { DateOfBirthPicker } from "../selectors/DateOfBirthPicker";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ApplicantInputsProps {
	applicationType: "sole" | "joint";
	onApplicationTypeChange: (type: "sole" | "joint") => void;
	income1: string;
	onIncome1Change: (value: string) => void;
	income2: string;
	onIncome2Change: (value: string) => void;
	birthDate1: Date | undefined;
	onBirthDate1Change: (date: Date | undefined) => void;
	birthDate2: Date | undefined;
	onBirthDate2Change: (date: Date | undefined) => void;
	incomeNote?: ReactNode;
}

export function ApplicantInputs({
	applicationType,
	onApplicationTypeChange,
	income1,
	onIncome1Change,
	income2,
	onIncome2Change,
	birthDate1,
	onBirthDate1Change,
	birthDate2,
	onBirthDate2Change,
	incomeNote,
}: ApplicantInputsProps) {
	const age1 = calculateAge(birthDate1);
	const age2 = applicationType === "joint" ? calculateAge(birthDate2) : null;

	const isAge1TooOld = age1 !== null && age1 > AGE_LIMITS.MAX_APPLICANT_AGE;
	const isAge2TooOld = age2 !== null && age2 > AGE_LIMITS.MAX_APPLICANT_AGE;

	return (
		<>
			<div className="space-y-2">
				<Label>Application Type</Label>
				<div className="flex gap-4">
					<Button
						type="button"
						variant={applicationType === "sole" ? "default" : "outline"}
						onClick={() => onApplicationTypeChange("sole")}
						className="flex-1"
					>
						Sole Applicant
					</Button>
					<Button
						type="button"
						variant={applicationType === "joint" ? "default" : "outline"}
						onClick={() => onApplicationTypeChange("joint")}
						className="flex-1"
					>
						Joint Applicants
					</Button>
				</div>
			</div>

			<div
				className={`grid gap-4 ${applicationType === "joint" ? "sm:grid-cols-2" : ""}`}
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="income1">
							{applicationType === "joint"
								? "Your Gross Annual Salary"
								: "Gross Annual Salary"}
						</Label>
						<Input
							id="income1"
							type="text"
							inputMode="numeric"
							placeholder="€50,000"
							value={formatCurrencyInput(income1)}
							onChange={(e) =>
								onIncome1Change(e.target.value.replace(/[^0-9]/g, ""))
							}
						/>
					</div>
					<div>
						<DateOfBirthPicker
							value={birthDate1}
							onChange={onBirthDate1Change}
							id="birthDate1"
							label={
								applicationType === "joint"
									? "Your Date of Birth"
									: "Date of Birth"
							}
						/>
						{age1 !== null && (
							<p
								className={`text-xs mt-1 ${isAge1TooOld ? "text-destructive" : "text-muted-foreground"}`}
							>
								{age1} years old
							</p>
						)}
					</div>
				</div>
				{applicationType === "joint" && (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="income2">
								Second Applicant's Gross Annual Salary
							</Label>
							<Input
								id="income2"
								type="text"
								inputMode="numeric"
								placeholder="€50,000"
								value={formatCurrencyInput(income2)}
								onChange={(e) =>
									onIncome2Change(e.target.value.replace(/[^0-9]/g, ""))
								}
							/>
						</div>
						<div>
							<DateOfBirthPicker
								value={birthDate2}
								onChange={onBirthDate2Change}
								id="birthDate2"
								label="Second Applicant's Date of Birth"
							/>
							{age2 !== null && (
								<p
									className={`text-xs mt-1 ${isAge2TooOld ? "text-destructive" : "text-muted-foreground"}`}
								>
									{age2} years old
								</p>
							)}
						</div>
					</div>
				)}
			</div>

			{incomeNote && (
				<p className="text-xs text-muted-foreground">{incomeNote}</p>
			)}
		</>
	);
}
