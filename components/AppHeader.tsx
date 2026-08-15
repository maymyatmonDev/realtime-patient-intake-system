import type { ReactNode } from "react";
import Link from "next/link";

type AppHeaderProps =
  | { variant: "patient" }
  | {
      variant: "staff";
      right?: ReactNode;
      backHref?: string;
      title?: string;
    };

export function AppHeader(props: AppHeaderProps) {
  const isStaff = props.variant === "staff";
  const title = isStaff ? (props.title ?? "Front Desk") : "Patient Intake";

  return (
    <header className="border-b border-emerald-300 bg-emerald-50">
      <div
        className={`mx-auto flex max-w-4xl gap-4 px-4 py-5 md:px-8 ${
          isStaff
            ? "flex-col items-start md:flex-row md:items-center md:justify-between"
            : "items-center justify-between"
        }`}
      >
        <div className="flex items-start gap-2">
          <span
            className="mt-1.5 size-3 shrink-0 rounded-sm bg-emerald-600"
            aria-hidden
          />
          <div>
            {isStaff && props.backHref ? (
              <Link
                href={props.backHref}
                className="text-sm text-zinc-500 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                ← All intakes
              </Link>
            ) : null}
            {isStaff && props.title ? (
              <p className="text-sm text-zinc-500">Front Desk — Live View</p>
            ) : null}
            <p className="text-base font-semibold tracking-tight text-zinc-900">
              {title}
            </p>
          </div>
        </div>
        {isStaff ? (
          props.right
        ) : (
          <p className="text-sm text-zinc-500">Visible to the front desk</p>
        )}
      </div>
    </header>
  );
}
