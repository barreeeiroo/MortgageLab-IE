export interface LegendItem {
    color: string;
    label: string;
    dashed?: boolean;
}

interface ChartLegendProps {
    items: LegendItem[];
}

export function ChartLegend({ items }: ChartLegendProps) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-xs">
            {items.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                    {item.dashed ? (
                        <div
                            className="h-2 w-2 rounded-sm border border-dashed"
                            style={{
                                backgroundColor: "transparent",
                                borderColor: item.color,
                            }}
                        />
                    ) : (
                        <div
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: item.color }}
                        />
                    )}
                    <span className="text-muted-foreground">{item.label}</span>
                </div>
            ))}
        </div>
    );
}
