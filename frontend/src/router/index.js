import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "../stores/auth";

const routes = [
	{
		path: "/login",
		name: "login",
		// Carregamento sob demanda: a tela de login não precisa estar no bundle
		// principal, e quem já está logado nunca a baixa.
		component: () => import("../views/Login.vue"),
		meta: { public: true },
	},
	{ path: "/", redirect: "/dashboard" },
	{
		path: "/dashboard",
		name: "dashboard",
		component: () => import("../views/Dashboard.vue"),
	},
	{
		path: "/transactions",
		name: "transactions",
		component: () => import("../views/Transactions.vue"),
	},
	{
		path: "/goals",
		name: "goals",
		component: () => import("../views/Goals.vue"),
	},
	// Antes, uma URL inexistente renderizava uma página em branco sem aviso.
	{
		path: "/:pathMatch(.*)*",
		redirect: "/dashboard",
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

/**
 * Guard de autenticação.
 *
 * Rotas são protegidas por padrão: só passam sem sessão as que declaram
 * `meta.public`. Assim, uma rota nova nasce protegida, e não o contrário.
 */
router.beforeEach(async (to) => {
	const { isAuthenticated, initialized, restoreSession } = useAuth();

	// Na primeira navegação, revalida o token guardado no localStorage.
	if (!initialized.value) {
		await restoreSession();
	}

	if (to.meta.public) {
		// Quem já está logado não precisa ver a tela de login.
		return isAuthenticated.value ? { path: "/dashboard" } : true;
	}

	if (!isAuthenticated.value) {
		// Guarda o destino para retomar depois do login.
		return { path: "/login", query: to.fullPath !== "/" ? { redirect: to.fullPath } : {} };
	}

	return true;
});

export default router;
