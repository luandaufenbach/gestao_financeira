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

export async function createTransaction(transaction) {
    const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
            "Content-type": "application/json",
        },
        body: JSON.stringify(transaction),
    });
    return response.json();
}

export async function updateTransaction(id, transaction) {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: JSON.stringify(transaction),
    });
    return response.json();
}