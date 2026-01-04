import { NAV_ITEMS } from "../lib/constants";
import { cn, getPath } from "../lib/utils";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "./ui/navigation-menu";

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

					return (
						<NavigationMenuItem key={item.label}>
							{hasChildren ? (
								<>
									<NavigationMenuTrigger
										className={cn(
											isActive && "bg-accent/50 text-accent-foreground",
										)}
									>
										{item.label}
									</NavigationMenuTrigger>
									<NavigationMenuContent>
										<ul className="grid w-[280px] gap-1 p-2">
											{item.children.map((child) => (
												<li key={child.href}>
													<NavigationMenuLink
														asChild
														data-active={isPathActive(currentPath, child.href)}
													>
														<a href={getPath(child.href)}>{child.label}</a>
													</NavigationMenuLink>
												</li>
											))}
										</ul>
									</NavigationMenuContent>
								</>
							) : (
								<NavigationMenuLink
									asChild
									data-active={isActive}
									className={navigationMenuTriggerStyle()}
								>
									<a href={getPath(item.href)}>{item.label}</a>
								</NavigationMenuLink>
							)}
						</NavigationMenuItem>
					);
				})}
			</NavigationMenuList>
		</NavigationMenu>
	);
}
