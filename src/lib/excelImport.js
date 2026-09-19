import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import { buildInsertPayload } from "./importSchemas";

function normalizeHeader(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s_-]+/g, "")
    .trim();
}

export function parseWorkbookFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("file_read_error"));
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false });
        if (rows.length === 0) {
          resolve({ headers: [], dataRows: [] });
          return;
        }
        const headers = rows[0].map((h) => String(h ?? "").trim());
        const dataRows = rows.slice(1);
        resolve({ headers, dataRows });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function autoDetectMapping(headers, fields) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const mapping = {};
  fields.forEach((field) => {
    const candidates = [field.key, ...(field.aliases || [])].map(normalizeHeader);
    const idx = normalizedHeaders.findIndex((h) => h && candidates.includes(h));
    mapping[field.key] = idx >= 0 ? idx : "";
  });
  return mapping;
}

function validateField(field, rawValue) {
  const value = String(rawValue ?? "").trim();

  if (!value) {
    if (field.required) return { error: "required" };
    return { value: null };
  }

  switch (field.type) {
    case "number": {
      const num = Number(value);
      if (Number.isNaN(num)) return { error: "invalidNumber" };
      return { value: num };
    }
    case "enum": {
      const match = field.options.find((opt) => opt.toLowerCase() === value.toLowerCase());
      if (!match) return { error: "invalidEnum", detail: field.options.join(", ") };
      return { value: match };
    }
    case "email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { error: "invalidEmail" };
      return { value };
    }
    default:
      return { value };
  }
}

export function validateRows(dataRows, mapping, fields) {
  return dataRows.map((row, index) => {
    const record = {};
    const errors = [];
    fields.forEach((field) => {
      const colIndex = mapping[field.key];
      const rawValue = colIndex === "" || colIndex === undefined ? "" : row[colIndex];
      const result = validateField(field, rawValue);
      if (result.error) {
        errors.push({ field: field.key, code: result.error, detail: result.detail });
      } else {
        record[field.key] = result.value;
      }
    });
    return {
      rowNumber: index + 2,
      record,
      originalRow: row,
      errors,
      valid: errors.length === 0,
    };
  });
}

export async function importValidRows(schemaKey, table, rows, onProgress) {
  const results = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const payload = buildInsertPayload(schemaKey, row.record);
    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      results.push({ ...row, valid: false, importError: error.message });
    } else {
      results.push({ ...row, imported: true });
    }
    if (onProgress) onProgress(i + 1, rows.length);
  }
  return results;
}

export function downloadTemplate(fields, filenamePrefix, labelFor) {
  const headers = fields.map((f) => labelFor(f));
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `${filenamePrefix}-template.xlsx`);
}

export function downloadErrorReport(headers, failedRows, filenamePrefix, errorMessageFor) {
  const reportHeaders = [...headers, "Erreur"];
  const aoa = [
    reportHeaders,
    ...failedRows.map((row) => [...row.originalRow, errorMessageFor(row)]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Errors");
  XLSX.writeFile(wb, `${filenamePrefix}-errors-${Date.now()}.xlsx`);
}
