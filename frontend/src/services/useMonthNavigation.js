/**
 * Composable para gerenciar navegação de mês/ano em views
 * Centraliza a lógica de previousMonth/nextMonth
 * 
 * Uso:
 * const { selectedYear, selectedMonth, previousMonth, nextMonth } = useMonthNavigation(onChangeCallback)
 */
import { ref, computed } from "vue";

export function useMonthNavigation(onChangeCallback = null) {
    const now = new Date();
    const selectedYear = ref(now.getFullYear());
    const selectedMonth = ref(now.getMonth() + 1);

    const MONTH_NAMES = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
    ];

    const monthLabel = computed(() => {
        return `${MONTH_NAMES[selectedMonth.value - 1]} ${selectedYear.value}`;
    });

    /**
     * Navega para o mês anterior
     */
    function previousMonth() {
        if (selectedMonth.value === 1) {
            selectedMonth.value = 12;
            selectedYear.value--;
        } else {
            selectedMonth.value--;
        }

        if (onChangeCallback) {
            onChangeCallback(selectedYear.value, selectedMonth.value);
        }
    }

    /**
     * Navega para o próximo mês
     */
    function nextMonth() {
        if (selectedMonth.value === 12) {
            selectedMonth.value = 1;
            selectedYear.value++;
        } else {
            selectedMonth.value++;
        }

        if (onChangeCallback) {
            onChangeCallback(selectedYear.value, selectedMonth.value);
        }
    }

    /**
     * Vai para um mês/ano específico
     */
    function goToMonth(month, year) {
        selectedMonth.value = month;
        selectedYear.value = year;

        if (onChangeCallback) {
            onChangeCallback(year, month);
        }
    }

    return {
        selectedYear,
        selectedMonth,
        monthLabel,
        previousMonth,
        nextMonth,
        goToMonth,
        MONTH_NAMES,
    };
}
