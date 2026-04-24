frappe.pages["supplier-dashboard"].on_page_load = function (wrapper) {
	new dashboards.ui.SupplierDashboardPage(wrapper);
};

frappe.provide("dashboards.ui");

dashboards.ui.SupplierDashboardPage = class SupplierDashboardPage {
	constructor(wrapper) {
		this.wrapper = $(wrapper);
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Панель поставщиков"),
			single_column: true,
		});

		this.make_layout();
		this.load_context();
	}

	make_layout() {
		this.wrapper.find(".layout-main-section-wrapper").addClass("supplier-dashboard-layout");
		this.wrapper.find(".page-head").addClass("supplier-dashboard-page-head");
		this.page.main.removeClass("frappe-card");

		this.page.main.html(`
			<div class="supplier-dashboard-screen">
				<div class="supplier-dashboard-shell">
					<header class="supplier-dashboard-header">
						<div class="supplier-dashboard-brand">
							<div class="supplier-dashboard-logo" data-region="logo">S</div>
							<div class="supplier-dashboard-brand-copy">
								<div class="supplier-dashboard-title">4 ИНФОРМАЦИОННАЯ ПАНЕЛЬ</div>
								<div class="supplier-dashboard-subtitle" data-region="company"></div>
							</div>
						</div>
						<div class="supplier-dashboard-info">i</div>
					</header>
					<div class="supplier-dashboard-body">
						<aside class="supplier-dashboard-kpis" data-region="kpis"></aside>
						<section class="supplier-dashboard-table-panel">
							<div class="supplier-dashboard-table-meta" data-region="period"></div>
							<div class="supplier-dashboard-table-wrap" data-region="table"></div>
						</section>
					</div>
				</div>
			</div>
		`);

		dashboards.ui.setupDashboardSidebar({
			page: this.page,
			route: "supplier-dashboard",
		});

		this.$company = this.page.main.find('[data-region="company"]');
		this.$logo = this.page.main.find('[data-region="logo"]');
		this.$period = this.page.main.find('[data-region="period"]');
		this.$kpis = this.page.main.find('[data-region="kpis"]');
		this.$table = this.page.main.find('[data-region="table"]');
	}

	load_context() {
		this.render_loading();

		frappe.call({
			method: "dashboards.dashboards.page.supplier_dashboard.supplier_dashboard.get_dashboard_context",
			callback: (r) => {
				this.context = r.message || {};
				this.render();
			},
		});
	}

	render() {
		const companyName = this.context.company_name || __("Компания");
		this.$company.text(companyName);
		this.$logo.text((companyName || "S").trim().slice(0, 1).toUpperCase());
		this.$period.text(`Период: ${this.context.period_label || ""}`);
		this.render_kpis();
		this.render_table();
	}

	render_kpis() {
		const kpis = this.context.kpis || {};
		const cards = [
			{ value: kpis.sum_prepayment, label: "Предоплата", kind: "prepayment" },
			{ value: kpis.sum_debt, label: "Долг", kind: "debt" },
		];

		this.$kpis.html(
			cards
				.map(
					(card) => `
						<div class="supplier-dashboard-kpi-card">
							<div class="supplier-dashboard-kpi-value">${this.formatKpi(card.value, card.kind)}</div>
							<div class="supplier-dashboard-kpi-label">${card.label}</div>
						</div>
					`
				)
				.join("")
		);
	}

	render_table() {
		const rows = this.context.rows || [];
		const totals = this.context.totals || {};
		const columns = this.context.columns || {};

		if (!rows.length) {
			this.$table.html(`<div class="supplier-dashboard-empty">${__("Данные по поставщикам не найдены.")}</div>`);
			return;
		}

		this.$table.html(`
			<table class="supplier-dashboard-table">
				<thead>
					<tr>
						<th class="is-text">Имя поставщика:</th>
						<th>Начало</th>
						<th>Приход</th>
						<th>Оплата наличными</th>
						<th>Оплата банком</th>
						<th>${frappe.utils.escape_html(columns.local_balance_label || "Сум остаток")}</th>
						<th>Рен</th>
					</tr>
				</thead>
				<tbody>
					${rows
						.map(
							(row) => `
								<tr>
									<td class="is-text">${frappe.utils.escape_html(row.supplier_name || "")}</td>
									<td>${this.formatNumber(row.opening)}</td>
									<td>${this.formatNumber(row.inflow)}</td>
									<td>${this.formatNumber(row.cash_payment)}</td>
									<td>${this.formatNumber(row.bank_payment)}</td>
									<td>${row.sum_balance ? this.formatLocalBalance(row.sum_balance) : ""}</td>
									<td class="${row.rentability < 0 ? "is-negative" : ""}">${this.formatPercent(row.rentability)}</td>
								</tr>
							`
						)
						.join("")}
				</tbody>
				<tfoot>
					<tr>
						<td class="is-text">Итого</td>
						<td>${this.formatNumber(totals.opening)}</td>
						<td>${this.formatNumber(totals.inflow)}</td>
						<td>${this.formatNumber(totals.cash_payment)}</td>
						<td>${this.formatNumber(totals.bank_payment)}</td>
						<td>${totals.sum_balance ? this.formatLocalBalance(totals.sum_balance) : ""}</td>
						<td class="${totals.inflow && totals.sum_balance < 0 ? "is-negative" : ""}">${this.formatPercent(totals.inflow ? (totals.sum_balance / totals.inflow) * 100 : 0)}</td>
					</tr>
				</tfoot>
			</table>
		`);
	}

	formatNumber(value) {
		if (!value) return "";
		const sign = value < 0 ? "-" : "";
		const numeric = Math.abs(Math.round(value));
		return `${sign}${String(numeric).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
	}

	formatLocalBalance(value) {
		if (!value) return "";
		const formatted = this.formatNumber(Math.abs(value));
		return value < 0 ? `-${formatted} сўм` : `${formatted} сўм`;
	}

	formatKpi(value, kind) {
		if (!value) {
			return "(Пусто)";
		}

		return kind === "prepayment" ? `-${this.formatNumber(value)}` : this.formatNumber(value);
	}

	formatPercent(value) {
		return `${Number(value || 0).toFixed(2).replace(".", ",")}%`;
	}

	render_loading() {
		const loadingMarkup = `<div class="supplier-dashboard-empty">${__("Загрузка...")}</div>`;
		this.$period.html("");
		this.$kpis.html(loadingMarkup);
		this.$table.html(loadingMarkup);
	}
};
