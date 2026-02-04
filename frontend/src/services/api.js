const API_URL = "http://localhost:3000";

export async function getMonthlyBalance() {
    const response = await fetch(`${API_URL}/dashboard/monthly-balance`);
    return response.json();
}

export async function getCreditCardInvoice() {
    const response = await fetch(`${API_URL}/dashboard/credit-card-invoice`);
    return response.json();
}

export async function getSavedMoney() {
    const response = await fetch(`${API_URL}/dashboard/saved-money`);
    return response.json();
}