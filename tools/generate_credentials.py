#!/usr/bin/env python3
"""
Generate placeholder credentials for members listed in `mensalidades_import.csv`.

For each row the script:
  • Normalizes the member name to build a unique email local-part.
  • Emits `<slug>@gmail.com` as the email value.
  • Creates a temporary password `<slug_without_symbols>123`, padded to satisfy
    Firebase's minimum password length requirement.
  • Ensures `mustResetPassword` is set to `true`.

The resulting CSV is written to `mensalidades_import_credentials.csv` in the
project root. The original file remains untouched.
"""

import csv
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_CSV = ROOT / "mensalidades_import.csv"
TARGET_CSV = ROOT / "mensalidades_import_credentials.csv"


def slugify(name: str) -> str:
  """Return a lowercase ASCII slug suitable for the email local-part."""
  if not name:
    name = "membro"
  name = unicodedata.normalize("NFD", name.strip().lower())
  name = "".join(ch for ch in name if unicodedata.category(ch) != "Mn")
  name = re.sub(r"[^a-z0-9]+", "-", name)
  name = re.sub(r"-+", "-", name).strip("-")
  return name or "membro"


def build_password(slug: str) -> str:
  """Return a password derived from the slug that matches `<nome>123`."""
  base = re.sub(r"[^a-z0-9]", "", slug)
  if not base:
    base = "membro"
  while len(base) < 3:
    base += base[-1]
  password = f"{base}123"
  if len(password) < 6:
    password = (password + "club")[:6]
  return password


def load_rows(path: Path):
  with path.open(newline="", encoding="utf-8") as handle:
    reader = csv.DictReader(handle)
    header = reader.fieldnames or []
    for row in reader:
      yield header, row


def main() -> int:
  if not SOURCE_CSV.exists():
    sys.stderr.write(f"Arquivo de origem não encontrado: {SOURCE_CSV}\n")
    return 1

  used_emails = {}
  rows = []
  header = []
  for header, row in load_rows(SOURCE_CSV):
    name = row.get("name", "").strip()
    slug = slugify(name)
    local_part = slug
    index = 1
    while local_part in used_emails:
      index += 1
      local_part = f"{slug}-{index}"
    used_emails[local_part] = True
    email = f"{local_part}@gmail.com"
    password = build_password(local_part)

    row["email"] = email
    row["mustResetPassword"] = "true"
    row["temporaryPassword"] = password
    rows.append(row)

  output_header = list(header)
  if "email" not in output_header:
    output_header.append("email")
  if "temporaryPassword" not in output_header:
    output_header.append("temporaryPassword")
  if "mustResetPassword" not in output_header:
    output_header.append("mustResetPassword")

  with TARGET_CSV.open("w", newline="", encoding="utf-8") as handle:
    writer = csv.DictWriter(handle, fieldnames=output_header, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
      writer.writerow(row)

  print(f"Arquivo gerado com {len(rows)} entradas: {TARGET_CSV}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
