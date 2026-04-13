from __future__ import annotations

import frappe

from dashboards.dashboards.page.dividend_analysis.data import get_dashboard_snapshot


@frappe.whitelist()
def get_dashboard_context():
    return get_dashboard_snapshot()
