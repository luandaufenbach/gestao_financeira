const js = require("@eslint/js");
const globals = require("globals");

/**
 * ESLint flat config para o backend (CommonJS + Node).
 *
 * As regras foram escolhidas para pegar defeitos reais, não para impor estilo —
 * disso cuida o Prettier. Em especial, `require-await` e `no-return-await`
 * apontam exatamente o tipo de descuido que existia nos controllers antigos.
 */
module.exports = [
	{
		ignores: ["node_modules/**", "coverage/**"],
	},
	js.configs.recommended,
	{
		files: ["**/*.js"],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "commonjs",
			globals: {
				...globals.node,
			},
		},
		rules: {
			"no-unused-vars": [
				"error",
				{
					// Middlewares de erro do Express exigem 4 parâmetros, mesmo
					// quando `next` não é usado.
					argsIgnorePattern: "^_|^next$",
					varsIgnorePattern: "^_",
				},
			],
			// Promises não aguardadas eram uma fonte silenciosa de erros perdidos.
			"no-async-promise-executor": "error",
			"require-atomic-updates": "error",
			eqeqeq: ["error", "smart"],
			"no-console": "off",
		},
	},
	{
		// Os testes usam ESM e os globais do Vitest.
		files: ["tests/**/*.js", "vitest.config.mjs"],
		languageOptions: {
			sourceType: "module",
			globals: {
				...globals.node,
				...globals.vitest,
			},
		},
	},
];
