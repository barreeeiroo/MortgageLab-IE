// @ts-check

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
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

	integrations: [react()],

	vite: {
		plugins: [tailwindcss(), serveDataFolder()],
	},
});
