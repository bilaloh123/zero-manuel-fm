import { Inbox } from "lucide-react";

export default function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cream-soft">
        <Inbox className="h-6 w-6 text-ink-faint" />
      </div>
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  );
}
