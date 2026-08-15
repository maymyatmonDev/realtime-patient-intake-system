import { useEffect, useState } from "react";
import { displayFieldValue, FIELD_LABELS } from "@/lib/intake-fields";
import type { FieldName } from "@/lib/intake-schema";

type RecordRowProps = {
  name: FieldName;
  value?: string;
  updatedAt?: number;
  emptyLabel: string;
};

export function RecordRow({
  name,
  value,
  updatedAt,
  emptyLabel,
}: RecordRowProps) {
  const [highlight, setHighlight] = useState(false);
  const [seenAt, setSeenAt] = useState(updatedAt);
  const display = value ? displayFieldValue(name, value) : "";

  if (updatedAt !== seenAt) {
    setSeenAt(updatedAt);
    setHighlight(Boolean(updatedAt));
  }

  useEffect(() => {
    if (!highlight) {
      return;
    }

    const id = window.setTimeout(() => setHighlight(false), 1000);
    return () => window.clearTimeout(id);
  }, [highlight, updatedAt]);

  return (
    <div
      className={`flex flex-col gap-1 border-b border-zinc-100 py-3 md:flex-row md:items-baseline ${
        highlight
          ? "bg-amber-100 motion-reduce:bg-transparent"
          : "bg-transparent transition-colors duration-1000 motion-reduce:transition-none"
      }`}
    >
      <dt className="w-48 shrink-0 text-sm font-medium text-zinc-600">
        {FIELD_LABELS[name]}
      </dt>
      <dd className="text-base text-zinc-900">
        {display || <span className="text-zinc-500">{emptyLabel}</span>}
      </dd>
    </div>
  );
}
