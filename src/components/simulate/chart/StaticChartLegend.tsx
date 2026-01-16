interface LegendItem {
	label: string;
	color: string;
}

interface StaticChartLegendProps {
	items: LegendItem[];
}

/**
 * Non-interactive legend for PDF chart exports.
 * Renders colored squares with labels in a horizontal layout.
 */
export function StaticChartLegend({ items }: StaticChartLegendProps) {
	if (items.length === 0) return null;

	return (
		<div
			className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 pb-2 text-xs"
			style={{ color: "#374151" }}
		>
			{items.map((item) => (
				<div key={item.label} className="flex items-center gap-1.5">
					<div
						className="h-2.5 w-2.5 rounded-sm shrink-0"
						style={{ backgroundColor: item.color }}
					/>
					<span>{item.label}</span>
				</div>
			))}
		</div>
	);
}
