// @ts-check

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @returns {import('vite').Plugin} */
function serveDataFolder() {
	return {
		name: "serve-data-folder",
		configureServer(server) {
			// Serve /data from the data folder during development
			server.middlewares.use("/data", (req, res, next) => {
				const filePath = path.join(__dirname, "data", req.url || "");
				if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
					res.setHeader("Content-Type", "application/json");
					fs.createReadStream(filePath).pipe(res);
				} else {
					next();
				}
			});
		},
	};
}

// https://astro.build/config
export default defineConfig({
	site: "https://www.mortgagelab.ie",
	base: "/",

	integrations: [react(), sitemap()],

	vite: {
		plugins: [tailwindcss(), serveDataFolder()],
		build: {
			rollupOptions: {
				output: {
					// Consolidate small chunks into logical groups
					manualChunks: (id) => {
						// Node modules - group by package
						if (id.includes("/node_modules/")) {
							// React ecosystem
							if (id.includes("react") || id.includes("scheduler")) {
								return "vendor-react";
							}
							// Recharts/D3 for charts
							if (
								id.includes("recharts") ||
								id.includes("d3-") ||
								id.includes("victory")
							) {
								return "vendor-charts";
							}
							// Other vendors (including Radix)
							return "vendor";
						}

						// Core library
						if (id.includes("/lib/")) {
							return "lib";
						}
						// UI components
						if (id.includes("/components/ui/")) {
							return "ui";
						}
					},
				},
			},
		},
	},
});
