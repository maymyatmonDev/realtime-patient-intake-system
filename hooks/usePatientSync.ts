"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  FIELD_CHANGE_DEBOUNCE_MS,
  LIST_CHANNEL_NAME,
  LIST_TRACK_THROTTLE_MS,
  SNAPSHOT_DEBOUNCE_MS,
  REALTIME_EVENTS,
  sessionChannelName,
} from "@/lib/realtime";
import {
  presenceSchema,
  type FieldName,
  type IntakeForm,
  type ListPresencePayload,
  type StateSnapshotPayload,
} from "@/lib/intake-schema";
import { supabase } from "@/lib/supabase";

type UsePatientSyncOptions = {
  active: boolean;
  sessionId: string | null;
  getSnapshot: () => StateSnapshotPayload;
  getListPresence: () => ListPresencePayload;
};

export function usePatientSync({
  active,
  sessionId,
  getSnapshot,
  getListPresence,
}: UsePatientSyncOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listRef = useRef<RealtimeChannel | null>(null);
  const getSnapshotRef = useRef(getSnapshot);
  const getListPresenceRef = useRef(getListPresence);
  const timersRef = useRef<Partial<Record<FieldName, number>>>({});
  const snapshotTimerRef = useRef<number>(0);
  const listTimerRef = useRef<number>(0);

  useEffect(() => {
    getSnapshotRef.current = getSnapshot;
  }, [getSnapshot]);

  useEffect(() => {
    getListPresenceRef.current = getListPresence;
  }, [getListPresence]);

  useEffect(() => {
    if (!active || !sessionId) {
      return;
    }

    const clientId = crypto.randomUUID();
    const timers = timersRef.current;
    const session = supabase.channel(sessionChannelName(sessionId), {
      config: {
        broadcast: { self: false },
        presence: { key: clientId },
      },
    });
    const list = supabase.channel(LIST_CHANNEL_NAME, {
      config: {
        presence: { key: clientId },
      },
    });

    const trackList = () => {
      void list.track(getListPresenceRef.current());
    };

    const staffIsPresent = () =>
      Object.values(session.presenceState()).some((presences) =>
        presences.some((presence) => {
          const parsed = presenceSchema.safeParse(presence);
          return parsed.success && parsed.data.role === "staff";
        }),
      );

    const sendSnapshot = () => {
      void session.send({
        type: "broadcast",
        event: REALTIME_EVENTS.STATE_SNAPSHOT,
        payload: getSnapshotRef.current(),
      });
    };

    const queueSnapshot = () => {
      if (snapshotTimerRef.current) {
        return;
      }

      sendSnapshot();
      snapshotTimerRef.current = window.setTimeout(() => {
        snapshotTimerRef.current = 0;
      }, SNAPSHOT_DEBOUNCE_MS);
    };

    session.on("presence", { event: "join" }, ({ newPresences }) => {
      const staffJoined = newPresences.some((presence) => {
        const parsed = presenceSchema.safeParse(presence);
        return parsed.success && parsed.data.role === "staff";
      });

      if (staffJoined) {
        queueSnapshot();
      }
    });

    session.on("presence", { event: "sync" }, () => {
      if (staffIsPresent()) {
        queueSnapshot();
      }
    });

    session.subscribe((status) => {
      if (status !== "SUBSCRIBED") {
        return;
      }

      void session
        .track({
          role: "patient",
          clientId,
          joinedAt: Date.now(),
        })
        .then(() => {
          const staffAlreadyHere = Object.values(session.presenceState()).some(
            (presences) =>
              presences.some((presence) => {
                const parsed = presenceSchema.safeParse(presence);
                return parsed.success && parsed.data.role === "staff";
              }),
          );

          if (staffAlreadyHere) {
            queueSnapshot();
          }
        });
    });

    list.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        trackList();
      }
    });

    channelRef.current = session;
    listRef.current = list;

    return () => {
      Object.values(timers).forEach((id) => window.clearTimeout(id));
      window.clearTimeout(snapshotTimerRef.current);
      window.clearTimeout(listTimerRef.current);
      listTimerRef.current = 0;
      void supabase.removeChannel(session);
      void supabase.removeChannel(list);
      channelRef.current = null;
      listRef.current = null;
    };
  }, [active, sessionId]);

  const sendFieldChange = useCallback((field: FieldName, value: string) => {
    window.clearTimeout(timersRef.current[field]);
    timersRef.current[field] = window.setTimeout(() => {
      void channelRef.current?.send({
        type: "broadcast",
        event: REALTIME_EVENTS.FIELD_CHANGE,
        payload: { field, value, at: Date.now() },
      });
    }, FIELD_CHANGE_DEBOUNCE_MS);

    if (listRef.current) {
      if (listTimerRef.current) {
        return;
      }

      listTimerRef.current = window.setTimeout(() => {
        listTimerRef.current = 0;
        void listRef.current?.track(getListPresenceRef.current());
      }, LIST_TRACK_THROTTLE_MS);
    }
  }, []);

  const sendSubmit = useCallback((values: IntakeForm) => {
    void channelRef.current?.send({
      type: "broadcast",
      event: REALTIME_EVENTS.SUBMIT,
      payload: { values, at: Date.now() },
    });
    void listRef.current?.track({
      ...getListPresenceRef.current(),
      status: "submitted",
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
