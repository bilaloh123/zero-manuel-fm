import { supabase } from "./supabaseClient";

const BUCKET = "documents";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function validateFile(file, t) {
  if (!ALLOWED_TYPES.includes(file.type)) return t("documents.errors.unsupportedType");
  if (file.size > MAX_SIZE) return t("documents.errors.tooLarge");
  return null;
}

export async function uploadDocument(table, recordId, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${table}/${recordId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;
  return path;
}

export async function getSignedUrl(path, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export function isImagePath(path) {
  return /\.(jpe?g|png|webp)$/i.test(path);
}
