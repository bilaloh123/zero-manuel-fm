import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirming }) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={confirming}>
            {t("common.delete")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-muted">{message}</p>
    </Modal>
  );
}
