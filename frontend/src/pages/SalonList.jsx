import React from "react";
import { MapPin, Search, Star, Timer, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function SalonList() {
  const [salons, setSalons] = useState([]);
  const [filters, setFilters] = useState({ search: "", min_rating: "", max_distance: "", price_range: "" });

  useEffect(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
    api.get("/salons", { params }).then(({ data }) => setSalons(data)).catch(() => setSalons([]));
  }, [filters]);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="panel h-fit">
        <h1 className="flex items-center gap-2 text-lg font-bold text-primary"><Search size={18} />Find salons</h1>
        <div className="mt-4 space-y-3">
          <input className="field" placeholder="Search by name or area" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="field" value={filters.min_rating} onChange={(e) => setFilters({ ...filters, min_rating: e.target.value })}>
            <option value="">Any rating</option>
            <option value="4">4+ stars</option>
            <option value="4.5">4.5+ stars</option>
          </select>
          <select className="field" value={filters.max_distance} onChange={(e) => setFilters({ ...filters, max_distance: e.target.value })}>
            <option value="">Any distance</option>
            <option value="2">Within 2 km</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
          </select>
          <select className="field" value={filters.price_range} onChange={(e) => setFilters({ ...filters, price_range: e.target.value })}>
            <option value="">Any price</option>
            <option value="$">$</option>
            <option value="$$">$$</option>
            <option value="$$$">$$$</option>
          </select>
        </div>
      </aside>
      <section className="grid gap-4">
        {salons.map((salon) => (
          <Link key={salon.id} to={`/salons/${salon.id}`} className="panel grid gap-4 transition hover:border-secondary md:grid-cols-[220px_1fr]">
            <img className="h-44 w-full rounded-md object-cover" src={salon.image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80"} alt={salon.name} />
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-primary">{salon.name}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><MapPin size={15} />{salon.address}</p>
                </div>
                <span className="rounded-md bg-sky-50 px-3 py-1 text-sm font-semibold text-secondary">{salon.price_range}</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Info icon={<Star />} label="Rating" value={salon.rating} />
                <Info icon={<UsersRound />} label="Queue" value={salon.current_queue_size} />
                <Info icon={<Timer />} label="Wait" value={`${salon.estimated_waiting_time} min`} />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

function Info({ icon, label, value }) {
  return <div className="rounded-md bg-slate-50 p-3 text-sm"><div className="flex items-center gap-2 text-slate-500">{icon}{label}</div><p className="mt-1 font-bold text-slate-900">{value}</p></div>;
}
