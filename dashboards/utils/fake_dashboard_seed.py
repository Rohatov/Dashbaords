from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal
from random import Random
from typing import Any

import frappe
from frappe.utils import add_days, get_last_day, now_datetime


BATCH_PREFIX = "UI-DEMO-20260413"
OWNER = "Administrator"
COMPANY = "Pokiza"
COMPANY_CURRENCY = "USD"
CUSTOMER_COUNT = 48
ITEM_COUNT = 72
SUPPLIER_COUNT = 24
SALES_INVOICE_COUNT = 240
PURCHASE_INVOICE_COUNT = 96
PAYMENT_ENTRY_RECEIVE_COUNT = 120
PAYMENT_ENTRY_PAY_COUNT = 96
GL_ENTRY_COUNT = 96


CUSTOMER_PARTS = [
    "Atlas", "Samarkand", "Oasis", "Grand", "Silk", "Nova", "Orient", "Prime",
    "Golden", "Vector", "Rivoj", "Imkon", "Baraka", "Zamin", "Fortis", "Premium",
]
ITEM_PARTS = [
    "Milk", "Cheese", "Butter", "Yogurt", "Cream", "Sausage", "Pelmeni", "Cutlet",
    "Chicken", "Bacon", "Burger", "Kebab", "Lavash", "Manti", "Nuggets", "Smetana",
]
SUPPLIER_PARTS = [
    "Agro", "Fresh", "Protein", "Market", "Trade", "Logistics", "Foods", "Import",
    "Distribution", "Plast", "Cold", "Service",
]


def _now_strings() -> tuple[str, str]:
    now = now_datetime().strftime("%Y-%m-%d %H:%M:%S.%f")
    return now, now


def _row_exists(table: str, name: str) -> bool:
    return bool(frappe.db.sql(f"select name from `tab{table}` where name=%s limit 1", name))


def _insert_row(table: str, values: dict[str, Any]) -> bool:
    name = values["name"]
    if _row_exists(table, name):
        return False

    columns = ", ".join(f"`{column}`" for column in values)
    placeholders = ", ".join(["%s"] * len(values))
    frappe.db.sql(
        f"insert into `tab{table}` ({columns}) values ({placeholders})",
        tuple(values.values()),
    )
    return True


def _pick_leaf_account(account_type: str) -> str | None:
    row = frappe.db.sql(
        """
        select name
        from `tabAccount`
        where is_group = 0
          and account_type = %s
        order by name
        limit 1
        """,
        account_type,
        as_dict=True,
    )
    return row[0].name if row else None


def _month_pool() -> list[date]:
    months = []
    for year in (2023, 2024, 2025, 2026):
        for month in range(1, 13):
            months.append(date(year, month, 1))
    return months


def _make_customer_name(index: int) -> str:
    left = CUSTOMER_PARTS[index % len(CUSTOMER_PARTS)]
    right = CUSTOMER_PARTS[(index * 3) % len(CUSTOMER_PARTS)]
    return f"{BATCH_PREFIX}-CUST-{index:03d} {left} {right}"


def _make_item(index: int) -> tuple[str, str]:
    family = ITEM_PARTS[index % len(ITEM_PARTS)]
    variant = ITEM_PARTS[(index * 5) % len(ITEM_PARTS)]
    code = f"{BATCH_PREFIX}-ITEM-{index:03d}"
    return code, f"{family} {variant} {index:03d}"


def _make_supplier_name(index: int) -> str:
    left = SUPPLIER_PARTS[index % len(SUPPLIER_PARTS)]
    right = SUPPLIER_PARTS[(index * 2) % len(SUPPLIER_PARTS)]
    return f"{BATCH_PREFIX}-SUP-{index:03d} {left} {right}"


def _seed_customers() -> tuple[list[str], int]:
    creation, modified = _now_strings()
    names = []
    created = 0
    for index in range(1, CUSTOMER_COUNT + 1):
        name = _make_customer_name(index)
        names.append(name)
        created += int(
            _insert_row(
                "Customer",
                {
                    "name": name,
                    "creation": creation,
                    "modified": modified,
                    "modified_by": OWNER,
                    "owner": OWNER,
                    "docstatus": 0,
                    "idx": 0,
                    "customer_name": name,
                    "customer_type": "Company",
                    "disabled": 0,
                    "is_frozen": 0,
                },
            )
        )
    return names, created


