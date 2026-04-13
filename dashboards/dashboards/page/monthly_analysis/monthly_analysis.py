from __future__ import annotations

import frappe

from dashboards.dashboards.page.monthly_analysis.data import get_dashboard_context as get_monthly_analysis_context


@frappe.whitelist()
def get_dashboard_context(year: str | None = None):
    return get_monthly_analysis_context(year=year)

