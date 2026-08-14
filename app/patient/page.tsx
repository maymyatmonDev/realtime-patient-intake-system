"use client";
import { CHANNEL_NAME, REALTIME_EVENTS } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useState, useEffect, useRef } from "react";

const PatientPage = () => {
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
    <div className="flex flex-col items-center justify-center h-[50vh]">
      <h1 className="text-2xl font-bold mb-[30px]">PatientPage</h1>
      <div className="flex items-center gap-2">
        <label htmlFor="firstName">First Name</label>
        <input
          type="text"
          id="firstName"
          value={firstName}
          onChange={(e) => handleChange(e.target.value)}
          className="border-2 border-gray-300 rounded-md p-2"
        />
      </div>
    </div>
  );
};

export default PatientPage;
