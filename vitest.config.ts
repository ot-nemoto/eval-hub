import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		exclude: ["node_modules", ".next"],
		passWithNoTests: true,
		coverage: {
			provider: "v8",
			exclude: ["node_modules", ".next", "src/test"],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
