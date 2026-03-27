/**
 * Composable para centralizar todas as funções de formatação
 * Reutilizável em qualquer componente/view
 */
export function useFormatters() {
  /**
   * Formata um valor para moeda brasileira (BRL)
   * @param {number} value - Valor a formatar
   * @returns {string} - Valor formatado como moeda
   */
  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  /**
   * Formata uma data ISO para o padrão brasileiro
   * @param {string} isoDate - Data em formato ISO
   * @returns {string} - Data formatada como DD/MM/YYYY
   */
  function formatDate(isoDate) {
    if (!isoDate) return "Sem data";
    const d = new Date(isoDate);
    return Number.isNaN(d.getTime()) ? String(isoDate) : d.toLocaleDateString("pt-BR");
  }

  /**
   * Retorna a cor (classe Tailwind) baseado no tipo de transação
   * @param {string} type - Tipo de transação (income, debit, credit, savings)
   * @returns {string} - Classe de cor Tailwind
   */
  function amountColor(type) {
    if (type === "income") return "text-emerald-600";
    return "text-red-500";
  }

  /**
   * Traduz tipo de transação para português
   * @param {string} type - Tipo de transação
   * @returns {string} - Tipo traduzido
   */
  function formatType(type) {
    const map = {
      income: "Receita",
      debit: "Débito",
      credit: "Crédito",
      savings: "Guardado",
    };
    return map[type] || type;
  }

  /**
   * Formata nome de categoria (primeira letra maiúscula)
   * @param {string} category - Nome da categoria
   * @returns {string} - Categoria formatada
   */
  function formatCategory(category) {
    if (!category) return "Sem categoria";
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  /**
   * Calcula percentual de progresso
   * @param {number} current - Valor atual
   * @param {number} target - Valor alvo
   * @returns {number} - Percentual (0-100)
   */
  function calculateProgress(current, target) {
    if (!target || target === 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  return {
    formatCurrency,
    formatDate,
    amountColor,
    formatType,
    formatCategory,
    calculateProgress,
  };
}
