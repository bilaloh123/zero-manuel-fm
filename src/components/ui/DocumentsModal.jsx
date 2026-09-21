import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Trash2, Upload } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { supabase } from "../../lib/supabaseClient";
import { useSignedUrl } from "../../hooks/useSignedUrl";
import { validateFile, uploadDocument, deleteDocument, isImagePath } from "../../lib/documentStorage";

function DocumentThumbnail({ path, onRemove, removing }) {
  const { t } = useTranslation();
  const url = useSignedUrl(path);
  const isImage = isImagePath(path);

  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-cream-soft">
      {!url ? (
        <span className="text-xs text-ink-muted">{t("common.loading")}</span>
      ) : isImage ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center gap-1 text-ink-muted hover:text-ink"
        >
          <FileText className="h-8 w-8" />
          <span className="text-[10px]">PDF</span>
        </a>
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-red-600 shadow-sm hover:bg-red-50"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function DocumentsModal({ open, onClose, table, record, column, mode, accept, title, capture }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removingPath, setRemovingPath] = useState(null);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(record[column]);

  const paths = mode === "gallery" ? current || [] : current ? [current] : [];

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validationError = validateFile(file, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const path = await uploadDocument(table, record.id, file);
      const nextValue = mode === "gallery" ? [...(current || []), path] : path;
      const { error: updateError } = await supabase.from(table).update({ [column]: nextValue }).eq("id", record.id);
      if (updateError) throw updateError;
      setCurrent(nextValue);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (path) => {
    setRemovingPath(path);
    setError(null);
    try {
      const nextValue = mode === "gallery" ? (current || []).filter((p) => p !== path) : null;
      const { error: updateError } = await supabase.from(table).update({ [column]: nextValue }).eq("id", record.id);
      if (updateError) throw updateError;
      await deleteDocument(path);
      setCurrent(nextValue);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingPath(null);
    }
  };

  const canAddMore = mode === "gallery" || paths.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={<Button onClick={onClose}>{t("common.confirm")}</Button>}
    >
      <div className="flex flex-col gap-4">
        {paths.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("documents.noDocuments")}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {paths.map((path) => (
              <DocumentThumbnail
                key={path}
                path={path}
                onRemove={() => handleRemove(path)}
                removing={removingPath === path}
              />
            ))}
          </div>
        )}

        {canAddMore && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              capture={capture}
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4" />
              {uploading ? t("documents.uploading") : t("documents.upload")}
            </Button>
          </div>
        )}

        <p className="text-xs text-ink-muted">{t("documents.hint")}</p>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
