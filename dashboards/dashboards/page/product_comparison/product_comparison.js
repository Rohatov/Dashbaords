frappe.pages["product-comparison"].on_page_load = function (wrapper) {
	new dashboards.ui.ProductComparisonPage(wrapper);
};

frappe.provide("dashboards.ui");

dashboards.ui.ProductComparisonPage = class ProductComparisonPage {
	constructor(wrapper) {
		this.wrapper = $(wrapper);
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Product Comparison"),
			single_column: true,
		});

		this.make_layout();
		this.load_context();
	}

	make_layout() {
		this.wrapper.find(".layout-main-section-wrapper").addClass("product-comparison-layout");
		this.wrapper.find(".page-head").addClass("product-comparison-page-head");
		this.page.main.removeClass("frappe-card");

		this.page.main.html(`
			<div class="product-comparison-screen">
				<div class="product-comparison-panel">
					<div class="product-comparison-hero">
						<div>
							<div class="product-comparison-kicker" data-region="subtitle"></div>
							<div class="product-comparison-title" data-region="title"></div>
						</div>
						<div class="product-comparison-meta" data-region="meta"></div>
					</div>
					<div class="product-comparison-content" data-region="content"></div>
				</div>
			</div>
		`);

		this.$title = this.page.main.find('[data-region="title"]');
		this.$subtitle = this.page.main.find('[data-region="subtitle"]');
		this.$meta = this.page.main.find('[data-region="meta"]');
		this.$content = this.page.main.find('[data-region="content"]');
	}

	load_context() {
		frappe.call({
			method: "dashboards.dashboards.page.product_comparison.product_comparison.get_dashboard_context",
			callback: (r) => {
				this.context = r.message || {};
				this.render();
			},
		});
	}

	render() {
		this.$title.text(this.context.title || __("Product Comparison"));
		this.$subtitle.text(this.context.subtitle || "");
		this.render_meta();
		this.render_months();
	}

	render_meta() {
		const years = (this.context.years || []).join(", ");
		const reference = [this.context.reference_month, this.context.reference_year].filter(Boolean).join(" ");
		const itemLimit = this.context.item_limit || 0;

		this.$meta.html(`
			<div class="product-comparison-meta-line">${__("Years")}: ${frappe.utils.escape_html(years || "-")}</div>
			<div class="product-comparison-meta-line">${__("Period")}: ${frappe.utils.escape_html(reference || "-")}</div>
			<div class="product-comparison-meta-line">${__("Top items per month")}: ${itemLimit}</div>
		`);
	}

	render_months() {
		const months = this.context.months || [];
		if (!months.length || !months.some((month) => (month.items || []).length)) {
			this.$content.html(`
				<div class="product-comparison-empty">
					<div class="product-comparison-empty-title">${__("No comparison data found")}</div>
					<div class="product-comparison-empty-copy">${__("Sales Invoice data is required to build this dashboard.")}</div>
				</div>
			`);
			return;
		}

		this.$content.html(`
			<div class="product-comparison-scroll">
				${months.map((month) => this.render_month(month)).join("")}
			</div>
		`);
	}

	render_month(month) {
		const years = month.years || [];
		const items = month.items || [];
		const maxValue = Number(month.max_value || 0);

		return `
			<section class="product-comparison-month">
				<div class="product-comparison-month-title">${frappe.utils.escape_html(month.month_label || "")}</div>
				<div class="product-comparison-grid" style="--pc-year-count:${Math.max(years.length, 1)};">
					<div class="product-comparison-head product-comparison-head--item">${__("Предметы")}</div>
					${years
						.map(
							(year) => `
								<div class="product-comparison-head">
									${frappe.utils.escape_html(String(year))}
								</div>
							`
						)
						.join("")}
					${items
						.map(
							(item) => `
								<div class="product-comparison-item">${frappe.utils.escape_html(item.label || "")}</div>
								${(item.values || [])
									.map((value) => this.render_metric_cell(value, maxValue))
									.join("")}
							`
						)
						.join("")}
				</div>
				${
					month.hidden_item_count
						? `<div class="product-comparison-footnote">+${month.hidden_item_count} ${__("more items")}</div>`
						: ""
				}
			</section>
		`;
	}

	render_metric_cell(value, maxValue) {
		const numericValue = Number(value || 0);
		const width = maxValue > 0 && numericValue > 0 ? Math.max((numericValue / maxValue) * 100, 6) : 0;

		return `
			<div class="product-comparison-metric" title="${this.format_full_number(numericValue)}">
				<div class="product-comparison-bar-track">
					${width ? `<div class="product-comparison-bar-fill" style="width:${Math.min(width, 100)}%"></div>` : ""}
				</div>
				<div class="product-comparison-metric-value">${this.format_compact_number(numericValue)}</div>
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
