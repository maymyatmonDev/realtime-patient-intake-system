"use client";

import { useEffect, useState } from "react";
import { CHANNEL_NAME, REALTIME_EVENTS } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";

export const StaffLiveView = () => {
  const [firstName, setFirstName] = useState<string>("");

  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME);

    channel.on(
      "broadcast",
      { event: REALTIME_EVENTS.FIELD_CHANGE },
      (message) => {
        setFirstName(message.payload?.firstName ?? "");
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Front Desk — Live View</h1>
      <dl className="flex flex-col gap-1">
        <dt className="text-sm font-medium text-zinc-700">First name</dt>
        <dd className="text-base text-zinc-900">
          {firstName || (
            <span className="text-zinc-500">Not provided yet</span>
          )}
        </dd>
      </dl>
    </main>
  );
};
