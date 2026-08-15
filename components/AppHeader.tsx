import type { ReactNode } from "react";

type AppHeaderProps =
  | { variant: "patient" }
  | { variant: "staff"; right: ReactNode };

export function AppHeader(props: AppHeaderProps) {
  const title =
    props.variant === "patient" ? "Patient Intake" : "Front Desk — Live View";

  return (
    <header className="border-b border-emerald-300 bg-emerald-50">
      <div
        className={`mx-auto flex max-w-4xl gap-4 px-4 py-5 md:px-8 ${
          props.variant === "staff"
            ? "flex-col items-start md:flex-row md:items-center md:justify-between"
            : "items-center justify-between"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-emerald-600" aria-hidden />
          <p className="text-base font-semibold tracking-tight text-zinc-900">
            {title}
          </p>
        </div>
        {props.variant === "staff" ? (
          props.right
        ) : (
          <p className="text-sm text-zinc-500">Visible to the front desk</p>
        )}
      </div>
    </header>
  );
}
