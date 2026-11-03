/** A department name as stored: trimmed, with runs of whitespace collapsed to one space. */
export function normalizeDepartmentName(name: string | null | undefined): string {
  return (name ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
}

/** Two names with the same key are the same department, so "Kế toán", " kế  toán " and "KẾ TOÁN" share one row. */
export function departmentNameKey(name: string | null | undefined): string {
  return normalizeDepartmentName(name).toLocaleLowerCase('vi');
}
