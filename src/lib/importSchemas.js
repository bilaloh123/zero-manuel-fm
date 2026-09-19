const PRODUCT_CATEGORIES = [
  "fertilizer",
  "pesticide",
  "seed",
  "fuel",
  "packaging",
  "harvested_product",
  "spare_part",
];

const PRODUCT_UNITS = ["kg", "g", "L", "piece", "sac_25kg", "sac_50kg", "tonne", "carton"];

export const IMPORT_SCHEMAS = [
  {
    key: "products",
    table: "products",
    labelKey: "import.entities.products",
    fields: [
      { key: "sku", labelKey: "products.fields.sku", type: "text", required: false, aliases: ["sku", "reference", "code"] },
      { key: "name_ar", labelKey: "products.fields.nameAr", type: "text", required: true, aliases: ["name_ar", "nameAr", "الاسم", "اسم"] },
      { key: "name_fr", labelKey: "products.fields.nameFr", type: "text", required: true, aliases: ["name_fr", "nameFr", "nom", "designation"] },
      { key: "category", labelKey: "products.fields.category", type: "enum", required: true, options: PRODUCT_CATEGORIES, aliases: ["category", "categorie"] },
      { key: "unit", labelKey: "products.fields.unit", type: "enum", required: true, options: PRODUCT_UNITS, aliases: ["unit", "unite"] },
    ],
  },
  {
    key: "suppliers",
    table: "suppliers",
    labelKey: "import.entities.suppliers",
    fields: [
      { key: "company_name", labelKey: "suppliers.fields.companyName", type: "text", required: true, aliases: ["company_name", "companyName", "societe", "raison_sociale"] },
      { key: "ice", labelKey: "suppliers.fields.ice", type: "text", required: false, aliases: ["ice"] },
      { key: "if_no", labelKey: "suppliers.fields.ifNo", type: "text", required: false, aliases: ["if_no", "if", "ifNo"] },
      { key: "rc", labelKey: "suppliers.fields.rc", type: "text", required: false, aliases: ["rc"] },
      { key: "address", labelKey: "suppliers.fields.address", type: "text", required: false, aliases: ["address", "adresse"] },
      { key: "contact_name", labelKey: "suppliers.fields.contactName", type: "text", required: false, aliases: ["contact_name", "contactName", "contact"] },
      { key: "phone", labelKey: "suppliers.fields.phone", type: "text", required: false, aliases: ["phone", "telephone", "tel"] },
      { key: "email", labelKey: "suppliers.fields.email", type: "email", required: false, aliases: ["email", "mail", "courriel"] },
      { key: "payment_terms", labelKey: "suppliers.fields.paymentTerms", type: "text", required: false, aliases: ["payment_terms", "paymentTerms", "conditions_paiement"] },
      { key: "lead_time_days", labelKey: "suppliers.fields.leadTimeDays", type: "number", required: false, aliases: ["lead_time_days", "leadTimeDays", "delai"] },
    ],
  },
  {
    key: "customers",
    table: "customers",
    labelKey: "import.entities.customers",
    fields: [
      { key: "name", labelKey: "customers.fields.name", type: "text", required: true, aliases: ["name", "nom", "الاسم", "اسم"] },
      { key: "phone", labelKey: "customers.fields.phone", type: "text", required: false, aliases: ["phone", "telephone", "tel"] },
      { key: "email", labelKey: "customers.fields.email", type: "email", required: false, aliases: ["email", "mail", "courriel"] },
    ],
  },
];

export function getImportSchema(key) {
  return IMPORT_SCHEMAS.find((s) => s.key === key) || null;
}

export function buildInsertPayload(schemaKey, record) {
  if (schemaKey === "customers") {
    const contact_info =
      record.phone || record.email
        ? { phone: record.phone || null, email: record.email || null }
        : null;
    return { name: record.name, contact_info };
  }
  return record;
}
