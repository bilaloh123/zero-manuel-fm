export default function StatTile({ label, value, accent = false }) {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-white p-4 shadow-card">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <span className={`text-2xl font-semibold ${accent ? "text-brand-500" : "text-ink"}`}>{value}</span>
    </div>
  );
}
