import React from "react";
import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.get("/booking-history").then(({ data }) => setBookings(data)).catch(() => setBookings([]));
  }, []);

  return (
    <section className="panel">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-primary"><CalendarClock />Booking history</h1>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr><th className="py-3">Booking</th><th>Status</th><th>Position</th><th>ETA</th><th>OTP</th><th>Created</th></tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr className="border-b border-slate-100" key={booking.id}>
                <td className="py-3 font-semibold">#{booking.id}</td>
                <td>{booking.status}</td>
                <td>{booking.queue_position}</td>
                <td>{booking.estimated_time} min</td>
                <td>{booking.otp}</td>
                <td>{new Date(booking.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
