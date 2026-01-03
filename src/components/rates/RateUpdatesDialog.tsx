import { format, formatDistanceToNow } from "date-fns";
import { CirclePlus, Clock, ExternalLink } from "lucide-react";
import { useState } from "react";
import { getNewRateUrl } from "@/lib/constants";
import type { Lender, RatesMetadata } from "@/lib/schemas";
import { LenderLogo } from "../lenders";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

interface RateUpdatesDialogProps {
	lenders: Lender[];
	ratesMetadata: RatesMetadata[];
}

function formatDublinTime(isoString: string): string {
	return format(new Date(isoString), "d MMM yyyy, HH:mm");
}

function formatRelativeTime(isoString: string): string {
	return formatDistanceToNow(new Date(isoString), { addSuffix: true });
}

export function RateUpdatesDialog({
	lenders,
	ratesMetadata,
}: RateUpdatesDialogProps) {
	const [isOpen, setIsOpen] = useState(false);

	const metadataByLender = new Map(ratesMetadata.map((m) => [m.lenderId, m]));

	return (
		<TooltipProvider>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					<Button variant="ghost" size="sm" className="h-8 gap-1.5">
						<Clock className="h-4 w-4" />
						<span className="hidden sm:inline">Rate Updates</span>
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden p-0">
					<DialogHeader className="px-6 pt-6 pb-4">
						<DialogTitle>Rate Update Information</DialogTitle>
					</DialogHeader>
					<div className="flex-1 overflow-y-auto px-6 pb-4">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b text-muted-foreground">
									<th className="text-left py-2 font-medium">Lender</th>
									<th className="text-left py-2 font-medium">Last Checked</th>
									<th className="text-left py-2 font-medium">Rates Updated</th>
									<th className="text-center py-2 font-medium">View Rates</th>
								</tr>
							</thead>
							<tbody>
								{lenders.map((lender) => {
									const metadata = metadataByLender.get(lender.id);
									if (!metadata) return null;

									return (
										<tr key={lender.id} className="border-b last:border-0">
											<td className="py-2">
												<a
													href={lender.mortgagesUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center gap-2 hover:text-primary transition-colors"
												>
													<LenderLogo lenderId={lender.id} size={24} />
													<span className="font-medium">{lender.name}</span>
												</a>
											</td>
											<td className="py-2 text-muted-foreground">
												<Tooltip>
													<TooltipTrigger className="cursor-default">
														{formatRelativeTime(metadata.lastScrapedAt)}
													</TooltipTrigger>
													<TooltipContent>
														{formatDublinTime(metadata.lastScrapedAt)}
													</TooltipContent>
												</Tooltip>
											</td>
											<td className="py-2 text-muted-foreground">
												<Tooltip>
													<TooltipTrigger className="cursor-default">
														{formatRelativeTime(metadata.lastUpdatedAt)}
													</TooltipTrigger>
													<TooltipContent>
														{formatDublinTime(metadata.lastUpdatedAt)}
													</TooltipContent>
												</Tooltip>
											</td>
											<td className="py-2">
												<div className="flex justify-center">
													{lender.ratesUrl && (
														<Tooltip>
															<TooltipTrigger asChild>
																<a
																	href={lender.ratesUrl}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-muted-foreground hover:text-primary transition-colors"
																>
																	<ExternalLink className="h-4 w-4" />
																</a>
															</TooltipTrigger>
															<TooltipContent>
																View rates on website
															</TooltipContent>
														</Tooltip>
													)}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* Sticky Footer */}
					<div className="sticky bottom-0 bg-background z-10 px-6 py-4 border-t">
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5 text-muted-foreground hover:text-foreground"
							asChild
						>
							<a
								href={getNewRateUrl({
									reportSource: "Rate Updates dialog",
								})}
								target="_blank"
								rel="noopener noreferrer"
							>
								<CirclePlus className="h-4 w-4" />
								Missing Rates?
							</a>
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}
