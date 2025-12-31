import { NAV_ITEMS } from "../lib/constants";
import { getPath } from "../lib/utils";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "./ui/navigation-menu";

export function DesktopNav() {
	return (
		<NavigationMenu className="hidden md:flex">
			<NavigationMenuList>
				{NAV_ITEMS.map((item) => (
					<NavigationMenuItem key={item.label}>
						{"children" in item ? (
							<>
								<NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
								<NavigationMenuContent>
									<ul className="grid w-[280px] gap-1 p-2">
										{item.children.map((child) => (
											<li key={child.href}>
												<NavigationMenuLink asChild>
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
								className={navigationMenuTriggerStyle()}
							>
								<a href={getPath(item.href)}>{item.label}</a>
							</NavigationMenuLink>
						)}
					</NavigationMenuItem>
				))}
			</NavigationMenuList>
		</NavigationMenu>
	);
}
