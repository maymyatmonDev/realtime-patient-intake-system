"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  FIELD_CHANGE_DEBOUNCE_MS,
  SNAPSHOT_DEBOUNCE_MS,
  CHANNEL_NAME,
  REALTIME_EVENTS,
} from "@/lib/realtime";
import {
  presenceSchema,
  type FieldName,
  type IntakeForm,
  type StateSnapshotPayload,
} from "@/lib/intake-schema";
import { supabase } from "@/lib/supabase";

type UsePatientSyncOptions = {
  active: boolean;
  getSnapshot: () => StateSnapshotPayload;
};

export function usePatientSync({ active, getSnapshot }: UsePatientSyncOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const getSnapshotRef = useRef(getSnapshot);
  const timersRef = useRef<Partial<Record<FieldName, number>>>({});
  const snapshotTimerRef = useRef<number>(0);

  useEffect(() => {
    getSnapshotRef.current = getSnapshot;
  }, [getSnapshot]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const clientId = crypto.randomUUID();
    const timers = timersRef.current;
    const channel = supabase.channel(CHANNEL_NAME, {
      config: {
        broadcast: { self: false },
        presence: { key: clientId },
      },
    });

    channel.on("presence", { event: "join" }, ({ newPresences }) => {
      const staffJoined = newPresences.some((presence) => {
        const parsed = presenceSchema.safeParse(presence);
        return parsed.success && parsed.data.role === "staff";
      });

      if (!staffJoined) {
        return;
      }

      window.clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = window.setTimeout(() => {
        void channel.send({
          type: "broadcast",
          event: REALTIME_EVENTS.STATE_SNAPSHOT,
          payload: getSnapshotRef.current(),
        });
      }, SNAPSHOT_DEBOUNCE_MS);
    });

    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") {
        return;
      }

      void channel.track({
        role: "patient",
        clientId,
        joinedAt: Date.now(),
      }).then(() => {
        const staffAlreadyHere = Object.values(channel.presenceState()).some(
          (presences) =>
            presences.some((presence) => {
              const parsed = presenceSchema.safeParse(presence);
              return parsed.success && parsed.data.role === "staff";
            }),
        );

        if (!staffAlreadyHere) {
          return;
        }

        void channel.send({
          type: "broadcast",
          event: REALTIME_EVENTS.STATE_SNAPSHOT,
          payload: getSnapshotRef.current(),
        });
      });
    });

    channelRef.current = channel;

    return () => {
      Object.values(timers).forEach((id) => window.clearTimeout(id));
      window.clearTimeout(snapshotTimerRef.current);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [active]);

  const sendFieldChange = useCallback((field: FieldName, value: string) => {
    window.clearTimeout(timersRef.current[field]);
    timersRef.current[field] = window.setTimeout(() => {
      void channelRef.current?.send({
        type: "broadcast",
        event: REALTIME_EVENTS.FIELD_CHANGE,
        payload: { field, value, at: Date.now() },
      });
    }, FIELD_CHANGE_DEBOUNCE_MS);
  }, []);

  const sendSubmit = useCallback((values: IntakeForm) => {
    void channelRef.current?.send({
      type: "broadcast",
      event: REALTIME_EVENTS.SUBMIT,
      payload: { values, at: Date.now() },
    });
  }, []);

  const sendSessionReset = useCallback(() => {
    void channelRef.current?.send({
      type: "broadcast",
      event: REALTIME_EVENTS.SESSION_RESET,
      payload: { at: Date.now() },
    });
  }, []);

  return { sendFieldChange, sendSubmit, sendSessionReset };
}
