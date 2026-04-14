frappe.pages["comparison-by-product"].on_page_load = function (wrapper) {
	new dashboards.ui.ComparisonByProductPage(wrapper);
};

frappe.provide("dashboards.ui");

dashboards.ui.ComparisonByProductPage = class ComparisonByProductPage {
	constructor(wrapper) {
		this.wrapper = $(wrapper);
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Comparison by Product"),
			single_column: true,
		});

		this.make_layout();
		this.load_context();
	}

	make_layout() {
		this.wrapper.find(".layout-main-section-wrapper").addClass("comparison-by-product-layout");
		this.wrapper.find(".page-head").addClass("comparison-by-product-page-head");
		this.page.main.removeClass("frappe-card");

		this.page.main.html(`
			<div class="comparison-by-product-screen">
				<div class="comparison-by-product-shell">
					<section class="comparison-by-product-grid">
						<div class="comparison-by-product-panel">
							<div class="comparison-by-product-table-wrap comparison-by-product-table-wrap--products" data-region="product-table"></div>
						</div>
						<div class="comparison-by-product-stack" data-region="customer-stack"></div>
					</section>
				</div>
			</div>
		`);

		dashboards.ui.setupDashboardSidebar({
			page: this.page,
			route: "comparison-by-product",
		});

		this.$productTable = this.page.main.find('[data-region="product-table"]');
		this.$customerStack = this.page.main.find('[data-region="customer-stack"]');
	}

	load_context() {
		frappe.call({
			method: "dashboards.dashboards.page.comparison_by_product.comparison_by_product.get_dashboard_context",
			callback: (r) => {
				this.context = r.message || {};
				this.render();
			},
		});
	}

	render() {
		this.renderProductTable();
		this.renderCustomerTables();
	}

	renderProductTable() {
		const years = this.context.years || [];
		const rows = this.context.product_rows || [];

		this.$productTable.html(`
			<table class="comparison-by-product-table">
				<thead>
					<tr>
						<th class="comparison-by-product-name comparison-by-product-name--product">${frappe.utils.escape_html(
							this.context.product_title || "Предметы кг"
						)}</th>
						${years.map((year) => `<th>${frappe.utils.escape_html(String(year))}</th>`).join("")}
						<th>${__("Total")}</th>
					</tr>
				</thead>
				<tbody>
					${rows
						.map(
							(row) => `
								<tr class="${row.is_total ? "is-total" : ""}">
									<td class="comparison-by-product-name-cell comparison-by-product-name--product">${frappe.utils.escape_html(
										row.label || ""
									)}</td>
									${(row.values || []).map((value) => `<td class="is-number">${frappe.utils.escape_html(String(value || ""))}</td>`).join("")}
									<td class="is-number comparison-by-product-total-cell">${frappe.utils.escape_html(String(row.total || ""))}</td>
								</tr>
							`
						)
						.join("")}
				</tbody>
			</table>
		`);
	}

	renderCustomerTables() {
		const tables = this.context.customer_tables || [];
		this.$customerStack.html(
			tables
				.map(
					(table) => `
						<div class="comparison-by-product-panel">
							<div class="comparison-by-product-table-wrap">
								<table class="comparison-by-product-table comparison-by-product-table--customers">
									<thead>
										<tr>
											<th class="comparison-by-product-name comparison-by-product-name--customer">${frappe.utils.escape_html(
												table.title || ""
											)}</th>
											${(table.months || []).map((month) => `<th>${frappe.utils.escape_html(month)}</th>`).join("")}
											<th>${__("Total")}</th>
										</tr>
									</thead>
									<tbody>
										${(table.rows || [])
											.map(
												(row) => `
													<tr class="${row.is_total ? "is-total" : ""}">
														<td class="comparison-by-product-name-cell comparison-by-product-name--customer">${frappe.utils.escape_html(
															row.label || ""
														)}</td>
														${(row.values || [])
															.map((value) => `<td class="is-number">${frappe.utils.escape_html(String(value || ""))}</td>`)
															.join("")}
														<td class="is-number comparison-by-product-total-cell">${frappe.utils.escape_html(String(row.total || ""))}</td>
													</tr>
												`
											)
											.join("")}
									</tbody>
								</table>
							</div>
						</div>
					`
				)
				.join("")
		);
	}
};
