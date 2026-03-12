#!/usr/bin/env python3
"""Gera o arquivo Import_Unificado_AmigosDaBola.csv com sócios e mensalidades."""

from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

ROOT = Path(__file__).resolve().parent.parent
UNIFIED_PATH = ROOT / "Import_Unificado_AmigosDaBola.csv"
MONTHLY_PATH = ROOT / "mensalidades_import_DATAS_CORRETAS.csv"

PAYMENT_PREFIX = "payment:"
PAYMENT_NOTES_PREFIX = "paymentNotes:"
ISO_PATTERN = re.compile(r"^(\d{2})/(\d{2})/(\d{4})$")
DATE_IN_NOTES = re.compile(r"(\d{2}/\d{2}/\d{4})")

FIELDNAMES_BASE: Sequence[str] = [
    "recordType",
    "email",
    "name",
    "phone",
    "birthDate",
    "joinDate",
    "birthDate_dd/mm/aaaa",
    "joinDate_dd/mm/aaaa",
    "role",
    "status",
    "monthlyFee",
    "mustResetPassword",
    "notes",
    "photoUrl",
    "competencia_mm/aaaa",
    "vencimento_dd/mm/aaaa",
    "pagamento_dd/mm/aaaa",
    "valor",
    "status_pagamento",
    "forma_pagamento",
    "descricao",
    "comprovanteUrl",
    "photoDate_dd/mm/aaaa",
    "album",
    "title",
    "caption",
    "tags_separadas_por_virgula",
    "visibility",
]

DEFAULT_MEMBER: Dict[str, str] = {key: "" for key in FIELDNAMES_BASE}
DEFAULT_MEMBER.update({
    "recordType": "membro",
    "role": "socio",
    "status": "ativo",
    "monthlyFee": "",
    "mustResetPassword": "true",
})

DEFAULT_PAYMENT: Dict[str, str] = {key: "" for key in FIELDNAMES_BASE}
DEFAULT_PAYMENT.update({
    "recordType": "mensalidade",
    "descricao": "Mensalidade",
})


def ddmm_to_iso_timestamp(value: str) -> Tuple[str, str]:
    value = (value or "").strip()
    if not value:
        return "", ""
    match = ISO_PATTERN.match(value)
    if not match:
        return "", value
    day, month, year = match.groups()
    iso_date = f"{year}-{month}-{day}"
    iso_timestamp = f"{iso_date}T03:00:00Z"
    return iso_timestamp, value


def load_base_rows(path: Path) -> List[Dict[str, str]]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return [row for row in reader if (row.get("recordType") or "").lower() not in {"membro", "mensalidade"}]


def extract_payment_date(notes: str) -> str:
    if not notes:
        return ""
    match = DATE_IN_NOTES.search(notes)
    return match.group(1) if match else ""


def detect_payment_method(notes: str) -> str:
    if not notes:
        return ""
    lowered = notes.lower()
    if "pix" in lowered:
        return "Pix"
    if "dinheiro" in lowered:
        return "Dinheiro"
    if "cart" in lowered:
        return "Cartão"
    if "boleto" in lowered:
        return "Boleto"
    return ""


def load_members_and_payments(path: Path) -> Tuple[List[Dict[str, str]], List[Dict[str, str]], List[str]]:
    members: List[Dict[str, str]] = []
    payments: List[Dict[str, str]] = []
    extra_fields: set[str] = set()
    if not path.exists():
        return members, payments, []
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            name = (row.get("name") or "").strip()
            if not name:
                continue
            birth_iso, birth_dd = ddmm_to_iso_timestamp(row.get("birthDate"))
            join_iso, join_dd = ddmm_to_iso_timestamp(row.get("joinDate"))
            member = DEFAULT_MEMBER.copy()
            member.update({
                "email": (row.get("email") or "").strip(),
                "name": name,
                "phone": (row.get("phone") or "").strip(),
                "birthDate": birth_iso,
                "joinDate": join_iso,
                "birthDate_dd/mm/aaaa": birth_dd,
                "joinDate_dd/mm/aaaa": join_dd,
                "role": (row.get("role") or "socio").strip().lower() or "socio",
                "status": (row.get("status") or "ativo").strip().lower() or "ativo",
                "monthlyFee": (row.get("monthlyFee") or "30").strip() or "30",
                "mustResetPassword": (row.get("mustResetPassword") or "true").strip().lower() or "true",
                "notes": (row.get("name_norm") or name).strip(),
            })
            for field, value in row.items():
                if value and (field.startswith(PAYMENT_PREFIX) or field.startswith(PAYMENT_NOTES_PREFIX)):
                    member[field] = value.strip()
                    extra_fields.add(field)
            fee_value = member["monthlyFee"] or "30"
            status_fields = [field for field in row if field.startswith(PAYMENT_PREFIX)]
            for status_field in status_fields:
                status_value = (row.get(status_field) or "").strip()
                suffix = status_field.split(":", 1)[1]
                notes_field = f"{PAYMENT_NOTES_PREFIX}{suffix}"
                notes_value = (row.get(notes_field) or "").strip()
                if not status_value and not notes_value:
                    continue
                if "-" in suffix:
                    year, month = suffix.split("-", 1)
                else:
                    year, month = suffix[:4], suffix[4:6]
                competencia = f"{month}/{year}"
                payment_date = extract_payment_date(notes_value)
                payment_record = DEFAULT_PAYMENT.copy()
                payment_record.update({
                    "recordType": "mensalidade",
                    "email": member["email"],
                    "name": name,
                    "competencia_mm/aaaa": competencia,
                    "pagamento_dd/mm/aaaa": payment_date,
                    "status_pagamento": status_value.capitalize() if status_value else ("Pago" if payment_date else ""),
                    "valor": fee_value,
                    "forma_pagamento": detect_payment_method(notes_value),
                    "descricao": f"Mensalidade {competencia}",
                    "notes": notes_value,
                })
                payments.append(payment_record)
            members.append(member)
    return members, payments, sorted(extra_fields)


def write_unified_file(rows: List[Dict[str, str]], fieldnames: Sequence[str], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            for field in fieldnames:
                row.setdefault(field, "")
            writer.writerow(row)


def main() -> int:
    base_rows = load_base_rows(UNIFIED_PATH)
    members, payments, extra_fields = load_members_and_payments(MONTHLY_PATH)
    fieldnames = list(FIELDNAMES_BASE)
    for field in extra_fields:
        if field not in fieldnames:
            fieldnames.append(field)

    existing_keys = set()
    merged_rows: List[Dict[str, str]] = []
    for row in base_rows:
        merged_rows.append(row)
        key = ((row.get("email") or "").lower(), (row.get("name") or "").lower())
        existing_keys.add(key)

    for member in members:
        key = (member["email"].lower(), member["name"].lower())
        if key in existing_keys:
            continue
        existing_keys.add(key)
        merged_rows.append(member)

    merged_rows.extend(payments)

    write_unified_file(merged_rows, fieldnames, UNIFIED_PATH)
    print(
        f"Arquivo atualizado com {len(members)} sócios, {len(payments)} mensalidades e {len(base_rows)} registros adicionais."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
