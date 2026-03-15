const API_URL = "http://localhost:3000";

// ── Dashboard ────────────────────────────────────────────────
export async function getMonthlyBalance(year, month) {
    const response = await fetch(`${API_URL}/dashboard/monthly-balance?year=${year}&month=${month}`);
    return response.json();
}

export async function getCreditCardInvoice(year, month) {
    const response = await fetch(`${API_URL}/dashboard/credit-card-invoice?year=${year}&month=${month}`);
    return response.json();
}

export async function getSavedMoney(year, month) {
    const response = await fetch(`${API_URL}/dashboard/saved-money?year=${year}&month=${month}`);
    return response.json();
}

export async function getTotalSavedMoney() {
    const response = await fetch(`${API_URL}/dashboard/saved-money-total`);
    return response.json();
}

export async function getCategoryBreakdown(year, month) {
    const response = await fetch(`${API_URL}/dashboard/category-breakdown?year=${year}&month=${month}`);
    return response.json();
}

// ── Transactions ─────────────────────────────────────────────
export async function getTransactions(year, month) {
    const query = year && month ? `?year=${year}&month=${month}` : "";
    const response = await fetch(`${API_URL}/transactions${query}`);
    return response.json();
}

export async function createTransaction(transaction) {
    const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transaction),
    });
    return response.json();
}

export async function updateTransaction(id, transaction) {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transaction),
    });
    return response.json();
}

export async function deleteTransaction(id) {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: "DELETE",
    });
    return response.json();
}

// ── Goals ─────────────────────────────────────────────────────
export async function getGoals() {
    const response = await fetch(`${API_URL}/goals`);
    return response.json();
}

export async function createGoal(goal) {
    const response = await fetch(`${API_URL}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal),
    });
    return response.json();
}

export async function updateGoal(id, goal) {
    const response = await fetch(`${API_URL}/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal),
    });
    return response.json();
}

export async function deleteGoal(id) {
    const response = await fetch(`${API_URL}/goals/${id}`, {
        method: "DELETE",
    });
    return response.json();
}

// ── Bank Cards ────────────────────────────────────────────────
export async function getBankCards() {
    const response = await fetch(`${API_URL}/bank-cards`);
    return response.json();
}

export async function createBankCard(card) {
    const response = await fetch(`${API_URL}/bank-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
    });
    return response.json();
}

export async function deleteBankCard(id) {
    const response = await fetch(`${API_URL}/bank-cards/${id}`, {
        method: "DELETE",
    });
    return response.json();
}
