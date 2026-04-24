frappe.pages["customer-comparison"].on_page_load = function (wrapper) {
	new dashboards.ui.CustomerComparisonPage(wrapper);
};

frappe.provide("dashboards.ui");

dashboards.ui.CustomerComparisonPage = class CustomerComparisonPage {
	constructor(wrapper) {
		this.wrapper = $(wrapper);
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Сравнение клиентов"),
			single_column: true,
		});

		this.make_layout();
		this.load_context();
	}

	make_layout() {
		this.wrapper.find(".layout-main-section-wrapper").addClass("customer-comparison-layout");
		this.wrapper.find(".page-head").addClass("customer-comparison-page-head");
		this.page.main.removeClass("frappe-card");

		this.page.main.html(`
			<div class="customer-comparison-screen">
				<div class="customer-comparison-panel">
					<div class="customer-comparison-hero">
						<div>
							<div class="customer-comparison-kicker" data-region="subtitle"></div>
							<div class="customer-comparison-title" data-region="title"></div>
						</div>
						<div class="customer-comparison-meta" data-region="meta"></div>
					</div>
					<div class="customer-comparison-content" data-region="content"></div>
				</div>
			</div>
		`);

		dashboards.ui.setupDashboardSidebar({
			page: this.page,
			route: "customer-comparison",
		});

		this.$title = this.page.main.find('[data-region="title"]');
		this.$subtitle = this.page.main.find('[data-region="subtitle"]');
		this.$meta = this.page.main.find('[data-region="meta"]');
		this.$content = this.page.main.find('[data-region="content"]');
	}

	load_context() {
		frappe.call({
			method: "dashboards.dashboards.page.customer_comparison.customer_comparison.get_dashboard_context",
			callback: (r) => {
				this.context = r.message || {};
				this.render();
			},
		});
	}

	render() {
		this.$title.text(this.context.title || __("Сравнение клиентов"));
		this.$subtitle.text(this.context.subtitle || "");
		this.render_meta();
		this.render_months();
	}

	render_meta() {
		const years = (this.context.years || []).join(", ");
		const reference = [this.context.reference_month, this.context.reference_year].filter(Boolean).join(" ");
		const itemLimit = this.context.item_limit || 0;

		this.$meta.html(`
			<div class="customer-comparison-meta-line">${__("Годы")}: ${frappe.utils.escape_html(years || "-")}</div>
			<div class="customer-comparison-meta-line">${__("Период")}: ${frappe.utils.escape_html(reference || "-")}</div>
			<div class="customer-comparison-meta-line">${__("Топ клиентов за месяц")}: ${itemLimit}</div>
		`);
	}

	render_months() {
		const months = this.context.months || [];
		if (!months.length || !months.some((month) => (month.customers || []).length)) {
			this.$content.html(`
				<div class="customer-comparison-empty">
					<div class="customer-comparison-empty-title">${__("Данные для сравнения не найдены")}</div>
					<div class="customer-comparison-empty-copy">${__("Для построения этой панели нужны данные счетов продаж.")}</div>
				</div>
			`);
			return;
		}

		this.$content.html(`
			<div class="customer-comparison-scroll">
				${months.map((month) => this.render_month(month)).join("")}
			</div>
		`);
	}

	render_month(month) {
		const years = month.years || [];
		const customers = month.customers || [];
		const maxValue = Number(month.max_value || 0);

		return `
			<section class="customer-comparison-month">
				<div class="customer-comparison-month-title">${frappe.utils.escape_html(month.month_label || "")}</div>
				<div class="customer-comparison-grid" style="--cc-year-count:${Math.max(years.length, 1)};">
					<div class="customer-comparison-head customer-comparison-head--item">${__("Клиент")}</div>
					${years
						.map(
							(year) => `
								<div class="customer-comparison-head">
									${frappe.utils.escape_html(String(year))}
								</div>
							`
						)
						.join("")}
					${customers
						.map(
							(customer) => `
								<div class="customer-comparison-item">${frappe.utils.escape_html(customer.label || "")}</div>
								${(customer.values || [])
									.map((value) => this.render_metric_cell(value, maxValue))
									.join("")}
							`
						)
						.join("")}
				</div>
				${
					month.hidden_item_count
						? `<div class="customer-comparison-footnote">+${month.hidden_item_count} ${__("клиентов еще")}</div>`
						: ""
				}
			</section>
		`;
	}

	render_metric_cell(value, maxValue) {
		const numericValue = Number(value || 0);
		const width = maxValue > 0 && numericValue > 0 ? Math.max((numericValue / maxValue) * 100, 6) : 0;

		return `
			<div class="customer-comparison-metric" title="${this.format_full_number(numericValue)}">
				<div class="customer-comparison-bar-track">
					${width ? `<div class="customer-comparison-bar-fill" style="width:${Math.min(width, 100)}%"></div>` : ""}
				</div>
				<div class="customer-comparison-metric-value">${this.format_compact_number(numericValue)}</div>
			</div>
		`;
	}

	format_compact_number(value) {
		const numericValue = Number(value || 0);
		if (!numericValue) {
			return "";
		}

		const absValue = Math.abs(numericValue);
		if (absValue >= 1000000) {
			return `${(numericValue / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
		}

		if (absValue >= 1000) {
			return `${(numericValue / 1000).toFixed(1).replace(/\.0$/, "")}K`;
		}

		return this.format_full_number(numericValue);
	}

	format_full_number(value) {
		return Number(value || 0).toLocaleString("en-US").replace(/,/g, " ");
	}
};