def _seed_items() -> tuple[list[dict[str, str]], int]:
    creation, modified = _now_strings()
    items = []
    created = 0
    for index in range(1, ITEM_COUNT + 1):
        code, item_name = _make_item(index)
        items.append({"item_code": code, "item_name": item_name})
        created += int(
            _insert_row(
                "Item",
                {
                    "name": code,
                    "creation": creation,
                    "modified": modified,
                    "modified_by": OWNER,
                    "owner": OWNER,
                    "docstatus": 0,
                    "idx": 0,
                    "item_code": code,
                    "item_name": item_name,
                    "is_stock_item": 1,
                    "is_sales_item": 1,
                    "is_purchase_item": 1,
                    "disabled": 0,
                    "stock_uom": "Nos",
                },
            )
        )
    return items, created


def _seed_suppliers() -> tuple[list[str], int]:
    creation, modified = _now_strings()
    names = []
    created = 0
    for index in range(1, SUPPLIER_COUNT + 1):
        name = _make_supplier_name(index)
        names.append(name)
        created += int(
            _insert_row(
                "Supplier",
                {
                    "name": name,
                    "creation": creation,
                    "modified": modified,
                    "modified_by": OWNER,
                    "owner": OWNER,
                    "docstatus": 0,
                    "idx": 0,
                    "supplier_name": name,
                    "supplier_type": "Company",
                    "disabled": 0,
                    "is_frozen": 0,
                },
            )
        )
    return names, created


def _seed_sales(customers: list[str], items: list[dict[str, str]]) -> dict[str, int]:
    rng = Random(240613)
    creation, modified = _now_strings()
    months = _month_pool()
    created = defaultdict(int)

    for index in range(1, SALES_INVOICE_COUNT + 1):
        month_start = months[(index - 1) % len(months)]
        posting_date = add_days(month_start.isoformat(), rng.randint(0, 24))
        customer = customers[(index * 7) % len(customers)]
        invoice_name = f"{BATCH_PREFIX}-SINV-{index:04d}"

        invoice_items = []
        total_qty = Decimal("0")
        total_amount = Decimal("0")
        for item_idx in range(3):
            item = items[(index * 5 + item_idx * 11) % len(items)]
            qty = Decimal(str(rng.randint(8, 120)))
            rate = Decimal(str(rng.randint(12, 110)))
            amount = qty * rate
            incoming_rate = (rate * Decimal("0.68")).quantize(Decimal("0.01"))
            row_name = f"{invoice_name}-ITEM-{item_idx + 1}"
            invoice_items.append(
                {
                    "name": row_name,
                    "creation": creation,
                    "modified": modified,
                    "modified_by": OWNER,
                    "owner": OWNER,
                    "docstatus": 1,
                    "idx": item_idx + 1,
                    "item_code": item["item_code"],
                    "item_name": item["item_name"],
                    "qty": qty,
                    "stock_qty": qty,
                    "uom": "Nos",
                    "stock_uom": "Nos",
                    "conversion_factor": 1,
                    "rate": rate,
                    "amount": amount,
                    "base_rate": rate,
                    "base_amount": amount,
                    "net_rate": rate,
                    "net_amount": amount,
                    "base_net_rate": rate,
                    "base_net_amount": amount,
                    "incoming_rate": incoming_rate,
                    "parent": invoice_name,
                    "parentfield": "items",
                    "parenttype": "Sales Invoice",
                }
            )
            total_qty += qty
            total_amount += amount

        outstanding = (total_amount * Decimal("0.28")).quantize(Decimal("0.01"))
        created["Sales Invoice"] += int(
            _insert_row(
                "Sales Invoice",
                {
                    "name": invoice_name,
                    "creation": creation,
                    "modified": modified,
                    "modified_by": OWNER,
                    "owner": OWNER,
                    "docstatus": 1,
                    "idx": 0,
                    "customer": customer,
                    "customer_name": customer,
                    "company": COMPANY,
                    "posting_date": posting_date,
                    "due_date": get_last_day(posting_date),
                    "is_return": 0,
                    "currency": COMPANY_CURRENCY,
                    "conversion_rate": 1,
                    "price_list_currency": COMPANY_CURRENCY,
                    "plc_conversion_rate": 1,
                    "total_qty": total_qty,
                    "base_total": total_amount,
                    "base_net_total": total_amount,
                    "total": total_amount,
                    "net_total": total_amount,
                    "base_grand_total": total_amount,
                    "grand_total": total_amount,
                    "rounded_total": total_amount,
                    "base_rounded_total": total_amount,
                    "outstanding_amount": outstanding,
                    "status": "Overdue" if index % 3 else "Paid",
                },
            )
        )

        for row in invoice_items:
            created["Sales Invoice Item"] += int(_insert_row("Sales Invoice Item", row))

    return dict(created)


