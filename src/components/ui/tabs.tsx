import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ChevronDown } from "lucide-react";
import type * as React from "react";
import { Children, createContext, isValidElement, useContext } from "react";

import { cn } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./dropdown-menu";

// Context to share tabs value with TabsList for collapse dropdown
interface TabsContextValue {
	value?: string;
	onValueChange?: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue>({});

function Tabs({
	className,
	value,
	onValueChange,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsContext.Provider value={{ value, onValueChange }}>
			<TabsPrimitive.Root
				data-slot="tabs"
				className={cn("flex flex-col gap-2", className)}
				value={value}
				onValueChange={onValueChange}
				{...props}
			/>
		</TabsContext.Provider>
	);
}

interface TabsListProps
	extends React.ComponentProps<typeof TabsPrimitive.List> {
	/** If true, shows a dropdown on mobile (< sm) instead of tabs */
	collapseOnMobile?: boolean;
}

function TabsList({
	className,
	children,
	collapseOnMobile = false,
	...props
}: TabsListProps) {
	const { value, onValueChange } = useContext(TabsContext);

	// Extract tab options from children for the dropdown
	const options: Array<{ value: string; label: React.ReactNode }> = [];
	Children.forEach(children, (child) => {
		if (isValidElement(child) && child.props.value) {
			options.push({
				value: child.props.value,
				label: child.props.children,
			});
		}
	});

	const currentOption = options.find((o) => o.value === value);

	return (
		<>
			{/* Mobile dropdown - only when collapseOnMobile is true */}
			{collapseOnMobile && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className={cn(
								"bg-muted text-foreground flex h-9 w-full items-center justify-between rounded-lg px-3 text-sm font-medium sm:hidden",
								className,
							)}
						>
							<span>{currentOption?.label ?? value}</span>
							<ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-[var(--radix-dropdown-menu-trigger-width)]"
					>
						{options.map((option) => (
							<DropdownMenuItem
								key={option.value}
								onClick={() => onValueChange?.(option.value)}
								className={cn(option.value === value && "bg-accent")}
							>
								{option.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			)}

			{/* Regular tabs - hidden on mobile when collapseOnMobile is true */}
			<TabsPrimitive.List
				data-slot="tabs-list"
				className={cn(
					"bg-muted text-muted-foreground h-9 w-fit items-center justify-center rounded-lg p-[3px]",
					collapseOnMobile ? "hidden sm:inline-flex" : "inline-flex",
					className,
				)}
				{...props}
			>
				{children}
			</TabsPrimitive.List>
		</>
	);
}

function TabsTrigger({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			className={cn(
				"cursor-pointer data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-background/50 data-[state=inactive]:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			className={cn("flex-1 outline-none", className)}
			{...props}
		/>
	);
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
