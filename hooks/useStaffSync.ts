"use client";

import { useEffect, useRef, useState } from "react";
import { resolveBadgeState, type BadgeState } from "@/lib/badge-state";
import {
  emptyIntakeForm,
  fieldChangeSchema,
  presenceSchema,
  sessionResetSchema,
  stateSnapshotSchema,
  submitSchema,
  type FieldName,
  type IntakeForm,
} from "@/lib/intake-schema";
import { CHANNEL_NAME, REALTIME_EVENTS } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";

function patientIsPresent(state: Record<string, unknown[]>) {
  return Object.values(state).some((presences) =>
    presences.some((presence) => {
      const parsed = presenceSchema.safeParse(presence);
      return parsed.success && parsed.data.role === "patient";
    }),
  );
}

export function useStaffSync() {
  const [connection, setConnection] = useState<"connected" | "reconnecting">(
    "reconnecting",
  );
  const [values, setValues] = useState<Partial<IntakeForm>>({});
  const [fieldUpdatedAt, setFieldUpdatedAt] = useState<
    Partial<Record<FieldName, number>>
  >({});
  const [lastChangeAt, setLastChangeAt] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [patientPresent, setPatientPresent] = useState(false);
  const [patientWasSeen, setPatientWasSeen] = useState(false);
  const [previousSubmission, setPreviousSubmission] = useState<{
    values: IntakeForm;
    submittedAt: number;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const valuesRef = useRef(values);
  const submittedAtRef = useRef(submittedAt);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    submittedAtRef.current = submittedAt;
  }, [submittedAt]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const clientId = crypto.randomUUID();
    const channel = supabase.channel(CHANNEL_NAME, {
      config: {
        broadcast: { self: false },
        presence: { key: clientId },
      },
    });

    const syncPresence = () => {
      const present = patientIsPresent(channel.presenceState());
      setPatientPresent(present);
      if (present) {
        setPatientWasSeen(true);
      }
    };

    channel.on("presence", { event: "sync" }, syncPresence);

    channel.on("broadcast", { event: REALTIME_EVENTS.FIELD_CHANGE }, ({ payload }) => {
      const parsed = fieldChangeSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }

      const { field, value, at } = parsed.data;
      setValues((current) => ({ ...current, [field]: value }));
      setFieldUpdatedAt((current) => ({ ...current, [field]: at }));
      setLastChangeAt(at);
      setLastUpdatedAt(at);
      setPreviousSubmission(null);
    });

    channel.on("broadcast", { event: REALTIME_EVENTS.SUBMIT }, ({ payload }) => {
      const parsed = submitSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }

      setValues(parsed.data.values);
      setSubmittedAt(parsed.data.at);
      setLastUpdatedAt(parsed.data.at);
    });

    channel.on("broadcast", { event: REALTIME_EVENTS.SESSION_RESET }, ({ payload }) => {
      const parsed = sessionResetSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }

      const current = valuesRef.current;
      if (Object.keys(current).length > 0) {
        setPreviousSubmission({
          values: { ...emptyIntakeForm, ...current },
          submittedAt: submittedAtRef.current ?? parsed.data.at,
        });
      }
      setValues({});
      setFieldUpdatedAt({});
      setLastChangeAt(null);
      setLastUpdatedAt(null);
      setSubmittedAt(null);
      setPatientWasSeen(false);
    });

    channel.on("broadcast", { event: REALTIME_EVENTS.STATE_SNAPSHOT }, ({ payload }) => {
      const parsed = stateSnapshotSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }

      setValues(parsed.data.values);
      setSubmittedAt(parsed.data.submitted ? parsed.data.submittedAt : null);
      setLastUpdatedAt(parsed.data.at);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnection("connected");
        void channel.track({
          role: "staff",
          clientId,
          joinedAt: Date.now(),
        });
        return;
      }

      setConnection("reconnecting");
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const badge: BadgeState = resolveBadgeState(
    {
      submitted: submittedAt !== null,
      patientPresent,
      patientWasSeen,
      lastChangeAt,
    },
    now,
  );

  return {
    connection,
    badge,
    values,
    fieldUpdatedAt,
    lastUpdatedAt,
    submittedAt,
    previousSubmission,
    now,
  };
}
