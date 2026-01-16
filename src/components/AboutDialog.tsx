import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
} from "@/components/ui/carousel";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { WHATS_NEW_ITEMS, WHATS_NEW_VERSION } from "@/lib/constants/whats-new";
import { getStoredVersion, setStoredVersion } from "@/lib/storage/whats-new";
import { cn } from "@/lib/utils/cn";

export function AboutDialog() {
	const [open, setOpen] = useState(false);
	const [current, setCurrent] = useState(0);
	const [api, setApi] = useState<CarouselApi>();

	const itemsToShow = WHATS_NEW_ITEMS.slice(0, 5);

	useEffect(() => {
		const storedVersion = getStoredVersion();

		if (storedVersion === null) {
			setStoredVersion(WHATS_NEW_VERSION);
		} else if (storedVersion < WHATS_NEW_VERSION) {
			setOpen(true);
		}
	}, []);

	useEffect(() => {
		if (!api) return;

		setCurrent(api.selectedScrollSnap());

		api.on("select", () => {
			setCurrent(api.selectedScrollSnap());
		});
	}, [api]);

	function handleOpenChange(isOpen: boolean) {
		setOpen(isOpen);
		if (!isOpen) {
			setStoredVersion(WHATS_NEW_VERSION);
			setCurrent(0);
			api?.scrollTo(0);
		}
	}

	function scrollTo(index: number) {
		api?.scrollTo(index);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
				<Info className="h-4 w-4" />
				<span>About</span>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader className="sticky top-0 bg-background">
					<DialogTitle className="flex items-center gap-2">
						<Info className="h-5 w-5" />
						About MortgageLab.ie
					</DialogTitle>
					<DialogDescription>
						Irish Mortgage Comparator and Simulator
					</DialogDescription>
				</DialogHeader>

				{itemsToShow.length > 0 && (
					<div className="py-2 overflow-hidden">
						<p className="font-medium text-foreground mb-3">What's New</p>

						<Carousel
							setApi={setApi}
							opts={{
								align: "start",
								containScroll: "trimSnaps",
							}}
							className="w-full"
						>
							<CarouselContent className="-ml-0">
								{itemsToShow.map((item) => (
									<CarouselItem key={item.id} className="pl-0 basis-full">
										<div className="min-h-[120px] space-y-2">
											<div className="flex items-center gap-2 font-medium text-foreground">
												{item.icon && (
													<item.icon className="h-4 w-4 shrink-0 text-primary" />
												)}
												<span>{item.title}</span>
											</div>
											{item.description && (
												<p className="text-sm text-muted-foreground">
													{item.description}
												</p>
											)}
											{item.highlights && (
												<ul className="text-sm text-muted-foreground list-disc space-y-1 ml-6">
													{item.highlights.map((highlight) => (
														<li key={highlight}>{highlight}</li>
													))}
												</ul>
											)}
										</div>
									</CarouselItem>
								))}
							</CarouselContent>
						</Carousel>

						{itemsToShow.length > 1 && (
							<div className="flex justify-center gap-2 mt-4">
								{itemsToShow.map((item, index) => (
									<button
										key={item.id}
										type="button"
										onClick={() => scrollTo(index)}
										className={cn(
											"h-2 w-2 rounded-full transition-colors cursor-pointer",
											index === current
												? "bg-primary"
												: "bg-muted-foreground/30 hover:bg-muted-foreground/50",
										)}
										aria-label={`Go to slide ${index + 1}`}
									/>
								))}
							</div>
						)}
					</div>
				)}

				<DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
					<div className="w-full flex justify-between text-xs text-muted-foreground">
						<span>
							Compiled At:{" "}
							<span className="font-mono">
								{new Date(__BUILD_TIME__).toLocaleString()}
							</span>
						</span>
						<span>
							Build Version:{" "}
							<span className="font-mono">{__BUILD_COMMIT__}</span>
						</span>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
