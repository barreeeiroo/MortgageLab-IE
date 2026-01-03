import { useEffect, useState } from "react";

// Tailwind lg breakpoint
const DESKTOP_BREAKPOINT = "(min-width: 1024px)";

export function useIsDesktop(): boolean {
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT);
		setIsDesktop(mediaQuery.matches);

		const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}, []);

	return isDesktop;
}
