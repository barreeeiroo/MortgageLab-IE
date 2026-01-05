import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { $lenders, fetchLenders } from "@/lib/stores/lenders";
import { LenderLogo } from "./LenderLogo";

const SKELETON_IDS = [
	"s1",
	"s2",
	"s3",
	"s4",
	"s5",
	"s6",
	"s7",
	"s8",
	"s9",
	"s10",
];

export function LenderLogosIsland() {
	const lenders = useStore($lenders);

	useEffect(() => {
		fetchLenders();
	}, []);

	if (lenders.length === 0) {
		return (
			<div className="flex flex-wrap justify-center items-center gap-4">
				{SKELETON_IDS.map((id) => (
					<div
						key={id}
						className="bg-muted rounded-lg animate-pulse"
						style={{ width: 72, height: 72 }}
					/>
				))}
			</div>
		);
	}

	return (
		<div className="flex flex-wrap justify-center items-center gap-4 md:gap-6">
			{lenders.map((lender) => (
				<a
					key={lender.id}
					href={lender.mortgagesUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="transition-transform hover:scale-105"
					title={lender.name}
				>
					<LenderLogo lenderId={lender.id} size={72} />
				</a>
			))}
		</div>
	);
}
