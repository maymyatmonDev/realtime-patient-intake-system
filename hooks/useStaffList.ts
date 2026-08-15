"use client";

import { useEffect, useState } from "react";
import { resolveBadgeState, type BadgeState } from "@/lib/badge-state";
import {
  listPresenceSchema,
  type ListPresencePayload,
} from "@/lib/intake-schema";
import { LIST_CHANNEL_NAME } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";

type ListSession = ListPresencePayload & {
  badge: BadgeState;
};

let cachedSessions: ListPresencePayload[] = [];
let cachedReady = false;

export function useStaffList() {
  const [sessions, setSessions] = useState(cachedSessions);
  const [ready, setReady] = useState(cachedReady);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const channel = supabase.channel(LIST_CHANNEL_NAME);

    const syncList = () => {
      const next: ListPresencePayload[] = [];

      for (const presences of Object.values(channel.presenceState())) {
        for (const presence of presences) {
          const parsed = listPresenceSchema.safeParse(presence);
          if (parsed.success) {
            next.push(parsed.data);
          }
        }
      }

      next.sort((a, b) => a.startedAt - b.startedAt);
      cachedSessions = next;
      cachedReady = true;
      setSessions(next);
      setReady(true);
    };

    channel.on("presence", { event: "sync" }, syncList);
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const rows: ListSession[] = sessions.map((session) => ({
    ...session,
    badge: resolveBadgeState(
      {
        submitted: session.status === "submitted",
        patientPresent: true,
        patientWasSeen: true,
        lastChangeAt: session.lastChangeAt,
      },
      now,
    ),
  }));

  return { sessions: rows, ready, now };
}
