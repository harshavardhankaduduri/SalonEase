import React from "react";
import { BriefcaseBusiness, Images, Star, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function SalonDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [salon, setSalon] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/salons/${id}`).then(({ data }) => {
      setSalon(data);
      setSelectedBarber(data.barbers[0]?.id || "");
    });
  }, [id]);

  async function joinQueue() {
    if (!user) {
      navigate("/login");
      return;
    }
    setError("");
    try {
      const { data } = await api.post("/bookings", { salon_id: Number(id), barber_id: Number(selectedBarber) });
      navigate(`/tracking/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to join queue");
    }
  }

  if (!salon) return <p>Loading salon...</p>;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="panel">
          <img className="h-72 w-full rounded-md object-cover" src={salon.image_url || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80"} alt={salon.name} />
          <h1 className="mt-5 text-3xl font-bold text-primary">{salon.name}</h1>
          <p className="mt-2 text-slate-600">{salon.address}</p>
          <p className="mt-4 text-slate-700">{salon.description}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Badge icon={<Star />} label="Rating" value={salon.rating} />
            <Badge icon={<Timer />} label="Opening Hours" value={salon.opening_hours} />
            <Badge icon={<BriefcaseBusiness />} label="Queue" value={`${salon.current_queue_size} waiting`} />
          </div>
        </div>
        <aside className="panel h-fit">
          <h2 className="text-lg font-bold text-primary">Join live queue</h2>
          <select className="field mt-4" value={selectedBarber} onChange={(e) => setSelectedBarber(e.target.value)}>
            {salon.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name} · {barber.specialization}</option>)}
          </select>
          <p className="mt-3 text-sm text-slate-600">Estimated wait: {salon.estimated_waiting_time || 10} minutes</p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button className="btn-primary mt-4 w-full" disabled={!selectedBarber} onClick={joinQueue}>Join Queue</button>
        </aside>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Barbers</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {salon.barbers.map((barber) => (
            <div className="panel" key={barber.id}>
              <img className="h-44 w-full rounded-md object-cover" src={barber.profile_image || "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=700&q=80"} alt={barber.name} />
              <h3 className="mt-3 text-lg font-bold">{barber.name}</h3>
              <p className="text-sm text-slate-600">{barber.experience} years · {barber.specialization}</p>
              <p className="mt-1 text-sm font-semibold text-secondary">{barber.rating} rating</p>
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600"><Images size={16} />Portfolio</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {barber.portfolio.map((item) => <img key={item.id} className="h-20 rounded-md object-cover" src={item.image_url} alt="" />)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Badge({ icon, label, value }) {
  return <div className="rounded-md bg-slate-50 p-3"><div className="flex items-center gap-2 text-sm text-slate-500">{icon}{label}</div><p className="mt-1 font-bold">{value}</p></div>;
}
