import * as XLSX from 'xlsx';

/**
 * Converts an array of objects into an Excel file and triggers a browser download.
 * @param data Array of objects representing rows. Keys are column headers.
 * @param filename Name of the file (without extension)
 */
export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const wb = XLSX.utils.book_new();

  // Create a clean copy without 'id' fields for the actual file
  const cleanData = data.map(item => {
    const { id, ...rest } = item;
    return rest;
  });

  const ws = XLSX.utils.json_to_sheet(cleanData);

  // Auto-size columns roughly based on content
  const colWidths = [];
  const keys = cleanData.length > 0 ? Object.keys(cleanData[0]) : [];
  for (const key of keys) {
    let max = key.length;
    for (const row of cleanData) {
      const val = row[key] !== null && row[key] !== undefined ? String(row[key]) : "";
      if (val.length > max) max = val.length;
    }
    colWidths.push({ wch: Math.min(max + 2, 50) }); // Add padding, max 50 chars wide
  }
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
