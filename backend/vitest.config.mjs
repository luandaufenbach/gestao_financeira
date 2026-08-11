import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		setupFiles: ["./tests/setup.js"],
		// Um banco em memória por arquivo evita que testes paralelos
		// disputem a mesma coleção.
		fileParallelism: false,
		// O primeiro download do binário do mongod pode demorar.
		testTimeout: 30_000,
		hookTimeout: 120_000,
	},
});
