export default function Card({ title, actions, children, className = "" }) {
  return (
    <div className={`rounded-card bg-white p-5 shadow-card ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
