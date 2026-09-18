import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ProductFormModal from "../components/products/ProductFormModal";
import { supabase } from "../lib/supabaseClient";

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadProducts = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("products")
      .select("id, sku, name_ar, name_fr, category, unit")
      .order("name_fr", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setProducts([]);
      return;
    }
    setProducts(data);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("products").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const displayName = (product) =>
    i18n.language === "ar" ? product.name_ar || product.name_fr : product.name_fr || product.name_ar;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("products.title")}</h1>
        <Button onClick={() => setFormState({ product: null })}>
          <Plus className="h-4 w-4" />
          {t("products.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {products === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : products.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("products.columns.sku")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("products.columns.nameAr")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("products.columns.nameFr")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("products.columns.category")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("products.columns.unit")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("products.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 text-ink-muted">{product.sku || "—"}</td>
                    <td className="px-3 py-3 text-ink" dir="rtl">
                      {product.name_ar || "—"}
                    </td>
                    <td className="px-3 py-3 text-ink">{product.name_fr || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {product.category ? t(`products.categories.${product.category}`, product.category) : "—"}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{product.unit}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ product })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formState && (
        <ProductFormModal
          open
          product={formState.product}
          onClose={() => setFormState(null)}
          onSaved={loadProducts}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("products.deleteConfirmTitle")}
          message={t("products.deleteConfirmMessage", { name: displayName(deleteTarget) })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
