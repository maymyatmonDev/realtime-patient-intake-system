"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CHANNEL_NAME, REALTIME_EVENTS } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";

export const PatientIntake = () => {
  const [firstName, setFirstName] = useState<string>("");
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME);
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const handleChange = (value: string) => {
    setFirstName(value);
    channelRef.current?.send({
      type: "broadcast",
      event: REALTIME_EVENTS.FIELD_CHANGE,
      payload: { firstName: value },
    });
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">New patient intake</h1>
      <div className="flex flex-col gap-2">
        <label htmlFor="firstName" className="text-sm font-medium text-zinc-700">
          First name
        </label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(event) => handleChange(event.target.value)}
          className="rounded-md border border-zinc-300 p-2 text-base"
        />
      </div>
    </main>
  );
};
