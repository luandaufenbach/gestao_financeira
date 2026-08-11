import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			/**
			 * `__dirname` não existe em módulos ESM, e este arquivo é ESM
			 * (package.json declara "type": "module"). Funcionava apenas porque o
			 * Vite transpila a config para CommonJS antes de executá-la — algo em
			 * que não se deve confiar. `import.meta.url` é a forma correta.
			 */
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	server: {
		port: 5173,
	},
});