def _seed_purchases(suppliers: list[str]) -> dict[str, int]:
    rng = Random(613240)
    creation, modified = _now_strings()
    months = _month_pool()
    created = defaultdict(int)

    for index in range(1, PURCHASE_INVOICE_COUNT + 1):
        month_start = months[(index * 2) % len(months)]
        posting_date = add_days(month_start.isoformat(), rng.randint(0, 22))
        supplier = suppliers[(index * 5) % len(suppliers)]
        total_amount = Decimal(str(rng.randint(350, 4200)))
        invoice_name = f"{BATCH_PREFIX}-PINV-{index:04d}"

        created["Purchase Invoice"] += int(
            _insert_row(
                "Purchase Invoice",
                {
                    "name": invoice_name,
                    "creation": creation,
                    "modified": modified,
                    "modified_by": OWNER,
                    "owner": OWNER,
                    "docstatus": 1,
                    "idx": 0,
                    "supplier": supplier,
                    "supplier_name": supplier,
                    "company": COMPANY,
                    "posting_date": posting_date,
                    "due_date": get_last_day(posting_date),
                    "is_return": 0,
                    "currency": COMPANY_CURRENCY,
                    "conversion_rate": 1,
                    "price_list_currency": COMPANY_CURRENCY,
                    "plc_conversion_rate": 1,
                    "base_total": total_amount,
                    "base_net_total": total_amount,
                    "total": total_amount,
                    "net_total": total_amount,
                    "base_grand_total": total_amount,
                    "grand_total": total_amount,
                    "rounded_total": total_amount,
                    "base_rounded_total": total_amount,
                    "outstanding_amount": (total_amount * Decimal("0.36")).quantize(Decimal("0.01")),
                    "status": "Unpaid",
                },
            )
        )

    return dict(created)


def _seed_payments(customers: list[str], suppliers: list[str], cash_account: str | None) -> dict[str, int]:
    if not cash_account:
        return {}

    rng = Random(130624)
    creation, modified = _now_strings()
    months = _month_pool()
    created = defaultdict(int)

    for index in range(1, PAYMENT_ENTRY_RECEIVE_COUNT + 1):
        month_start = months[(index * 3) % len(months)]
        posting_date = add_days(month_start.isoformat(), rng.randint(0, 23))
        customer = customers[(index * 9) % len(customers)]
        amount = Decimal(str(rng.randint(180, 2600)))
        name = f"{BATCH_PREFIX}-PREC-{index:04d}"
        created["Payment Entry"] += int(
            _insert_row(
                "Payment Entry",
                {
                    "name": name,
                    "creation": creation,
                    "modified": modified,
                    "modified_by": OWNER,
                    "owner": OWNER,
                    "docstatus": 1,
                    "idx": 0,
                    "payment_type": "Receive",
                    "posting_date": posting_date,
                    "company": COMPANY,
                    "party_type": "Customer",
                    "party": customer,
                    "party_name": customer,
                    "paid_to": cash_account,
                    "paid_to_account_currency": COMPANY_CURRENCY,
                    "received_amount": amount,
                    "base_received_amount": amount,
                    "received_amount_after_tax": amount,
                    "base_received_amount_after_tax": amount,
                    "paid_amount": amount,
                    "base_paid_amount": amount,
                    "source_exchange_rate": 1,
                    "target_exchange_rate": 1,
                    "status": "Submitted",
                },
            )
        )

    for index in range(1, PAYMENT_ENTRY_PAY_COUNT + 1):
        month_start = months[(index * 4) % len(months)]
        posting_date = add_days(month_start.isoformat(), rng.randint(0, 23))
        supplier = suppliers[(index * 4) % len(suppliers)]
        amount = Decimal(str(rng.randint(220, 3200)))
        name = f"{BATCH_PREFIX}-PPAY-{index:04d}"
        created["Payment Entry"] += int(
            _insert_row(
                "Payment Entry",
                {
                    "name": name,
                    "creation": creation,
                    "modified": modified,
                    "modified_by": OWNER,
                    "owner": OWNER,
                    "docstatus": 1,
                    "idx": 0,
                    "payment_type": "Pay",
                    "posting_date": posting_date,
                    "company": COMPANY,
                    "party_type": "Supplier",
                    "party": supplier,
                    "party_name": supplier,
                    "paid_from": cash_account,
                    "paid_from_account_currency": COMPANY_CURRENCY,
                    "paid_amount": amount,
                    "base_paid_amount": amount,
                    "paid_amount_after_tax": amount,
                    "base_paid_amount_after_tax": amount,
                    "received_amount": amount,
                    "base_received_amount": amount,
                    "source_exchange_rate": 1,
                    "target_exchange_rate": 1,
                    "status": "Submitted",
                },
            )
        )

    return dict(created)


