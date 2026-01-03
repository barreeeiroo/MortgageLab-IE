import { Menu } from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "../lib/constants";
import { getPath } from "../lib/utils";
import { Button } from "./ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./ui/sheet";

interface MobileNavProps {
	logoLight: string;
	logoDark: string;
}

export function MobileNav({ logoLight, logoDark }: MobileNavProps) {
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
							href={getPath("/glossary")}
							className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
						>
							Glossary
						</a>
					</SheetClose>
					<SheetClose asChild>
						<a
							href={getPath("/resources")}
							className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
						>
							Resources
						</a>
					</SheetClose>
				</nav>
			</SheetContent>
		</Sheet>
	);
}
