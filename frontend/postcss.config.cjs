/**
 * O autoprefixer foi removido: o Tailwind v4 já aplica os prefixos de
 * fornecedor internamente (via Lightning CSS). Mantê-lo era trabalho duplicado
 * e uma dependência a mais para manter.
 *
 * O tailwind.config.cjs também foi removido — era um arquivo de configuração
 * no formato da v3, completamente ignorado pela v4, que se configura pelo
 * próprio CSS (ver src/style.css).
 */
module.exports = {
	plugins: {
		"@tailwindcss/postcss": {},
	},
};
