import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import Transactions from "../views/Transactions.vue";
import Goals from "../views/Goals.vue";


const routes = [
	{
		path: "/",
		redirect: "/dashboard",
	},
	{
		path: "/dashboard",
		name: "dashboard",
		component: Dashboard,
	},
	{
		path: "/transactions",
		name: "transactions",
		component: Transactions,
	},
	{
		path: "/goals",
		name: "goals",
		component: Goals,
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

export default router;

