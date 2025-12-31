import type { Table } from "@tanstack/react-table";
import { Settings2 } from "lucide-react";
import { Button } from "./button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./dropdown-menu";

interface ColumnVisibilityToggleProps<TData> {
	table: Table<TData>;
	columnLabels?: Record<string, string>;
}

export function ColumnVisibilityToggle<TData>({
	table,
	columnLabels = {},
}: ColumnVisibilityToggleProps<TData>) {
	const columns = table.getAllColumns().filter((column) => column.getCanHide());

	if (columns.length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-1.5">
					<Settings2 className="h-4 w-4" />
					Columns
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40">
				<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{columns.map((column) => {
					const label = columnLabels[column.id] ?? column.id;
					return (
						<DropdownMenuCheckboxItem
							key={column.id}
							checked={column.getIsVisible()}
							onCheckedChange={(checked) => column.toggleVisibility(checked)}
						>
							{label}
						</DropdownMenuCheckboxItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
