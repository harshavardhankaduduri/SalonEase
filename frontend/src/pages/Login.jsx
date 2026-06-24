import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiErrorMessage } from "../api/errors";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === "owner" ? "/owner" : "/salons");
    } catch (err) {
      setError(apiErrorMessage(err, "Unable to sign in"));
    }
  }

  return (
    <section className="mx-auto max-w-md panel">
      <h1 className="text-2xl font-bold text-primary">Welcome back</h1>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <input className="field" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="field" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full">Login</button>
      </form>
      <p className="mt-4 text-sm text-slate-600">New here? <Link className="font-semibold text-secondary" to="/register">Create an account</Link></p>
    </section>
  );
}
