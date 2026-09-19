import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Download, CheckCircle2, XCircle, ArrowRight, ArrowLeft } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { inputClass } from "../ui/FormField";
import {
  parseWorkbookFile,
  autoDetectMapping,
  validateRows,
  importValidRows,
  downloadTemplate,
  downloadErrorReport,
} from "../../lib/excelImport";

const STEPS = ["upload", "mapping", "preview", "result"];

function fieldErrorMessage(t, err) {
  if (err.code === "required") return t("import.errors.required");
  if (err.code === "invalidNumber") return t("import.errors.invalidNumber");
  if (err.code === "invalidEmail") return t("import.errors.invalidEmail");
  if (err.code === "invalidEnum") return t("import.errors.invalidEnum", { options: err.detail });
  return err.code;
}

export default function ImportWizard({ schema }) {
  const { t } = useTranslation();
  const [step, setStep] = useState("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [validatedRows, setValidatedRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [resultRows, setResultRows] = useState([]);
  const [parseError, setParseError] = useState(null);

  const stepIndex = STEPS.indexOf(step);

  const validCount = useMemo(() => validatedRows.filter((r) => r.valid).length, [validatedRows]);
  const invalidCount = validatedRows.length - validCount;

  const reset = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setDataRows([]);
    setMapping({});
    setValidatedRows([]);
    setResultRows([]);
    setParseError(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setFileName(file.name);
    try {
      const { headers: h, dataRows: rows } = await parseWorkbookFile(file);
      if (h.length === 0) {
        setParseError(t("import.errors.emptyFile"));
        return;
      }
      setHeaders(h);
      setDataRows(rows);
      setMapping(autoDetectMapping(h, schema.fields));
      setStep("mapping");
    } catch {
      setParseError(t("import.errors.parseFailed"));
    }
  };

  const handleMappingChange = (fieldKey) => (e) => {
    const value = e.target.value;
    setMapping((m) => ({ ...m, [fieldKey]: value === "" ? "" : Number(value) }));
  };

  const runValidation = () => {
    const results = validateRows(dataRows, mapping, schema.fields);
    setValidatedRows(results);
    setStep("preview");
  };

  const runImport = async () => {
    setImporting(true);
    setProgress({ done: 0, total: validCount });
    const rowsToImport = validatedRows.filter((r) => r.valid);
    const imported = await importValidRows(schema.key, schema.table, rowsToImport, (done, total) =>
      setProgress({ done, total })
    );
    const invalidOriginal = validatedRows.filter((r) => !r.valid);
    setResultRows([...imported, ...invalidOriginal]);
    setImporting(false);
    setStep("result");
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(schema.fields, schema.key, (f) => t(f.labelKey));
  };

  const handleDownloadErrorReport = () => {
    const failed = resultRows.filter((r) => !r.valid || r.importError);
    downloadErrorReport(
      headers,
      failed,
      schema.key,
      (row) =>
        row.importError ||
        row.errors.map((e) => `${t(schema.fields.find((f) => f.key === e.field)?.labelKey)}: ${fieldErrorMessage(t, e)}`).join(" | ")
    );
  };

  const succeededCount = resultRows.filter((r) => r.imported).length;
  const failedCount = resultRows.length - succeededCount;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                i <= stepIndex ? "bg-sidebar text-white" : "bg-cream-soft text-ink-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className={i === stepIndex ? "text-ink" : ""}>{t(`import.steps.${s}`)}</span>
            {i < STEPS.length - 1 && <ArrowLeft className="h-3 w-3 rtl:hidden" />}
            {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 hidden rtl:block" />}
          </div>
        ))}
      </div>

      {step === "upload" && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-10 w-10 text-ink-muted" />
            <p className="text-sm text-ink-muted">{t("import.uploadHint")}</p>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="text-sm" />
            {parseError && <p className="text-sm text-red-600">{parseError}</p>}
            <Button variant="secondary" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4" />
              {t("import.downloadTemplate")}
            </Button>
          </div>
        </Card>
      )}

      {step === "mapping" && (
        <Card title={t("import.mappingTitle", { file: fileName })}>
          <div className="flex flex-col gap-3">
            {schema.fields.map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-ink">
                  {t(field.labelKey)}
                  {field.required && <span className="text-red-600"> *</span>}
                </span>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={handleMappingChange(field.key)}
                  className={`${inputClass} max-w-xs`}
                >
                  <option value="">{t("import.noColumn")}</option>
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>
                      {h || `#${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={reset}>
                {t("common.cancel")}
              </Button>
              <Button onClick={runValidation}>{t("import.validate")}</Button>
            </div>
          </div>
        </Card>
      )}

      {step === "preview" && (
        <Card title={t("import.previewTitle")}>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-brand-700">
                <CheckCircle2 className="h-4 w-4" /> {t("import.validRows", { count: validCount })}
              </span>
              <span className="flex items-center gap-1.5 text-red-600">
                <XCircle className="h-4 w-4" /> {t("import.invalidRows", { count: invalidCount })}
              </span>
            </div>

            {invalidCount > 0 && (
              <div className="overflow-x-auto rounded-control border border-border">
                <table className="w-full text-start text-sm">
                  <thead>
                    <tr className="border-b border-border bg-cream-soft text-ink-muted">
                      <th className="px-3 py-2 text-start font-medium">{t("import.columns.row")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("import.columns.errors")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validatedRows
                      .filter((r) => !r.valid)
                      .map((row) => (
                        <tr key={row.rowNumber} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-ink-muted">{row.rowNumber}</td>
                          <td className="px-3 py-2 text-red-600">
                            {row.errors
                              .map(
                                (e) =>
                                  `${t(schema.fields.find((f) => f.key === e.field)?.labelKey)}: ${fieldErrorMessage(t, e)}`
                              )
                              .join(" | ")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {importing && (
              <p className="text-sm text-ink-muted">
                {t("import.importingProgress", { done: progress.done, total: progress.total })}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setStep("mapping")} disabled={importing}>
                {t("import.backToMapping")}
              </Button>
              <Button onClick={runImport} disabled={validCount === 0 || importing}>
                {importing ? t("import.importing") : t("import.confirmImport", { count: validCount })}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === "result" && (
        <Card title={t("import.resultTitle")}>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-brand-700">
                <CheckCircle2 className="h-4 w-4" /> {t("import.succeeded", { count: succeededCount })}
              </span>
              {failedCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-600">
                  <XCircle className="h-4 w-4" /> {t("import.failed", { count: failedCount })}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {failedCount > 0 && (
                <Button variant="secondary" onClick={handleDownloadErrorReport}>
                  <Download className="h-4 w-4" />
                  {t("import.downloadErrorReport")}
                </Button>
              )}
              <Button onClick={reset}>{t("import.importAnother")}</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
