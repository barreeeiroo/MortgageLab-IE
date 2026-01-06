import {
	Award,
	BadgeCheck,
	Crown,
	Gem,
	Gift,
	Heart,
	Medal,
	Percent,
	Rocket,
	Shield,
	Sparkles,
	Star,
	ThumbsUp,
	Trophy,
	Zap,
	type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { StoredCustomPerk } from "@/lib/stores/custom-perks";

// Available icons for perk selection
export const PERK_ICON_OPTIONS: Record<string, LucideIcon> = {
	Star,
	Gift,
	Percent,
	BadgeCheck,
	Sparkles,
	Heart,
	Trophy,
	Medal,
	Crown,
	ThumbsUp,
	Zap,
	Shield,
	Award,
	Gem,
	Rocket,
};

export const PERK_ICON_NAMES = Object.keys(PERK_ICON_OPTIONS);

export interface CustomPerkFormProps {
	initialPerk?: StoredCustomPerk | null;
	onSubmit: (perk: StoredCustomPerk) => void;
	submitButton: (props: {
		onClick: () => void;
		disabled: boolean;
	}) => React.ReactNode;
}

interface FormState {
	label: string;
	description: string;
	icon: string;
}

function createInitialFormState(): FormState {
	return {
		label: "",
		description: "",
		icon: "Star",
	};
}

function createFormStateFromPerk(perk: StoredCustomPerk): FormState {
	return {
		label: perk.label,
		description: perk.description || "",
		icon: perk.icon,
	};
}

export function CustomPerkForm({
	initialPerk,
	onSubmit,
	submitButton,
}: CustomPerkFormProps) {
	const [form, setForm] = useState<FormState>(() =>
		initialPerk ? createFormStateFromPerk(initialPerk) : createInitialFormState(),
	);

	// Reset form when initialPerk changes
	useEffect(() => {
		if (initialPerk) {
			setForm(createFormStateFromPerk(initialPerk));
		} else {
			setForm(createInitialFormState());
		}
	}, [initialPerk]);

	const isFormValid = useMemo(() => {
		return form.label.trim().length > 0;
	}, [form.label]);

	const handleSubmit = useCallback(() => {
		if (!isFormValid) return;

		const customPerk: StoredCustomPerk = {
			id:
				initialPerk?.id ||
				`custom-perk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			label: form.label.trim(),
			description: form.description.trim() || undefined,
			icon: form.icon,
		};

		onSubmit(customPerk);
	}, [form, isFormValid, initialPerk, onSubmit]);

	const updateForm = useCallback(
		<K extends keyof FormState>(key: K, value: FormState[K]) => {
			setForm((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	return (
		<>
			{/* Scrollable Content */}
			<div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
				<div className="space-y-6">
					{/* Perk Label */}
					<div className="space-y-2">
						<Label htmlFor="perk-label">
							Label <span className="text-destructive">*</span>
						</Label>
						<Input
							id="perk-label"
							placeholder="e.g., Free Legal Fees"
							value={form.label}
							onChange={(e) => updateForm("label", e.target.value)}
						/>
					</div>

					{/* Perk Description */}
					<div className="space-y-2">
						<Label htmlFor="perk-description">Description (optional)</Label>
						<Input
							id="perk-description"
							placeholder="e.g., Legal fees covered up to €1,500"
							value={form.description}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								updateForm("description", e.target.value)
							}
						/>
					</div>

					{/* Icon Selection */}
					<div className="space-y-3">
						<Label>Icon</Label>
						<div className="grid grid-cols-5 gap-2">
							{PERK_ICON_NAMES.map((iconName) => {
								const IconComponent = PERK_ICON_OPTIONS[iconName];
								const isSelected = form.icon === iconName;
								return (
									<button
										key={iconName}
										type="button"
										onClick={() => updateForm("icon", iconName)}
										className={cn(
											"flex items-center justify-center p-3 rounded-md border transition-colors",
											isSelected
												? "border-primary bg-primary/10 text-primary"
												: "border-border hover:border-primary/50 hover:bg-muted",
										)}
										title={iconName}
									>
										<IconComponent className="h-5 w-5" />
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Sticky Footer */}
			<div className="sticky bottom-0 bg-background z-10 px-6 py-4 border-t flex items-center justify-between">
				<p className="text-xs text-muted-foreground">
					Custom perks are stored locally in your browser.
				</p>
				{submitButton({ onClick: handleSubmit, disabled: !isFormValid })}
			</div>
		</>
	);
}
