"use client";

import { useEffect, useRef, useState } from "react";
import { resolveBadgeState, type BadgeState } from "@/lib/badge-state";
import {
  fieldChangeSchema,
  presenceSchema,
  stateSnapshotSchema,
  submitSchema,
  type FieldName,
  type IntakeForm,
} from "@/lib/intake-schema";
import { REALTIME_EVENTS, sessionChannelName } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";

const sessionCache = new Map<
  string,
  {
    values: Partial<IntakeForm>;
    submittedAt: number | null;
    lastUpdatedAt: number | null;
  }
>();

function patientIsPresent(state: Record<string, unknown[]>) {
  return Object.values(state).some((presences) =>
    presences.some((presence) => {
      const parsed = presenceSchema.safeParse(presence);
      return parsed.success && parsed.data.role === "patient";
    }),
  );
}

export function useStaffSync(sessionId: string | null) {
  const [connection, setConnection] = useState<"connected" | "reconnecting">(
    "connected",
  );
  const hasConnectedRef = useRef(false);
  const [seenId, setSeenId] = useState(sessionId);
  const [values, setValues] = useState<Partial<IntakeForm>>({});
  const [fieldUpdatedAt, setFieldUpdatedAt] = useState<
    Partial<Record<FieldName, number>>
  >({});
  const [lastChangeAt, setLastChangeAt] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [patientPresent, setPatientPresent] = useState(false);
  const [patientWasSeen, setPatientWasSeen] = useState(false);
  const [emptyAt, setEmptyAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  if (sessionId !== seenId) {
    setSeenId(sessionId);
    const cached = sessionId ? sessionCache.get(sessionId) : undefined;
    setValues(cached?.values ?? {});
    setFieldUpdatedAt({});
    setLastChangeAt(null);
    setLastUpdatedAt(cached?.lastUpdatedAt ?? null);
    setSubmittedAt(cached?.submittedAt ?? null);
    setPatientPresent(false);
    setPatientWasSeen(false);
    setEmptyAt(null);
    setConnection("connected");
  }

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    hasConnectedRef.current = false;

    const clientId = crypto.randomUUID();
    const channel = supabase.channel(sessionChannelName(sessionId), {
      config: {
        broadcast: { self: false },
        presence: { key: clientId },
      },
    });

    const remember = (
      nextValues: Partial<IntakeForm>,
      nextSubmittedAt: number | null,
      nextUpdatedAt: number | null,
    ) => {
      sessionCache.set(sessionId, {
        values: nextValues,
        submittedAt: nextSubmittedAt,
        lastUpdatedAt: nextUpdatedAt,
      });
    };

    const syncPresence = () => {
      const present = patientIsPresent(channel.presenceState());
      setPatientPresent(present);
      if (present) {
        setPatientWasSeen(true);
        setEmptyAt(null);
      } else {
        setEmptyAt((current) => current ?? Date.now());
      }
    };

    channel.on("presence", { event: "sync" }, syncPresence);

    channel.on("broadcast", { event: REALTIME_EVENTS.FIELD_CHANGE }, ({ payload }) => {
      const parsed = fieldChangeSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }

      const { field, value, at } = parsed.data;
      setValues((current) => {
        const next = { ...current, [field]: value };
        const cached = sessionCache.get(sessionId);
        remember(next, cached?.submittedAt ?? null, at);
        return next;
      });
      setFieldUpdatedAt((current) => ({ ...current, [field]: at }));
      setLastChangeAt(at);
      setLastUpdatedAt(at);
    });

    channel.on("broadcast", { event: REALTIME_EVENTS.SUBMIT }, ({ payload }) => {
      const parsed = submitSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }

      setValues(parsed.data.values);
      setSubmittedAt(parsed.data.at);
      setLastUpdatedAt(parsed.data.at);
      remember(parsed.data.values, parsed.data.at, parsed.data.at);
    });

    channel.on("broadcast", { event: REALTIME_EVENTS.STATE_SNAPSHOT }, ({ payload }) => {
      const parsed = stateSnapshotSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }

      const nextSubmitted = parsed.data.submitted ? parsed.data.submittedAt : null;
      setValues(parsed.data.values);
      setSubmittedAt(nextSubmitted);
      setLastUpdatedAt(parsed.data.at);
      remember(parsed.data.values, nextSubmitted, parsed.data.at);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnection("connected");
        hasConnectedRef.current = true;
        void channel.track({
          role: "staff",
          clientId,
          joinedAt: Date.now(),
        });
        return;
      }

      if (hasConnectedRef.current) {
        setConnection("reconnecting");
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const ended =
    !patientPresent &&
    (patientWasSeen || (emptyAt !== null && now - emptyAt > 1500));

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
    ended,
    now,
  };
}
