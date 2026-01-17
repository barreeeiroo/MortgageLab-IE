#!/usr/bin/env bun

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SRC_DIR = "data";
const DEST_DIR = "dist/data";

async function copyAndMinify(srcPath: string, destPath: string): Promise<void> {
	const content = await readFile(srcPath, "utf-8");
	const minified = JSON.stringify(JSON.parse(content));
	await writeFile(destPath, minified);
}

async function processDirectory(src: string, dest: string): Promise<void> {
	await mkdir(dest, { recursive: true });

	const entries = await readdir(src);
	for (const entry of entries) {
		const srcPath = join(src, entry);
		const destPath = join(dest, entry);
		const stats = await stat(srcPath);

		if (stats.isDirectory()) {
			await processDirectory(srcPath, destPath);
		} else if (entry.endsWith(".json")) {
			await copyAndMinify(srcPath, destPath);
		}
	}
}

const startTime = performance.now();
await processDirectory(SRC_DIR, DEST_DIR);
const elapsed = (performance.now() - startTime).toFixed(0);
console.log(`Copied and minified data files in ${elapsed}ms`);
