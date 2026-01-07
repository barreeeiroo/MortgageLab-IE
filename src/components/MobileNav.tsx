import {
	ArrowRightLeft,
	Building,
	Calculator,
	Home,
	LineChart,
	Menu,
	RefreshCcw,
	Scale,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "../lib/constants";
import { cn, getPath } from "../lib/utils";
import { Button } from "./ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./ui/sheet";

const iconMap = {
	ArrowRightLeft,
	Building,
	Calculator,
	Home,
	LineChart,
	RefreshCcw,
	Scale,
	TrendingUp,
} as const;

interface MobileNavProps {
	logoLight: string;
	logoDark: string;
	currentPath: string;
}

function isPathActive(currentPath: string, href: string): boolean {
	const base = import.meta.env.BASE_URL.replace(/\/$/, "");
	const normalizedPath = currentPath.replace(/\/$/, "");
	const fullHref = `${base}${href}`.replace(/\/$/, "");
	return (
		normalizedPath === fullHref || normalizedPath.startsWith(`${fullHref}/`)
	);
}

export function MobileNav({
	logoLight,
	logoDark,
	currentPath,
}: MobileNavProps) {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="md:hidden h-8 w-8"
					aria-label="Open menu"
				>
					<Menu className="h-5 w-5" />
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-[280px]">
				<SheetHeader>
					<SheetTitle>
						<img
							src={logoLight}
							alt="MortgageLab"
							className="h-8 w-auto dark:hidden"
						/>
						<img
							src={logoDark}
							alt="MortgageLab"
							className="h-8 w-auto hidden dark:block"
						/>
					</SheetTitle>
				</SheetHeader>
				<nav className="flex flex-col gap-1 px-2">
					{NAV_ITEMS.map((item) => {
						const Icon =
							"icon" in item
								? iconMap[item.icon as keyof typeof iconMap]
								: null;

						return "children" in item ? (
							<div key={item.label} className="flex flex-col">
								<span className="px-3 py-2 text-sm font-medium text-foreground flex items-center gap-2">
									{Icon && <Icon className="h-4 w-4" />}
									{item.label}
								</span>
								<div className="flex flex-col pl-3">
									{item.children.map((child) => {
										const isActive = isPathActive(currentPath, child.href);
										const ChildIcon =
											"icon" in child
												? iconMap[child.icon as keyof typeof iconMap]
												: null;
										return (
											<SheetClose asChild key={child.href}>
												<a
													href={getPath(child.href)}
													className={cn(
														"px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2",
														isActive
															? "text-foreground bg-accent/50 font-medium"
															: "text-muted-foreground hover:text-foreground hover:bg-accent",
													)}
												>
													{ChildIcon && <ChildIcon className="h-4 w-4" />}
													{child.label}
												</a>
											</SheetClose>
										);
									})}
								</div>
							</div>
						) : (
							<SheetClose asChild key={item.href}>
								<a
									href={getPath(item.href)}
									className={cn(
										"px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2",
										isPathActive(currentPath, item.href)
											? "text-foreground bg-accent/50 font-medium"
											: "text-muted-foreground hover:text-foreground hover:bg-accent",
									)}
								>
									{Icon && <Icon className="h-4 w-4" />}
									{item.label}
								</a>
							</SheetClose>
						);
					})}
					<SheetClose asChild>
						<a
							href={getPath("/glossary")}
							className={cn(
								"px-3 py-2 text-sm rounded-md transition-colors",
								isPathActive(currentPath, "/glossary")
									? "text-foreground bg-accent/50 font-medium"
									: "text-muted-foreground hover:text-foreground hover:bg-accent",
							)}
						>
							Glossary
						</a>
					</SheetClose>
					<SheetClose asChild>
						<a
							href={getPath("/resources")}
							className={cn(
								"px-3 py-2 text-sm rounded-md transition-colors",
								isPathActive(currentPath, "/resources")
									? "text-foreground bg-accent/50 font-medium"
									: "text-muted-foreground hover:text-foreground hover:bg-accent",
							)}
						>
							Resources
						</a>
					</SheetClose>
				</nav>
			</SheetContent>
		</Sheet>
	);
}
