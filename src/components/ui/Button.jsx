const VARIANTS = {
  primary: "bg-sidebar text-white hover:bg-sidebar-dark",
  secondary: "border border-border bg-white text-ink hover:bg-cream-soft",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-ink hover:bg-cream-soft",
};

export default function Button({ variant = "primary", className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-control px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
