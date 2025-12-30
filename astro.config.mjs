// @ts-check

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const isProd = import.meta.env.PROD;

// https://astro.build/config
export default defineConfig({
	site: "https://diego.barreiro.dev",
	base: isProd ? "/MortgageLab-IE" : "/",

	integrations: [react()],

	vite: {
		plugins: [tailwindcss()],
	},
});
