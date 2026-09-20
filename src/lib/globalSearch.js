import { supabase } from "./supabaseClient";

// PostgREST's .or()/.ilike() filter strings are built by us as plain text —
// commas and parentheses have special meaning in that syntax, so strip them
// from user input before interpolating (this is a syntax safeguard, not a
// SQL-injection concern: supabase-js already parameterizes values at the
// HTTP layer, it never concatenates raw SQL).
function sanitizeTerm(term) {
  return term.replace(/[,()]/g, " ").trim();
}

function nameLabel(i18n, row) {
  return i18n.language === "ar" ? row.name_ar || row.name_fr : row.name_fr || row.name_ar;
}

export function buildSearchEntities(i18n) {
  return [
    {
      key: "farms",
      icon: "Sprout",
      url: "/farms",
      search: async (term) => {
        const { data } = await supabase.from("farms").select("id, name, code").or(`name.ilike.%${term}%,code.ilike.%${term}%`).limit(5);
        return (data || []).map((r) => ({ id: r.id, title: r.name, subtitle: r.code }));
      },
    },
    {
      key: "parcels",
      icon: "MapPin",
      url: "/parcels",
      search: async (term) => {
        const { data } = await supabase.from("parcels").select("id, name, code").or(`name.ilike.%${term}%,code.ilike.%${term}%`).limit(5);
        return (data || []).map((r) => ({ id: r.id, title: r.name, subtitle: r.code }));
      },
    },
    {
      key: "employees",
      icon: "Users",
      url: "/employees",
      search: async (term) => {
        const { data } = await supabase
          .from("employees")
          .select("id, full_name, cin, employee_no")
          .or(`full_name.ilike.%${term}%,cin.ilike.%${term}%,employee_no.ilike.%${term}%`)
          .limit(5);
        return (data || []).map((r) => ({ id: r.id, title: r.full_name, subtitle: r.cin || r.employee_no }));
      },
    },
    {
      key: "suppliers",
      icon: "ShoppingCart",
      url: "/suppliers",
      search: async (term) => {
        const { data } = await supabase
          .from("suppliers")
          .select("id, company_name, ice, rc")
          .or(`company_name.ilike.%${term}%,ice.ilike.%${term}%,rc.ilike.%${term}%`)
          .limit(5);
        return (data || []).map((r) => ({ id: r.id, title: r.company_name, subtitle: r.ice || r.rc }));
      },
    },
    {
      key: "customers",
      icon: "Wallet",
      url: "/customers",
      search: async (term) => {
        const { data } = await supabase.from("customers").select("id, name, code").or(`name.ilike.%${term}%,code.ilike.%${term}%`).limit(5);
        return (data || []).map((r) => ({ id: r.id, title: r.name, subtitle: r.code }));
      },
    },
    {
      key: "products",
      icon: "Warehouse",
      url: "/products",
      search: async (term) => {
        const { data } = await supabase
          .from("products")
          .select("id, name_ar, name_fr, sku")
          .or(`name_ar.ilike.%${term}%,name_fr.ilike.%${term}%,sku.ilike.%${term}%`)
          .limit(5);
        return (data || []).map((r) => ({ id: r.id, title: nameLabel(i18n, r), subtitle: r.sku }));
      },
    },
    {
      key: "lots",
      icon: "ScanLine",
      url: "/lots",
      search: async (term) => {
        const { data } = await supabase.from("lots").select("id, lot_code").ilike("lot_code", `%${term}%`).limit(5);
        return (data || []).map((r) => ({ id: r.id, title: r.lot_code, subtitle: null }));
      },
    },
    {
      key: "vehicles",
      icon: "Truck",
      url: "/vehicles",
      search: async (term) => {
        const { data } = await supabase
          .from("vehicles")
          .select("id, plate_no, brand, model")
          .or(`plate_no.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`)
          .limit(5);
        return (data || []).map((r) => ({ id: r.id, title: r.plate_no, subtitle: [r.brand, r.model].filter(Boolean).join(" ") }));
      },
    },
    {
      key: "drivers",
      icon: "Users",
      url: "/drivers",
      search: async (term) => {
        const { data } = await supabase
          .from("drivers")
          .select("id, full_name, cin, license_no")
          .or(`full_name.ilike.%${term}%,cin.ilike.%${term}%,license_no.ilike.%${term}%`)
          .limit(5);
        return (data || []).map((r) => ({ id: r.id, title: r.full_name, subtitle: r.cin || r.license_no }));
      },
    },
    {
      key: "purchaseOrders",
      icon: "ShoppingCart",
      url: "/purchase-orders",
      search: async (term) => {
        const { data } = await supabase
          .from("purchase_orders")
          .select("id, status, suppliers:supplier_id!inner(company_name)")
          .ilike("suppliers.company_name", `%${term}%`)
          .limit(5);
        return (data || []).map((r) => ({ id: r.id, title: r.suppliers?.company_name, subtitle: r.status }));
      },
    },
    {
      key: "transfers",
      icon: "Truck",
      url: "/transfers",
      search: async (term) => {
        const { data } = await supabase
          .from("transfers")
          .select("id, status, products:product_id!inner(name_ar, name_fr)")
          .or(`products.name_ar.ilike.%${term}%,products.name_fr.ilike.%${term}%`)
          .limit(5);
        return (data || []).map((r) => ({ id: r.id, title: nameLabel(i18n, r.products), subtitle: r.status }));
      },
    },
    {
      key: "invoices",
      icon: "Wallet",
      url: "/invoices",
      search: async (term) => {
        const { data } = await supabase
          .from("invoices")
          .select("id, status, purchase_orders:purchase_order_id!inner(suppliers:supplier_id!inner(company_name))")
          .ilike("purchase_orders.suppliers.company_name", `%${term}%`)
          .limit(5);
        return (data || []).map((r) => ({ id: r.id, title: r.purchase_orders?.suppliers?.company_name, subtitle: r.status }));
      },
    },
    {
      key: "deliveries",
      icon: "Truck",
      url: "/deliveries",
      search: async (term) => {
        const { data } = await supabase.from("deliveries").select("id, delivery_no, status").ilike("delivery_no", `%${term}%`).limit(5);
        return (data || []).map((r) => ({ id: r.id, title: r.delivery_no, subtitle: r.status }));
      },
    },
  ];
}

export async function runGlobalSearch(i18n, rawTerm) {
  const term = sanitizeTerm(rawTerm);
  if (term.length < 2) return [];

  const entities = buildSearchEntities(i18n);
  const results = await Promise.all(
    entities.map(async (entity) => {
      try {
        const items = await entity.search(term);
        return { key: entity.key, icon: entity.icon, url: entity.url, items };
      } catch {
        return { key: entity.key, icon: entity.icon, url: entity.url, items: [] };
      }
    })
  );
  return results.filter((r) => r.items.length > 0);
}
