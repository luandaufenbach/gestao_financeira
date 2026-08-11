import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";
import globals from "globals";

/**
 * ESLint flat config para o frontend (Vue 3 + ESM).
 *
 * O conjunto `vue/recommended` teria pego, sozinho, dois dos problemas
 * encontrados nesta revisão:
 *   - o import deprecado de `defineExpose` a partir de "vue" (bug A10);
 *   - o `PencilIcon` importado e nunca usado em Transactions.vue (M5).
 */
export default [
	{
		ignores: ["node_modules/**", "dist/**"],
	},
	js.configs.recommended,
	...pluginVue.configs["flat/recommended"],
	// Desliga as regras de formatação para não brigar com o Prettier.
	skipFormatting,
	{
		files: ["**/*.{js,vue}"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.browser,
			},
		},
		rules: {
			"no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
			// O projeto usa nomes de um só termo já consolidados (navbar.vue).
			"vue/multi-word-component-names": "off",
			"vue/no-v-html": "error",
			"vue/require-default-prop": "off",

			/**
			 * Formatação de template é responsabilidade exclusiva do Prettier.
			 *
			 * Estas regras do eslint-plugin-vue reposicionam atributos por conta
			 * própria e produzem um resultado que o Prettier depois desfaz — as
			 * duas ferramentas ficam brigando pelo mesmo arquivo. Desligadas aqui,
			 * o ESLint cuida só de defeitos e o Prettier só de formato.
			 */
			"vue/first-attribute-linebreak": "off",
			"vue/max-attributes-per-line": "off",
			"vue/singleline-html-element-content-newline": "off",
			"vue/html-self-closing": "off",
			"vue/html-indent": "off",
			"vue/html-closing-bracket-newline": "off",
			"vue/attributes-order": "off",
		},
	},
	{
		// Arquivos de configuração rodam no Node, não no navegador.
		files: ["*.config.js", "*.config.cjs", "postcss.config.cjs"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
];
