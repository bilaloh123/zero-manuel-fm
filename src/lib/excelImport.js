import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import { buildInsertPayload, requiresInsertedId, afterInsert } from "./importSchemas";

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
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
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

function validateField(field, rawValue, lookups) {
  const isDateObject = rawValue instanceof Date;
  const value = isDateObject ? String(rawValue) : String(rawValue ?? "").trim();

  if (!isDateObject && !value) {
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
    case "date": {
      const d = isDateObject ? rawValue : new Date(value);
      if (Number.isNaN(d.getTime())) return { error: "invalidDate" };
      const pad = (n) => String(n).padStart(2, "0");
      return { value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
    }
    case "lookup": {
      const list = (lookups && lookups[field.lookupKey]) || [];
      const norm = value.trim().toLowerCase();
      const match = list.find((item) =>
        field.matchColumns.some((col) => String(item[col] ?? "").trim().toLowerCase() === norm)
      );
      if (!match) return { error: "lookupNotFound", detail: value };
      return { value: match.id };
    }
    default:
      return { value };
  }
}

export async function fetchLookups(schema) {
  if (!schema.lookups || schema.lookups.length === 0) return {};
  const entries = await Promise.all(
    schema.lookups.map(async (lookup) => {
      const { data, error } = await supabase.from(lookup.table).select(["id", ...lookup.columns].join(", "));
      if (error) throw error;
      return [lookup.key, data || []];
    })
  );
  return Object.fromEntries(entries);
}

export function validateRows(dataRows, mapping, fields, lookups = {}) {
  return dataRows.map((row, index) => {
    const record = {};
    const errors = [];
    fields.forEach((field) => {
      const colIndex = mapping[field.key];
      const rawValue = colIndex === "" || colIndex === undefined ? "" : row[colIndex];
      const result = validateField(field, rawValue, lookups);
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
  let userId = null;
  if (requiresInsertedId(schemaKey)) {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id ?? null;
  }
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const payload = buildInsertPayload(schemaKey, row.record);
    if (requiresInsertedId(schemaKey)) {
      const { data: inserted, error } = await supabase.from(table).insert(payload).select().single();
      if (error) {
        results.push({ ...row, valid: false, importError: error.message });
      } else {
        await afterInsert(schemaKey, inserted, { supabase, userId });
        results.push({ ...row, imported: true });
      }
    } else {
      const { error } = await supabase.from(table).insert(payload);
      if (error) {
        results.push({ ...row, valid: false, importError: error.message });
      } else {
        results.push({ ...row, imported: true });
      }
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
