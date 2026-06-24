import React from "react";
import {
  BadgeCheck,
  Camera,
  ImagePlus,
  Plus,
  Scissors,
  SkipForward,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, WS_URL } from "../api/client";
import { apiErrorMessage } from "../api/errors";
import { useAuth } from "../context/AuthContext";

const emptySalon = {
  name: "",
  address: "",
  description: "",
  rating: 4.5,
  image_url: "",
  opening_hours: "9:00 AM - 9:00 PM",
  price_range: "$$",
  distance_km: 1,
};

const emptyBarber = {
  salon_id: "",
  name: "",
  experience: 1,
  specialization: "",
  rating: 4.5,
  profile_image: "",
  portfolio_images: [],
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [salons, setSalons] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState("");
  const [queue, setQueue] = useState(null);
  const [salonForm, setSalonForm] = useState(emptySalon);
  const [barberForm, setBarberForm] = useState(emptyBarber);
  const [editingBarberId, setEditingBarberId] = useState(null);
  const [otp, setOtp] = useState({ booking_id: "", otp: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const ownerSalons = useMemo(() => salons.filter((salon) => salon.owner_id === user?.id), [salons, user]);
  const currentSalon = useMemo(
    () => ownerSalons.find((salon) => salon.id === Number(selectedSalon)),
    [ownerSalons, selectedSalon]
  );
  const activeQueue = queue?.queue || [];
  const waitingCount = activeQueue.filter((item) => item.status === "waiting").length;
  const activeCount = activeQueue.filter((item) => item.status === "active").length;

  async function loadSalons() {
    const { data } = await api.get("/salons");
    const owned = data.filter((salon) => salon.owner_id === user?.id);
    setSalons(data);
    if ((!selectedSalon || !owned.some((salon) => salon.id === Number(selectedSalon))) && owned[0]) {
      setSelectedSalon(String(owned[0].id));
    }
  }

  useEffect(() => {
    if (user?.id) loadSalons().catch(() => setSalons([]));
  }, [user?.id]);

  useEffect(() => {
    if (!selectedSalon) {
      setQueue(null);
      return;
    }
    api.get(`/queue/${selectedSalon}`).then(({ data }) => setQueue(data));
    const socket = new WebSocket(`${WS_URL}/ws/queue/${selectedSalon}`);
    socket.onmessage = (event) => setQueue(JSON.parse(event.data));
    return () => socket.close();
  }, [selectedSalon]);

  function clearMessages() {
    setNotice("");
    setError("");
  }

  async function uploadSalonPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSalonForm({ ...salonForm, image_url: await readFileAsDataUrl(file) });
  }

  async function uploadBarberPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBarberForm({ ...barberForm, profile_image: await readFileAsDataUrl(file) });
  }

  async function uploadPortfolio(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const images = await Promise.all(files.map(readFileAsDataUrl));
    setBarberForm({ ...barberForm, portfolio_images: [...barberForm.portfolio_images, ...images] });
  }

  async function createSalon(event) {
    event.preventDefault();
    clearMessages();
    try {
      await api.post("/salons", salonForm);
      setSalonForm(emptySalon);
      setNotice("Salon registered with photo.");
      await loadSalons();
    } catch (err) {
      setError(apiErrorMessage(err, "Unable to add salon"));
    }
  }

  async function saveBarber(event) {
    event.preventDefault();
    clearMessages();
    if (!selectedSalon) {
      setError("Create a salon before adding barbers.");
      return;
    }
    const payload = {
      ...barberForm,
      salon_id: Number(selectedSalon),
      portfolio_images: barberForm.portfolio_images.filter(Boolean),
    };
    try {
      if (editingBarberId) {
        await api.put(`/barbers/${editingBarberId}`, payload);
        setNotice("Barber profile updated.");
      } else {
        await api.post("/barbers", payload);
        setNotice("Barber added with portfolio work.");
      }
      setBarberForm(emptyBarber);
      setEditingBarberId(null);
      await loadSalons();
    } catch (err) {
      setError(apiErrorMessage(err, "Unable to save barber"));
    }
  }

  async function deleteBarber(barberId) {
    clearMessages();
    try {
      await api.delete(`/barbers/${barberId}`);
      setNotice("Barber removed.");
      await loadSalons();
    } catch (err) {
      setError(apiErrorMessage(err, "Unable to delete barber"));
    }
  }

  function editBarber(barber) {
    clearMessages();
    setEditingBarberId(barber.id);
    setBarberForm({
      salon_id: barber.salon_id,
      name: barber.name,
      experience: barber.experience,
      specialization: barber.specialization,
      rating: barber.rating,
      profile_image: barber.profile_image,
      portfolio_images: barber.portfolio.map((item) => item.image_url),
    });
  }

  async function completeBooking(bookingId) {
    clearMessages();
    try {
      await api.put("/booking/complete", { booking_id: bookingId });
      setNotice("Haircut completed.");
      const { data } = await api.get(`/queue/${selectedSalon}`);
      setQueue(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Verify OTP before completing this haircut"));
    }
  }

  async function skipBooking(bookingId) {
    clearMessages();
    try {
      await api.put("/booking/skip", { booking_id: bookingId });
      setNotice("Customer skipped.");
      const { data } = await api.get(`/queue/${selectedSalon}`);
      setQueue(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Unable to skip booking"));
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    clearMessages();
    try {
      await api.post("/verify-otp", { booking_id: Number(otp.booking_id), otp: otp.otp.trim() });
      setOtp({ booking_id: "", otp: "" });
      setNotice("OTP verified. Booking is active and can be completed now.");
      const { data } = await api.get(`/queue/${selectedSalon}`);
      setQueue(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid booking ID or OTP"));
    }
  }

  return (
    <div className="space-y-6">
      <section className="owner-hero">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-secondary"><Sparkles size={16} />Owner operations</p>
          <h1 className="mt-2 text-3xl font-bold text-primary">Manage arrivals, queues, barbers, and salon media.</h1>
        </div>
        <select className="field max-w-sm" value={selectedSalon} onChange={(event) => setSelectedSalon(event.target.value)}>
          {ownerSalons.length ? ownerSalons.map((salon) => <option key={salon.id} value={salon.id}>{salon.name}</option>) : <option value="">No salon yet</option>}
        </select>
      </section>

      {(notice || error) && (
        <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || notice}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Customers in Queue" value={activeQueue.length} />
        <Metric label="Waiting" value={waitingCount} />
        <Metric label="Verified Active" value={activeCount} />
        <Metric label="Barbers" value={currentSalon?.barbers.length || 0} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="panel min-h-[360px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-primary">Current queue</h2>
              <p className="mt-1 text-sm text-slate-500">Verify OTP before marking a haircut complete.</p>
            </div>
            {currentSalon?.image_url && <img className="h-20 w-28 rounded-md object-cover" src={currentSalon.image_url} alt={currentSalon.name} />}
          </div>
          <div className="mt-5 space-y-3">
            {!activeQueue.length && <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-slate-500">No customers in this queue yet.</div>}
            {activeQueue.map((item) => (
              <div className="queue-row" key={item.id}>
                <div>
                  <p className="font-semibold text-slate-900">#{item.queue_position || "Active"} {item.customer_name}</p>
                  <p className="text-sm text-slate-600">{item.barber_name} · {item.status} · {item.estimated_time} min</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary" onClick={() => setOtp({ ...otp, booking_id: String(item.id) })}>
                    <BadgeCheck size={16} />Use ID
                  </button>
                  <button className="btn-secondary" onClick={() => skipBooking(item.id)}>
                    <SkipForward size={16} />Skip
                  </button>
                  <button className="btn-primary" disabled={item.status !== "active"} onClick={() => completeBooking(item.id)}>
                    <Scissors size={16} />Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <form className="panel" onSubmit={verifyOtp}>
            <h2 className="text-lg font-bold text-primary">OTP verification</h2>
            <p className="mt-1 text-sm text-slate-500">Customer must share the OTP from their tracking screen.</p>
            <input className="field mt-4" placeholder="Booking ID" value={otp.booking_id} onChange={(event) => setOtp({ ...otp, booking_id: event.target.value })} />
            <input className="field mt-3" placeholder="OTP" value={otp.otp} onChange={(event) => setOtp({ ...otp, otp: event.target.value })} />
            <button className="btn-primary mt-3 w-full"><BadgeCheck size={16} />Verify OTP</button>
          </form>

          <form className="panel" onSubmit={createSalon}>
            <h2 className="text-lg font-bold text-primary">Register salon</h2>
            <label className="upload-box mt-4">
              {salonForm.image_url ? <img src={salonForm.image_url} alt="Salon preview" /> : <Camera size={26} />}
              <span>{salonForm.image_url ? "Change salon photo" : "Upload salon photo"}</span>
              <input type="file" accept="image/*" onChange={uploadSalonPhoto} />
            </label>
            <input className="field mt-3" placeholder="Salon name" value={salonForm.name} onChange={(event) => setSalonForm({ ...salonForm, name: event.target.value })} />
            <input className="field mt-3" placeholder="Address" value={salonForm.address} onChange={(event) => setSalonForm({ ...salonForm, address: event.target.value })} />
            <textarea className="field mt-3 min-h-24" placeholder="Description" value={salonForm.description} onChange={(event) => setSalonForm({ ...salonForm, description: event.target.value })} />
            <button className="btn-primary mt-3 w-full"><Plus size={16} />Add Salon</button>
          </form>
        </aside>
      </section>

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-primary">Barber management</h2>
            <p className="mt-1 text-sm text-slate-500">Upload profile photos and previous haircut work for each barber.</p>
          </div>
          {editingBarberId && <button className="btn-secondary" onClick={() => { setEditingBarberId(null); setBarberForm(emptyBarber); }}>Cancel edit</button>}
        </div>
        <form className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]" onSubmit={saveBarber}>
          <div className="space-y-3">
            <label className="upload-box">
              {barberForm.profile_image ? <img src={barberForm.profile_image} alt="Barber preview" /> : <Upload size={26} />}
              <span>{barberForm.profile_image ? "Change barber photo" : "Upload barber photo"}</span>
              <input type="file" accept="image/*" onChange={uploadBarberPhoto} />
            </label>
            <label className="upload-box compact">
              <ImagePlus size={22} />
              <span>Upload work photos</span>
              <input type="file" accept="image/*" multiple onChange={uploadPortfolio} />
            </label>
          </div>
          <div>
            <div className="grid gap-3 md:grid-cols-4">
              <input className="field" placeholder="Name" value={barberForm.name} onChange={(event) => setBarberForm({ ...barberForm, name: event.target.value })} />
              <input className="field" placeholder="Experience" type="number" value={barberForm.experience} onChange={(event) => setBarberForm({ ...barberForm, experience: Number(event.target.value) })} />
              <input className="field" placeholder="Specialization" value={barberForm.specialization} onChange={(event) => setBarberForm({ ...barberForm, specialization: event.target.value })} />
              <button className="btn-primary"><Plus size={16} />{editingBarberId ? "Save Barber" : "Add Barber"}</button>
            </div>
            {!!barberForm.portfolio_images.length && (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {barberForm.portfolio_images.map((image, index) => <img className="h-24 rounded-md object-cover" src={image} alt={`Portfolio ${index + 1}`} key={`${image}-${index}`} />)}
              </div>
            )}
          </div>
        </form>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {currentSalon?.barbers.map((barber) => (
            <div className="barber-card" key={barber.id}>
              <img className="h-36 w-full rounded-md object-cover" src={barber.profile_image || "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=700&q=80"} alt={barber.name} />
              <h3 className="mt-3 font-bold">{barber.name}</h3>
              <p className="text-sm text-slate-600">{barber.experience} years · {barber.specialization}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {barber.portfolio.slice(0, 3).map((item) => <img className="h-16 rounded-md object-cover" src={item.image_url} alt="" key={item.id} />)}
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => editBarber(barber)}>Edit</button>
                <button className="btn-secondary flex-1" onClick={() => deleteBarber(barber.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="panel">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}
