export function getCurrencySymbol(): string {
  return localStorage.getItem("currency_symbol") || "â‚±";
}

export function getDateFormat(): string {
  return localStorage.getItem("date_format") || "MM/DD/YYYY";
}

export function formatCurrency(amount: any): string {
  const val = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(val)) return `${getCurrencySymbol()} 0.00`;
  return `${getCurrencySymbol()}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function parseUtcDate(dateVal: any): Date {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  let s = String(dateVal).trim();
  if (s.includes("T") || s.includes(" ")) {
    if (!s.endsWith("Z") && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
      s = s.replace(" ", "T") + "Z";
    }
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(dateVal) : d;
}

export function formatDateTime(dateVal: any): string {
  if (!dateVal) return "â€”";
  try {
    const d = parseUtcDate(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateVal);
  }
}

export function formatDate(dateVal: any): string {
  if (!dateVal) return "â€”";
  try {
    const d = parseUtcDate(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const format = getDateFormat();
    const pad = (num: number) => String(num).padStart(2, "0");

    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());

    if (format === "DD/MM/YYYY") return `${day}/${month}/${year}`;
    if (format === "YYYY-MM-DD") return `${year}-${month}-${day}`;
    return `${month}/${day}/${year}`; // default MM/DD/YYYY
  } catch {
    return String(dateVal);
  }
}
