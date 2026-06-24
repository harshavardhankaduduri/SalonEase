import React from "react";
import { Star, Timer, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Home() {
  const [salons, setSalons] = useState([]);

  useEffect(() => {
    api.get("/salons").then(({ data }) => setSalons(data)).catch(() => setSalons([]));
  }, []);

  const topSalons = salons.slice(0, 3);
  const featuredBarbers = salons.flatMap((salon) => salon.barbers.map((barber) => ({ ...barber, salonName: salon.name }))).slice(0, 4);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">Live salon queues</p>
          <h1 className="mt-3 text-4xl font-bold text-primary md:text-5xl">Find a salon, join the queue, arrive on time.</h1>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link className="btn-primary" to="/salons">Browse Salons</Link>
            <Link className="btn-secondary" to="/register">Create Account</Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Metric icon={<UsersRound />} label="Active queues" value={salons.reduce((sum, salon) => sum + salon.current_queue_size, 0)} />
          <Metric icon={<Timer />} label="Avg wait" value={`${Math.round((salons.reduce((sum, salon) => sum + salon.estimated_waiting_time, 0) || 0) / Math.max(salons.length, 1))}m`} />
          <Metric icon={<Star />} label="Top rating" value={salons[0]?.rating || "4.8"} />
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Popular salons</h2>
          <Link className="text-sm font-semibold text-secondary" to="/salons">View all</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {topSalons.map((salon) => <SalonCard key={salon.id} salon={salon} />)}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Featured barbers</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {featuredBarbers.map((barber) => (
            <div className="panel" key={barber.id}>
              <img className="h-32 w-full rounded-md object-cover" src={barber.profile_image || "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80"} alt={barber.name} />
              <h3 className="mt-3 font-semibold">{barber.name}</h3>
              <p className="text-sm text-slate-600">{barber.specialization}</p>
              <p className="text-sm text-secondary">{barber.salonName}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return <div className="panel flex items-center gap-3 text-primary">{icon}<div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div></div>;
}

function SalonCard({ salon }) {
  return (
    <Link className="panel block transition hover:border-secondary" to={`/salons/${salon.id}`}>
      <img className="h-40 w-full rounded-md object-cover" src={salon.image_url || "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80"} alt={salon.name} />
      <h3 className="mt-3 font-bold">{salon.name}</h3>
      <p className="text-sm text-slate-600">{salon.address}</p>
      <p className="mt-2 text-sm font-semibold text-primary">{salon.current_queue_size} waiting · {salon.estimated_waiting_time} min</p>
    </Link>
  );
}
