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

const FARM_STATUSES = ["active", "maintenance", "alert", "inactive"];
const EMPLOYMENT_TYPES = ["permanent", "seasonal", "daily"];
const EMPLOYEE_STATUSES = ["active", "inactive"];
const VEHICLE_STATUSES = ["available", "on_mission", "maintenance", "out_of_service"];
const EQUIPMENT_TYPES = ["tractor", "pump", "irrigation", "machine", "generator", "tool", "other"];
const EQUIPMENT_STATUSES = ["available", "in_use", "maintenance", "out_of_service"];

const FARM_LOOKUP_FIELD = {
  key: "farm_id",
  labelKey: "import.fields.farm",
  type: "lookup",
  required: true,
  lookupKey: "farms",
  matchColumns: ["code", "name"],
  aliases: ["farm", "farm_id", "farm_code", "farmcode", "farm_name", "farmname", "mzraa", "المزرعة", "رمز_المزرعة"],
};

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
  {
    key: "farms",
    table: "farms",
    labelKey: "import.entities.farms",
    fields: [
      { key: "code", labelKey: "farms.fields.code", type: "text", required: true, aliases: ["code"] },
      { key: "name", labelKey: "farms.fields.name", type: "text", required: true, aliases: ["name", "nom", "الاسم"] },
      { key: "phone", labelKey: "farms.fields.phone", type: "text", required: false, aliases: ["phone", "telephone", "tel"] },
      { key: "total_area_ha", labelKey: "farms.fields.totalArea", type: "number", required: false, aliases: ["total_area_ha", "totalarea", "superficie_totale"] },
      { key: "cultivated_area_ha", labelKey: "farms.fields.cultivatedArea", type: "number", required: false, aliases: ["cultivated_area_ha", "cultivatedarea", "superficie_cultivee"] },
      { key: "gps_lat", labelKey: "farms.fields.gpsLat", type: "number", required: false, aliases: ["gps_lat", "latitude", "lat"] },
      { key: "gps_lng", labelKey: "farms.fields.gpsLng", type: "number", required: false, aliases: ["gps_lng", "longitude", "lng", "lon"] },
      { key: "status", labelKey: "farms.fields.status", type: "enum", required: true, options: FARM_STATUSES, aliases: ["status", "statut", "etat"] },
    ],
  },
  {
    key: "employees",
    table: "employees",
    labelKey: "import.entities.employees",
    lookups: [{ key: "farms", table: "farms", columns: ["code", "name"] }],
    fields: [
      FARM_LOOKUP_FIELD,
      { key: "full_name", labelKey: "employees.fields.fullName", type: "text", required: true, aliases: ["full_name", "fullname", "nom_complet", "الاسم"] },
      { key: "employee_no", labelKey: "employees.fields.employeeNo", type: "text", required: false, aliases: ["employee_no", "employeeno", "matricule"] },
      { key: "cin", labelKey: "employees.fields.cin", type: "text", required: false, aliases: ["cin"] },
      { key: "phone", labelKey: "employees.fields.phone", type: "text", required: false, aliases: ["phone", "telephone", "tel"] },
      { key: "address", labelKey: "employees.fields.address", type: "text", required: false, aliases: ["address", "adresse"] },
      { key: "job_title", labelKey: "employees.fields.jobTitle", type: "text", required: false, aliases: ["job_title", "jobtitle", "poste"] },
      { key: "hire_date", labelKey: "employees.fields.hireDate", type: "date", required: false, aliases: ["hire_date", "hiredate", "date_embauche"] },
      { key: "cnss_no", labelKey: "employees.fields.cnssNo", type: "text", required: false, aliases: ["cnss_no", "cnssno", "cnss"] },
      { key: "employment_type", labelKey: "employees.fields.employmentType", type: "enum", required: true, options: EMPLOYMENT_TYPES, aliases: ["employment_type", "employmenttype", "type_emploi"] },
      { key: "status", labelKey: "employees.fields.status", type: "enum", required: true, options: EMPLOYEE_STATUSES, aliases: ["status", "statut", "etat"] },
    ],
  },
  {
    key: "vehicles",
    table: "vehicles",
    labelKey: "import.entities.vehicles",
    lookups: [{ key: "farms", table: "farms", columns: ["code", "name"] }],
    fields: [
      FARM_LOOKUP_FIELD,
      { key: "plate_no", labelKey: "vehicles.fields.plateNo", type: "text", required: true, aliases: ["plate_no", "plateno", "immatriculation"] },
      { key: "brand", labelKey: "vehicles.fields.brand", type: "text", required: false, aliases: ["brand", "marque"] },
      { key: "model", labelKey: "vehicles.fields.model", type: "text", required: false, aliases: ["model", "modele"] },
      { key: "type", labelKey: "vehicles.fields.type", type: "text", required: false, aliases: ["type"] },
      { key: "capacity", labelKey: "vehicles.fields.capacity", type: "number", required: false, aliases: ["capacity", "capacite"] },
      { key: "odometer_km", labelKey: "vehicles.fields.odometerKm", type: "number", required: false, aliases: ["odometer_km", "odometerkm", "kilometrage"] },
      { key: "insurance_expiry", labelKey: "vehicles.fields.insuranceExpiry", type: "date", required: false, aliases: ["insurance_expiry", "insuranceexpiry", "assurance"] },
      { key: "inspection_expiry", labelKey: "vehicles.fields.inspectionExpiry", type: "date", required: false, aliases: ["inspection_expiry", "inspectionexpiry", "controle_technique"] },
      { key: "status", labelKey: "vehicles.fields.status", type: "enum", required: true, options: VEHICLE_STATUSES, aliases: ["status", "statut", "etat"] },
    ],
  },
  {
    key: "equipment",
    table: "equipment",
    labelKey: "import.entities.equipment",
    lookups: [{ key: "farms", table: "farms", columns: ["code", "name"] }],
    fields: [
      FARM_LOOKUP_FIELD,
      { key: "code", labelKey: "equipment.fields.code", type: "text", required: true, aliases: ["code"] },
      { key: "type", labelKey: "equipment.fields.type", type: "enum", required: true, options: EQUIPMENT_TYPES, aliases: ["type"] },
      { key: "working_hours", labelKey: "equipment.fields.workingHours", type: "number", required: false, aliases: ["working_hours", "workinghours", "heures_travail"] },
      { key: "odometer_km", labelKey: "equipment.fields.odometerKm", type: "number", required: false, aliases: ["odometer_km", "odometerkm", "kilometrage"] },
      { key: "next_maintenance_date", labelKey: "equipment.fields.nextMaintenanceDate", type: "date", required: false, aliases: ["next_maintenance_date", "nextmaintenancedate", "prochaine_maintenance"] },
      { key: "status", labelKey: "equipment.fields.status", type: "enum", required: true, options: EQUIPMENT_STATUSES, aliases: ["status", "statut", "etat"] },
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

// Farms created through the manual form also grant the creating user
// access via user_farm_access (see FarmFormModal); imported farms must
// get the same grant or they'd be invisible to a non-super-admin importer.
export function requiresInsertedId(schemaKey) {
  return schemaKey === "farms";
}

export async function afterInsert(schemaKey, insertedRow, { supabase, userId }) {
  if (schemaKey === "farms" && userId && insertedRow?.id) {
    await supabase.from("user_farm_access").insert({ user_id: userId, farm_id: insertedRow.id });
  }
}
