from __future__ import annotations

import frappe

from dashboards.dashboards.page.comparison_by_weight.data import (
	get_dashboard_context as get_comparison_by_weight_context,
)


@frappe.whitelist()
def get_dashboard_context(month: str | None = None):
	return get_comparison_by_weight_context(month=month)