def _seed_gl_entries(cash_account: str | None) -> dict[str, int]:
    if not cash_account:
        return {}

    rng = Random(913624)
    creation, modified = _now_strings()
    months = _month_pool()
    created = defaultdict(int)
    voucher_types = ["Sales Invoice", "Payment Entry", "Journal Entry"]

    for index in range(1, GL_ENTRY_COUNT + 1):
        month_start = months[(index * 5) % len(months)]
        posting_date = add_days(month_start.isoformat(), rng.randint(0, 25))
        amount = Decimal(str(rng.randint(300, 4800)))
        voucher_type = voucher_types[index % len(voucher_types)]
        is_debit = index % 2 == 0
        name = f"{BATCH_PREFIX}-GLE-{index:04d}"
        created["GL Entry"] += int(
            _insert_row(
                "GL Entry",
                {
                    "name": name,
                    "creation": creation,
                    "modified": modified,
                    "modified_by": OWNER,
                    "owner": OWNER,
                    "docstatus": 0,
                    "idx": 0,
                    "posting_date": posting_date,
                    "transaction_date": posting_date,
                    "account": cash_account,
                    "voucher_type": voucher_type,
                    "voucher_no": f"{BATCH_PREFIX}-VCHR-{index:04d}",
                    "debit": amount if is_debit else 0,
                    "credit": 0 if is_debit else amount,
                    "debit_in_account_currency": amount if is_debit else 0,
                    "credit_in_account_currency": 0 if is_debit else amount,
                    "company": COMPANY,
                    "is_cancelled": 0,
                    "remarks": "UI demo dashboard seed",
                },
            )
        )

    return dict(created)


def seed_dashboard_demo_data() -> dict[str, Any]:
    """
    Create deterministic fake demo data for dashboards.

    Note:
    These dashboards read submitted transactions (`docstatus = 1`), so the
    transaction rows are seeded in a visible state to populate UI previews.
    """

    cash_account = _pick_leaf_account("Cash")
    customers, customer_created = _seed_customers()
    items, item_created = _seed_items()
    suppliers, supplier_created = _seed_suppliers()

    counts = defaultdict(int)
    counts["Customer"] += customer_created
    counts["Item"] += item_created
    counts["Supplier"] += supplier_created

    for bucket in (
        _seed_sales(customers, items),
        _seed_purchases(suppliers),
        _seed_payments(customers, suppliers, cash_account),
        _seed_gl_entries(cash_account),
    ):
        for doctype, value in bucket.items():
            counts[doctype] += value

    frappe.db.commit()

    return {
        "batch_prefix": BATCH_PREFIX,
        "site": frappe.local.site,
        "company": COMPANY,
        "company_currency": COMPANY_CURRENCY,
        "cash_account": cash_account,
        "counts": dict(sorted(counts.items())),
        "note": "Dashboard queries use submitted data, so transaction demo rows were created in a visible submitted state.",
    }
