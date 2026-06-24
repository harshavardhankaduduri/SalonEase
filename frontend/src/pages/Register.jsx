import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiErrorMessage } from "../api/errors";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "customer" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const user = await register(form);
      navigate(user.role === "owner" ? "/owner" : "/salons");
    } catch (err) {
      setError(apiErrorMessage(err, "Unable to register"));
    }
  }

  return (
    <section className="mx-auto max-w-lg panel">
      <h1 className="text-2xl font-bold text-primary">Create your SalonEase account</h1>
      <form className="mt-5 grid gap-4" onSubmit={submit}>
        <input className="field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="field" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="field" placeholder="Mobile Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="field" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="customer">Customer</option>
          <option value="owner">Salon Owner</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary">Register</button>
      </form>
    </section>
  );
}
