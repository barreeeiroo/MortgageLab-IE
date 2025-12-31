import { Menu } from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS, SITE } from "../lib/constants";
import { getPath } from "../lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./ui/sheet";

export function MobileNav() {
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
					<SheetTitle className="text-primary">{SITE.shortName}</SheetTitle>
				</SheetHeader>
				<nav className="flex flex-col gap-1 px-2">
					{NAV_ITEMS.map((item) =>
						"children" in item ? (
							<div key={item.label} className="flex flex-col">
								<span className="px-3 py-2 text-sm font-medium text-foreground">
									{item.label}
								</span>
								<div className="flex flex-col pl-3">
									{item.children.map((child) => (
										<SheetClose asChild key={child.href}>
											<a
												href={getPath(child.href)}
												className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
											>
												{child.label}
											</a>
										</SheetClose>
									))}
								</div>
							</div>
						) : (
							<SheetClose asChild key={item.href}>
								<a
									href={getPath(item.href)}
									className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
								>
									{item.label}
								</a>
							</SheetClose>
						),
					)}
					<SheetClose asChild>
						<a
							href={getPath("/resources")}
							className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
						>
							Resources
						</a>
					</SheetClose>
				</nav>
				<div className="mt-auto p-4 border-t border-border flex items-center justify-end">
					<ThemeToggle />
				</div>
			</SheetContent>
		</Sheet>
	);
}
