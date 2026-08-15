"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { AppHeader } from "@/components/AppHeader";
import { ResetControl } from "@/components/patient/IntakeActions";
import { IntakeForm } from "@/components/patient/IntakeForm";
import { usePatientSync } from "@/hooks/usePatientSync";
import {
  displayNameFromValues,
  filledFieldCount,
  filledValues,
  TOTAL_FIELD_COUNT,
} from "@/lib/intake-fields";
import { FILLING_IN_MS } from "@/lib/realtime";
import {
  emptyIntakeForm,
  intakeSchema,
  type FieldName,
  type IntakeForm as IntakeValues,
  type ListPresencePayload,
  type StateSnapshotPayload,
} from "@/lib/intake-schema";

export function PatientIntake() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [lastChangeAt, setLastChangeAt] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const form = useForm<IntakeValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: emptyIntakeForm,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const getSnapshot = useCallback((): StateSnapshotPayload => {
    return {
      values: form.getValues(),
      submitted,
      submittedAt,
      at: Date.now(),
    };
  }, [form, submitted, submittedAt]);

  const getListPresence = useCallback((): ListPresencePayload => {
    const values = form.getValues();
    const filling =
      !submitted &&
      lastChangeAt !== null &&
      Date.now() - lastChangeAt < FILLING_IN_MS;

    return {
      sessionId: sessionId ?? "",
      displayName: displayNameFromValues(values),
      filledCount: filledFieldCount(values),
      totalCount: TOTAL_FIELD_COUNT,
      status: submitted ? "submitted" : filling ? "filling" : "idle",
      lastChangeAt: lastChangeAt,
      startedAt: startedAt ?? Date.now(),
      values: filledValues(values),
    };
  }, [form, lastChangeAt, sessionId, startedAt, submitted]);

  const { sendFieldChange, sendSubmit, sendSessionReset } = usePatientSync({
    active: started,
    sessionId,
    getSnapshot,
    getListPresence,
  });

  useEffect(() => {
    const subscription = form.watch((values, info) => {
      if (submitted || !info.name || info.type !== "change") {
        return;
      }

      const name = info.name as FieldName;
      setLastChangeAt(Date.now());
      sendFieldChange(name, String(values[name] ?? ""));
    });

    return () => subscription.unsubscribe();
  }, [form, sendFieldChange, submitted]);

  useEffect(() => {
    if (!submitted) {
      return;
    }

    bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    bannerRef.current?.focus();
  }, [submitted]);

  const handleValid = (values: IntakeValues) => {
    setSubmitted(true);
    setSubmittedAt(Date.now());
    sendSubmit(values);
  };

  const handleReset = () => {
    sendSessionReset();
    form.reset(emptyIntakeForm);
    setSubmitted(false);
    setSubmittedAt(null);
    setStarted(false);
    setSessionId(null);
    setStartedAt(null);
    setLastChangeAt(null);
  };

  return (
    <FormProvider {...form}>
      <div className="flex min-h-full flex-col">
        <AppHeader variant="patient" />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 md:px-8">
          {submitted ? (
            <div
              ref={bannerRef}
              tabIndex={-1}
              role="status"
              className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 outline-none"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-400 text-lg font-semibold text-emerald-950">
                ✓
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
                Details submitted
              </h1>
              <p className="mt-2 text-base leading-relaxed text-zinc-600">
                Please return the device to the front desk. You can still review
                your answers below.
              </p>
              <div className="mt-6">
                <ResetControl onReset={handleReset} />
              </div>
            </div>
          ) : null}

          {!started && !submitted ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 md:py-12 text-center">
              <p className="text-sm tracking-wide text-emerald-700">
                Clinic front desk
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-emerald-700 md:text-5xl">
                New Patient Intake
              </h1>
              <p className="mt-4 max-w-lg text-base text-zinc-800 md:text-lg">
                A short form so staff can help you as you go.
              </p>

              <ul className="mt-7 md:mt-10 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                <li className="rounded-xl border border-emerald-100 bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-zinc-900">
                    About 2 minutes
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Short and straightforward
                  </p>
                </li>
                <li className="rounded-xl border border-emerald-100 bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-zinc-900">
                    Live with staff
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    They can help as you type
                  </p>
                </li>
                <li className="rounded-xl border border-emerald-100 bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-zinc-900">
                    13 questions
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Personal, contact, emergency
                  </p>
                </li>
              </ul>

              <button
                type="button"
                onClick={() => {
                  setSessionId(crypto.randomUUID());
                  setStartedAt(Date.now());
                  setStarted(true);
                }}
                className="mt-10 cursor-pointer rounded-full bg-emerald-400 px-8 py-3 text-base font-semibold text-emerald-950 hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                Begin Intake
              </button>
            </div>
          ) : null}

          {started ? (
            <>
              {!submitted ? (
                <>
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
                    New Patient Intake
                  </h1>
                  <p className="mt-2 max-w-xl text-base leading-relaxed text-zinc-600">
                    Please complete your details below. It takes about two
                    minutes, and front desk staff can see your answers as you
                    type in case you need help.
                  </p>
                </>
              ) : null}
              <div className="mt-6">
                <IntakeForm
                  submitted={submitted}
                  submitting={form.formState.isSubmitting}
                  onSubmit={handleValid}
                />
              </div>
            </>
          ) : null}
        </main>
      </div>
    </FormProvider>
  );
}
