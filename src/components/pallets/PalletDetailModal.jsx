import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { supabase } from "../../lib/supabaseClient";

export default function PalletDetailModal({ open, pallet, onClose }) {
  const { t } = useTranslation();
  const [movements, setMovements] = useState(null);

  useEffect(() => {
    supabase
      .from("pallet_movements")
      .select("id, movement_type, occurred_at, reason, app_users:user_id(full_name), from_unit:from_cold_storage_unit_id(name), to_unit:to_cold_storage_unit_id(name)")
      .eq("pallet_id", pallet.id)
      .order("occurred_at", { ascending: false })
      .then(({ data }) => setMovements(data || []));
  }, [pallet.id]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pallet.pallet_code}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-center py-2">
          <QRCodeSVG value={pallet.pallet_code} size={160} />
        </div>

        <h3 className="text-sm font-semibold text-ink">{t("pallets.detail.history")}</h3>
        {movements === null ? (
          <p className="py-2 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : movements.length === 0 ? (
          <p className="py-2 text-center text-sm text-ink-muted">{t("pallets.detail.noHistory")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {movements.map((m) => (
              <li key={m.id} className="rounded-control border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{t(`pallets.movementTypes.${m.movement_type}`)}</span>
                  <span className="text-xs text-ink-muted">{new Date(m.occurred_at).toLocaleString()}</span>
                </div>
                {(m.from_unit?.name || m.to_unit?.name) && (
                  <p className="text-xs text-ink-muted">
                    {m.from_unit?.name || "—"} → {m.to_unit?.name || "—"}
                  </p>
                )}
                {m.reason && <p className="text-xs text-ink-muted">{m.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
