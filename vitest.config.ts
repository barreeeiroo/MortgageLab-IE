/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
	test: {
		include: [
			"src/**/*.{test,spec}.{js,ts,jsx,tsx}",
			"tests/integration/**/*.{test,spec}.{js,ts,jsx,tsx}",
		],
		globals: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/**/__tests__/**", "src/lib/schemas/**", "tests/**"],
		},
	},
});
