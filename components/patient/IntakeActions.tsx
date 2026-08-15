type SubmitControlProps = {
  submitted: boolean;
  submitting: boolean;
};

export function SubmitControl({ submitted, submitting }: SubmitControlProps) {
  if (submitted) {
    return <p className="text-base font-medium text-zinc-700">Submitted</p>;
  }

  return (
    <button
      type="submit"
      disabled={submitting}
      className="w-full cursor-pointer rounded-md bg-emerald-400 px-4 py-3 text-base font-semibold text-emerald-950 hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:bg-emerald-200 disabled:text-emerald-800 md:w-auto"
    >
      {submitting ? "Submitting…" : "Submit details"}
    </button>
  );
}

type ResetControlProps = {
  onReset: () => void;
};

export function ResetControl({ onReset }: ResetControlProps) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="cursor-pointer rounded-md bg-emerald-400 px-5 py-3 text-base font-semibold text-emerald-950 hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
    >
      Start new intake
    </button>
  );
}
