#!/usr/bin/env python3
"""
Preenche datas de aniversário conhecidas na planilha de mensalidades.

Os valores foram transcritos das listas fornecidas e convertidos para o
formato ISO (yyyy-mm-dd). O script atualiza os arquivos
`mensalidades_import.csv` e `mensalidades_import_credentials.csv`.
"""

import csv
import unicodedata
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET_FILES = [
  ROOT / "mensalidades_import.csv",
  ROOT / "mensalidades_import_credentials.csv",
  ROOT / "mensalidades_import_DATAS_CORRETAS.csv",
]

BIRTHDATE_UPDATES = {
    'ADRIANO FRESC.': '1987-01-04',
    'ALTAIR': '1967-01-04',
    'BINHA 42': '1975-09-25',
    'BÁH': '1970-12-25',
    'CAIO': '1991-04-25',
    'CARLÃO': '1971-05-03',
    'CELESTO': '1973-03-25',
    'CLAUDIO': '1982-01-13',
    'DIEGO NOGUEIRA': '1987-10-08',
    'DIRCEU': '1974-11-23',
    'DIÓ': '1964-11-29',
    'DOUGLAS': '1987-12-21',
    'DUBINHA': '1972-04-30',
    'FELIPE': '1994-12-19',
    'FRANCIS': '1982-11-27',
    'FRED': '1980-04-05',
    'HENRIQUE': '1974-11-23',
    'KAIQUY': '1992-06-16',
    'KAMIMURA': '1959-07-03',
    'LAÉRCIO': '1969-02-05',
    'MAIKOM': '1989-02-08',
    'MARCELO PIMEN.': '1979-09-20',
    'MARQUINHOS': '1974-02-17',
    'MICHEL': '1982-11-23',
    'MINARI': '1954-05-28',
    'MIRO': '1954-04-21',
    'MIRTINHO': '1954-04-21',
    'NATO': '1981-09-26',
    'NENÃO': '1976-11-26',
    'NEZÃO': '1981-01-06',
    'NICO': '1980-03-02',
    'NICO FIUMARI': '1976-11-04',
    'NIKINHO': '1985-06-06',
    'NILTON': '1981-03-06',
    'NILTON 42': '1974-09-24',
    'OSCAR': '1977-02-10',
    'OSMANO': '1971-05-06',
    'OSVALDO': '1974-05-20',
    'OTON': '1983-01-26',
    'PACHECO': '1973-03-04',
    'PADEIRO': '1976-10-24',
    'PAULINHO': '1980-06-10',
    'PISCIDA': '1969-05-24',
    'PLIM': '1983-03-23',
    'RAFAEL': '1991-09-03',
    'RAIMUNDIM': '1977-01-25',
    'RICARDO': '1977-05-25',
    'ROBSON': '1987-07-22',
    'ROCHA': '1969-01-24',
    'RODRIGO GIM.': '1987-01-03',
    'ROGERINHO': '1976-05-21',
    'RONALDO COSTA': '1981-06-07',
    'RONI': '1986-01-21',
    'TAVINHO': '1980-05-25',
    'TECÃO': '1973-03-04',
    'TIAGO CORUJA': '1994-12-22',
    'TIAGO PIPOCA': '1990-10-22',
    'TIÃO 42': '1968-11-07',
    'TIÃO AGUTOLI': '1957-04-21',
    'TOM': '1984-04-24',
    'TONHO': '1962-05-30',
    'TUINHA': '1954-08-29',
    'VAGNER': '1977-08-21',
    'VALDAIR': '1967-06-22',
    'VALTINHO': '1978-10-10',
    'VALÉRIO': '1978-03-06',
    'VITÃO': '1983-09-11',
    'VÁ': '1970-12-25',
    'WILLIAN': '1993-02-11',
    'ZÉ ANTONIO': '1979-03-05',
    'ZÉ GALINHA': '1974-10-20',
    'ZÉ MAURÍCIO': '1976-03-20',
}


def normalize(value: str) -> str:
  text = unicodedata.normalize("NFD", value.strip().lower())
  stripped = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
  return re.sub(r"[^a-z0-9]", "", stripped)


def iso_to_ddmmyyyy(value: str) -> str:
  if not value:
    return value
  parts = value.split("-")
  if len(parts) != 3:
    return value
  year, month, day = parts
  return f"{day.zfill(2)}/{month.zfill(2)}/{year}"


UPDATES_NORMALIZED = {normalize(name): iso_to_ddmmyyyy(date) for name, date in BIRTHDATE_UPDATES.items()}


def update_file(path: Path) -> tuple[int, int]:
  if not path.exists():
    return (0, 0)
  with path.open(encoding="utf-8", newline="") as handle:
    reader = csv.DictReader(handle)
    fieldnames = reader.fieldnames or []
    rows = list(reader)

  updated = 0
  missing = 0
  for row in rows:
    key = normalize(row.get("name", ""))
    date = UPDATES_NORMALIZED.get(key)
    if not date:
      continue
    if row.get("birthDate") == date:
      continue
    row["birthDate"] = date
    updated += 1

  with path.open("w", encoding="utf-8", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)

  total = len(rows)
  missing = total - updated
  return updated, missing


def main() -> int:
  grand_total = 0
  for csv_path in TARGET_FILES:
    updated, _ = update_file(csv_path)
    print(f"{csv_path.name}: {updated} aniversários preenchidos.")
    grand_total += updated
  if not grand_total:
    print("Nenhum registro foi alterado.")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
