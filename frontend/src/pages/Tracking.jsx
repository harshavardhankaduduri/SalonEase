import React from "react";
import { BellRing, CheckCircle2, Timer, UserRoundCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, WS_URL } from "../api/client";

export default function Tracking() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [queue, setQueue] = useState(null);

  useEffect(() => {
    api.get(`/bookings/${bookingId}`).then(({ data }) => {
      setBooking(data);
      api.get(`/queue/${data.salon_id}`).then((res) => setQueue(res.data));
      const socket = new WebSocket(`${WS_URL}/ws/queue/${data.salon_id}`);
      socket.onmessage = (event) => setQueue(JSON.parse(event.data));
      return () => socket.close();
    });
  }, [bookingId]);

  const me = useMemo(() => queue?.queue.find((item) => item.id === Number(bookingId)), [queue, bookingId]);
  const progress = me ? Math.max(5, 100 - me.queue_position * 20) : booking?.status === "completed" ? 100 : 10;

  if (!booking) return <p>Loading queue...</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="panel">
        <h1 className="text-2xl font-bold text-primary">Live queue tracking</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric icon={<UserRoundCheck />} label="Your position" value={me?.queue_position ?? booking.queue_position} />
          <Metric icon={<Timer />} label="Estimated wait" value={`${me?.estimated_time ?? booking.estimated_time} min`} />
          <Metric icon={<CheckCircle2 />} label="Booking ID" value={`#${booking.id}`} />
        </div>
        <div className="mt-6">
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-600">Current customer being served: {queue?.current_customer || "Waiting to start"}</p>
        </div>
        <div className="mt-6 rounded-md bg-blue-50 p-4 text-primary">
          <p className="flex items-center gap-2 font-semibold"><BellRing size={18} />OTP: {booking.otp}</p>
          <p className="mt-1 text-sm">Share this OTP at the salon when you arrive.</p>
        </div>
      </section>
      <aside className="panel">
        <h2 className="font-bold text-slate-900">Current Queue</h2>
        <div className="mt-4 space-y-3">
          {queue?.queue.map((item) => (
            <div className={`rounded-md border p-3 ${item.id === Number(bookingId) ? "border-secondary bg-sky-50" : "border-slate-200"}`} key={item.id}>
              <p className="font-semibold">#{item.queue_position || "Active"} {item.customer_name}</p>
              <p className="text-sm text-slate-600">{item.barber_name} · {item.status}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return <div className="rounded-md bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm text-slate-500">{icon}{label}</div><p className="mt-2 text-2xl font-bold text-primary">{value}</p></div>;
}
