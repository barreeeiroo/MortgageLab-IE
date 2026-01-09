import {
	ArrowRightLeft,
	Building,
	Calculator,
	Home,
	LineChart,
	RefreshCcw,
	Scale,
	TrendingUp,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants/site";
import { cn } from "../lib/utils/cn";
import { getPath } from "../lib/utils/path";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "./ui/navigation-menu";

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

interface DesktopNavProps {
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

export function DesktopNav({ currentPath }: DesktopNavProps) {
	return (
		<NavigationMenu className="hidden md:flex">
			<NavigationMenuList>
				{NAV_ITEMS.map((item) => {
					const hasChildren = "children" in item;
					const isActive = hasChildren
						? item.children.some((child) =>
								isPathActive(currentPath, child.href),
							)
						: isPathActive(currentPath, item.href);

					const Icon =
						"icon" in item ? iconMap[item.icon as keyof typeof iconMap] : null;

					return (
						<NavigationMenuItem key={item.label}>
							{hasChildren ? (
								<>
									<NavigationMenuTrigger
										className={cn(
											isActive && "bg-accent/50 text-accent-foreground",
										)}
									>
										<span className="inline-flex items-center">
											{Icon && <Icon className="mr-1.5 h-4 w-4" />}
											{item.label}
										</span>
									</NavigationMenuTrigger>
									<NavigationMenuContent>
										<ul className="grid w-[280px] gap-1 p-2">
											{item.children.map((child) => {
												const ChildIcon =
													"icon" in child
														? iconMap[child.icon as keyof typeof iconMap]
														: null;
												return (
													<li key={child.href}>
														<NavigationMenuLink
															asChild
															data-active={isPathActive(
																currentPath,
																child.href,
															)}
															className="flex-row items-center gap-2"
														>
															<a href={getPath(child.href)}>
																{ChildIcon && (
																	<ChildIcon className="h-4 w-4 text-muted-foreground" />
																)}
																{child.label}
															</a>
														</NavigationMenuLink>
													</li>
												);
											})}
										</ul>
									</NavigationMenuContent>
								</>
							) : (
								<NavigationMenuLink
									asChild
									data-active={isActive}
									className={navigationMenuTriggerStyle()}
								>
									<a href={getPath(item.href)}>
										<span className="inline-flex items-center">
											{Icon && <Icon className="mr-1.5 h-4 w-4" />}
											{item.label}
										</span>
									</a>
								</NavigationMenuLink>
							)}
						</NavigationMenuItem>
					);
				})}
			</NavigationMenuList>
		</NavigationMenu>
	);
}
