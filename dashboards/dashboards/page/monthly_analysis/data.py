from __future__ import annotations

from collections import defaultdict
from typing import Any

import frappe
from frappe.utils import cint, flt, getdate, today

from dashboards.dashboards.dashboard_data import MONTH_LABELS, format_number


DEFAULT_ROW_LIMIT = 25


def _get_years() -> list[str]:
    rows = frappe.db.sql(
        """
        SELECT DISTINCT YEAR(posting_date) AS year
        FROM `tabSales Invoice`
        WHERE docstatus = 1
          AND COALESCE(is_return, 0) = 0
          AND posting_date IS NOT NULL
        ORDER BY year
        """,
        as_dict=True,
    )

    years = [str(row.year) for row in rows if row.year]
    if years:
        return years

    return [str(getdate(today()).year)]


def _get_default_year(years: list[str]) -> str:
    latest_posting_date = frappe.db.sql(
        """
        SELECT MAX(posting_date) AS posting_date
        FROM `tabSales Invoice`
        WHERE docstatus = 1
          AND COALESCE(is_return, 0) = 0
        """,
        as_dict=True,
    )[0].posting_date

    if latest_posting_date:
        default_year = str(getdate(latest_posting_date).year)
        if default_year in years:
            return default_year

    return years[-1]


def _normalize_year(year: str | None) -> tuple[list[str], str]:
    years = _get_years()
    selected_year = year if year in years else _get_default_year(years)
    return years, selected_year


def _format_int(value: float | int) -> str:
    return format_number(round(flt(value)), precision=0)


def _build_matrix(
    rows: list[dict[str, Any]],
    label_key: str,
    value_key: str,
    row_limit: int = DEFAULT_ROW_LIMIT,
) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}

    for row in rows:
        label = (row.get(label_key) or "").strip() or "Unknown"
        month_no = cint(row.get("month_no"))
        if month_no < 1 or month_no > 12:
            continue

        entry = grouped.setdefault(
            label,
            {
                "label": label,
                "month_values": defaultdict(float),
                "total": 0.0,
            },
        )
        value = flt(row.get(value_key))
        entry["month_values"][month_no] += value
        entry["total"] += value

    ordered = sorted(grouped.values(), key=lambda item: (-item["total"], item["label"]))
    total_by_month = defaultdict(float)
    grand_total = 0.0

    for entry in ordered:
        grand_total += entry["total"]
        for month_no in range(1, 13):
            total_by_month[month_no] += entry["month_values"].get(month_no, 0)

    visible_rows = ordered[:row_limit] if row_limit else ordered
    result = []
    for entry in visible_rows:
        result.append(
            {
                "label": entry["label"],
                "values": [_format_int(entry["month_values"].get(month_no, 0)) if entry["month_values"].get(month_no, 0) else "" for month_no in range(1, 13)],
                "total": _format_int(entry["total"]),
            }
        )

    result.append(
        {
            "label": "Total",
            "values": [_format_int(total_by_month.get(month_no, 0)) if total_by_month.get(month_no, 0) else "" for month_no in range(1, 13)],
            "total": _format_int(grand_total),
            "is_total": True,
        }
    )

    return result


def _get_client_rows(year: str) -> list[dict[str, Any]]:
    rows = frappe.db.sql(
        """
        SELECT
            COALESCE(NULLIF(si.customer_name, ''), si.customer, 'Unknown Client') AS client,
            MONTH(si.posting_date) AS month_no,
            SUM(COALESCE(sii.stock_qty, sii.qty, 0)) AS total_qty
        FROM `tabSales Invoice` si
        INNER JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
        WHERE si.docstatus = 1
          AND COALESCE(si.is_return, 0) = 0
          AND YEAR(si.posting_date) = %(year)s
        GROUP BY COALESCE(NULLIF(si.customer_name, ''), si.customer, 'Unknown Client'), MONTH(si.posting_date)
        ORDER BY total_qty DESC
        """,
        {"year": cint(year)},
        as_dict=True,
    )

    return _build_matrix(rows, label_key="client", value_key="total_qty")


def _get_item_rows(year: str) -> list[dict[str, Any]]:
    rows = frappe.db.sql(
        """
        SELECT
            COALESCE(NULLIF(sii.item_name, ''), sii.item_code, 'Unknown Item') AS item,
            MONTH(si.posting_date) AS month_no,
            SUM(COALESCE(sii.stock_qty, sii.qty, 0)) AS total_qty
        FROM `tabSales Invoice` si
        INNER JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
        WHERE si.docstatus = 1
          AND COALESCE(si.is_return, 0) = 0
          AND YEAR(si.posting_date) = %(year)s
        GROUP BY COALESCE(NULLIF(sii.item_name, ''), sii.item_code, 'Unknown Item'), MONTH(si.posting_date)
        ORDER BY total_qty DESC
        """,
        {"year": cint(year)},
        as_dict=True,
    )

    return _build_matrix(rows, label_key="item", value_key="total_qty")


def get_dashboard_context(year: str | None = None) -> dict[str, Any]:
    years, selected_year = _normalize_year(year)

    return {
        "title_primary": "2 ИНФОРМАЦИОННАЯ ПАНЕЛЬ",
        "title_secondary": "КОМПАНИЯ",
        "selected_year": selected_year,
        "years": years,
        "months": MONTH_LABELS,
        "client_section_title": "Клиент кг",
        "item_section_title": "Предметы кг",
        "client_rows": _get_client_rows(selected_year),
        "item_rows": _get_item_rows(selected_year),
    }
