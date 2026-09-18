import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

export default function LotDetailModal({ open, lot, onClose }) {
  const { t, i18n } = useTranslation();

  const cropName = lot.crops
    ? i18n.language === "ar"
      ? lot.crops.name_ar || lot.crops.name_fr
      : lot.crops.name_fr || lot.crops.name_ar
    : "—";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("lots.viewTitle")}
      footer={<Button onClick={onClose}>{t("common.confirm")}</Button>}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-control border border-border bg-white p-3">
          <QRCodeSVG value={lot.lot_code} size={160} />
        </div>
        <p className="text-center font-mono text-sm font-semibold text-ink">{lot.lot_code}</p>

        <div className="grid w-full grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-ink-muted">{t("lots.fields.parcel")}: </span>
            <span className="font-medium text-ink">{lot.parcels?.name || lot.parcels?.code || "—"}</span>
          </div>
          <div>
            <span className="text-ink-muted">{t("lots.fields.crop")}: </span>
            <span className="font-medium text-ink">{cropName}</span>
          </div>
          <div>
            <span className="text-ink-muted">{t("lots.fields.variety")}: </span>
            <span className="font-medium text-ink">{lot.varieties?.name || "—"}</span>
          </div>
          <div>
            <span className="text-ink-muted">{t("lots.fields.season")}: </span>
            <span className="font-medium text-ink">{lot.seasons?.label || "—"}</span>
          </div>
          <div>
            <span className="text-ink-muted">{t("lots.fields.harvestedAt")}: </span>
            <span className="font-medium text-ink">
              {lot.harvested_at ? new Date(lot.harvested_at).toLocaleString() : "—"}
            </span>
          </div>
          <div>
            <span className="text-ink-muted">{t("lots.fields.quantity")}: </span>
            <span className="font-medium text-ink">{lot.quantity_kg ?? "—"}</span>
          </div>
          <div>
            <span className="text-ink-muted">{t("lots.fields.boxes")}: </span>
            <span className="font-medium text-ink">{lot.boxes_count ?? "—"}</span>
          </div>
          <div>
            <span className="text-ink-muted">{t("lots.columns.status")}: </span>
            <span className="font-medium text-ink">{lot.current_status || "—"}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
