/** Escape a value for CSV (RFC 4180-style quoting). */
export function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowToCsv(cells: string[]): string {
  return cells.map(csvEscape).join(",");
}
