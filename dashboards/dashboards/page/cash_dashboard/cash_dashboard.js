frappe.pages["cash-dashboard"].on_page_load = function (wrapper) {
	new dashboards.ui.CashDashboardPage(wrapper);
};

frappe.provide("dashboards.ui");

dashboards.ui.CashDashboardPage = class CashDashboardPage {
	constructor(wrapper) {
		this.wrapper = $(wrapper);
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Cash Dashboard"),
			single_column: true,
		});

		this.state = {
			month: null,
		};

		this.make_layout();
		this.load_context();
	}

	make_layout() {
		this.wrapper.find(".layout-main-section-wrapper").addClass("cash-dashboard-layout");
		this.wrapper.find(".page-head").addClass("cash-dashboard-page-head");
		this.page.main.removeClass("frappe-card");

		this.page.main.html(`
			<div class="cash-dashboard-screen">
				<div class="cash-dashboard-shell">
					<div class="cash-dashboard-tabs" data-region="tabs"></div>
					<div class="cash-dashboard-months" data-region="months"></div>
					<div class="cash-dashboard-kpis">
						<div class="cash-dashboard-kpi cash-dashboard-kpi--wide" data-region="cash-kpi"></div>
						<div class="cash-dashboard-kpi cash-dashboard-kpi--balance" data-region="cash-balance"></div>
						<div class="cash-dashboard-kpi cash-dashboard-kpi--balance" data-region="bank-balance"></div>
						<div class="cash-dashboard-kpi cash-dashboard-kpi--wide" data-region="bank-kpi"></div>
					</div>
					<div class="cash-dashboard-content">
						<div class="cash-dashboard-table-slot" data-region="cash-table"></div>
						<div class="cash-dashboard-table-slot" data-region="bank-table"></div>
					</div>
				</div>
			</div>
		`);

		dashboards.ui.setupDashboardSidebar({
			page: this.page,
			route: "cash-dashboard",
		});

		this.$tabs = this.page.main.find('[data-region="tabs"]');
		this.$months = this.page.main.find('[data-region="months"]');
		this.$cashKpi = this.page.main.find('[data-region="cash-kpi"]');
		this.$cashBalance = this.page.main.find('[data-region="cash-balance"]');
		this.$bankBalance = this.page.main.find('[data-region="bank-balance"]');
		this.$bankKpi = this.page.main.find('[data-region="bank-kpi"]');
		this.$cashTable = this.page.main.find('[data-region="cash-table"]');
		this.$bankTable = this.page.main.find('[data-region="bank-table"]');
	}

	load_context() {
		this.render_loading();

		frappe.call({
			method: "dashboards.dashboards.page.cash_dashboard.cash_dashboard.get_dashboard_context",
			args: {
				month: this.state.month,
			},
			callback: (r) => {
				this.context = r.message || {};
				this.state = { ...(this.context.default_filters || {}) };
				this.render();
			},
		});
	}

	render() {
		this.render_tabs();
		this.render_months();
		this.render_kpis();
		this.render_tables();
	}

	render_tabs() {
		const tabs = this.context.tabs || [];
		this.$tabs.html(
			tabs
				.map(
					(tab) => `
						<button class="cash-dashboard-tab ${tab.active ? "is-active" : ""}" data-route="${tab.route}">
							${frappe.utils.escape_html(tab.label)}
						</button>
					`
				)
				.join("") +
				`<div class="cash-dashboard-info">i</div>`
		);

		this.$tabs.find("[data-route]").on("click", (e) => {
			const route = $(e.currentTarget).data("route");
			if (route) {
				frappe.set_route(route.replace(/^\/app\//, ""));
			}
		});
	}

	render_months() {
		const months = this.context.months || [];
		this.$months.html(
			months
				.map(
					(month) => `
						<button class="cash-dashboard-month ${month.key === this.state.month ? "is-active" : ""}" data-month="${month.key}">
							${frappe.utils.escape_html(month.label)}
						</button>
					`
				)
				.join("")
		);

		this.$months.find("[data-month]").on("click", (e) => {
			this.state.month = String($(e.currentTarget).data("month"));
			this.load_context();
		});
	}

	render_kpis() {
		const metrics = this.context.metrics || {};
		const cashMetric = metrics.cash || { start: 0, inflow: 0, outflow: 0, end: 0 };
		const bankMetric = metrics.bank || { start: 0, inflow: 0, outflow: 0, end: 0 };

		this.$cashKpi.html(this.getWideKpiMarkup(cashMetric, "касса"));
		this.$bankKpi.html(this.getWideKpiMarkup(bankMetric, "банк"));
		this.$cashBalance.html(this.getBalanceMarkup(cashMetric.end, "Остаток касса"));
		this.$bankBalance.html(this.getBalanceMarkup(bankMetric.end, "Остаток банк"));
	}

	render_tables() {
		const metrics = this.context.metrics || {};
		const cashRows = this.context.cash_rows || [];
		const bankRows = this.context.bank_rows || [];
		this.$cashTable.html(this.getTableMarkup(cashRows, metrics.cash, "касса"));
		this.$bankTable.html(this.getTableMarkup(bankRows, metrics.bank, "банк"));
	}

	getWideKpiMarkup(metric, label) {
		metric = metric || { start: 0, inflow: 0, outflow: 0, end: 0 };

		return `
			<div class="cash-dashboard-kpi-grid">
				<div class="cash-dashboard-kpi-item">
					<div class="cash-dashboard-kpi-value is-green">${this.formatInteger(metric.start)}</div>
					<div class="cash-dashboard-kpi-label">Начало ${label}</div>
				</div>
				<div class="cash-dashboard-kpi-item">
					<div class="cash-dashboard-kpi-value is-green">${this.formatInteger(metric.inflow)}</div>
					<div class="cash-dashboard-kpi-label">Приход ${label}</div>
				</div>
				<div class="cash-dashboard-kpi-item">
					<div class="cash-dashboard-kpi-value is-red">${this.formatInteger(metric.outflow)}</div>
					<div class="cash-dashboard-kpi-label">Расход ${label}</div>
				</div>
				<div class="cash-dashboard-kpi-item">
					<div class="cash-dashboard-kpi-value is-green">${this.formatInteger(metric.end)}</div>
					<div class="cash-dashboard-kpi-label">Конец ${label}</div>
				</div>
			</div>
		`;
	}

	getBalanceMarkup(value, label) {
		return `
			<div class="cash-dashboard-balance-value">${this.formatBalance(value)}</div>
			<div class="cash-dashboard-balance-label">${frappe.utils.escape_html(label)}</div>
		`;
	}

	getTableMarkup(rows, metric, label) {
		metric = metric || { inflow: 0, outflow: 0 };

		if (!rows.length) {
			return `
				<div class="cash-dashboard-table-empty">
					${__("No GL Entry data found for the selected period.")}
				</div>
			`;
		}

		return `
			<table class="cash-dashboard-table">
				<thead>
					<tr>
						<th class="is-category">(2)</th>
						<th class="is-number">Прих.${frappe.utils.escape_html(label)}</th>
						<th class="is-number">Расход ${frappe.utils.escape_html(label)}</th>
					</tr>
				</thead>
				<tbody>
					${rows
						.map(
							(row) => `
								<tr class="${row.group ? "is-group" : "is-child"}">
									<td class="is-category ${row.level ? "is-level-1" : ""}">
										${row.group ? '<span class="cash-dashboard-tree-toggle">⊞</span>' : ""}
										<span>${frappe.utils.escape_html(row.label)}</span>
									</td>
									<td class="is-number">${row.inflow ? this.formatInteger(row.inflow) : ""}</td>
									<td class="is-number">${row.outflow ? this.formatInteger(row.outflow) : "0"}</td>
								</tr>
							`
						)
						.join("")}
					<tr class="is-total">
						<td class="is-category">Total</td>
						<td class="is-number">${this.formatInteger(metric.inflow)}</td>
						<td class="is-number">${this.formatInteger(metric.outflow)}</td>
					</tr>
				</tbody>
			</table>
		`;
	}

	formatInteger(value) {
		const sign = value < 0 ? "-" : "";
		const numeric = Math.abs(Math.round(value));
		return `${sign}${String(numeric).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
	}

	formatBalance(value) {
		if (!value) {
			return "(Blank)";
		}

		const millions = Math.round(value / 1000000);
		return `${millions}M`;
	}

	render_loading() {
		const loadingMarkup = `<div class="cash-dashboard-table-empty">${__("Loading...")}</div>`;
		this.$cashKpi.html(loadingMarkup);
		this.$bankKpi.html(loadingMarkup);
		this.$cashBalance.html(loadingMarkup);
		this.$bankBalance.html(loadingMarkup);
		this.$cashTable.html(loadingMarkup);
		this.$bankTable.html(loadingMarkup);
	}
};
