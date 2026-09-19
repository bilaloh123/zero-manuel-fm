import { useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import { inputClass } from "../components/ui/FormField";
import ImportWizard from "../components/import/ImportWizard";
import { IMPORT_SCHEMAS } from "../lib/importSchemas";

export default function ImportPage() {
  const { t } = useTranslation();
  const [schemaKey, setSchemaKey] = useState(IMPORT_SCHEMAS[0].key);
  const schema = IMPORT_SCHEMAS.find((s) => s.key === schemaKey);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("import.title")}</h1>
        <p className="text-sm text-ink-muted">{t("import.subtitle")}</p>
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <label htmlFor="import-entity" className="text-sm font-medium text-ink">
            {t("import.entityLabel")}
          </label>
          <select
            id="import-entity"
            value={schemaKey}
            onChange={(e) => setSchemaKey(e.target.value)}
            className={`${inputClass} max-w-xs`}
          >
            {IMPORT_SCHEMAS.map((s) => (
              <option key={s.key} value={s.key}>
                {t(s.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <ImportWizard key={schemaKey} schema={schema} />
    </div>
  );
}
