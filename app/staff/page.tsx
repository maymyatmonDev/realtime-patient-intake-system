"use client";
import { CHANNEL_NAME, REALTIME_EVENTS } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

const StaffPage = () => {
  const [patientFirstName, setPatientFirstName] = useState<string>("");

  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME);

    channel.on(
      "broadcast",
      { event: REALTIME_EVENTS.FIELD_CHANGE },
      (message) => {
        setPatientFirstName(message.payload?.firstName || "");
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-[50vh]">
      <h1 className="text-2xl font-bold mb-[30px]">Staff Page</h1>
      <div className="flex items-center gap-2">
        <span>First Name : {patientFirstName}</span>
      </div>
    </div>
  );
};

export default StaffPage;
