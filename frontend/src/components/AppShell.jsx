import React from "react";
import { CalendarClock, LayoutDashboard, LogOut, Scissors, Search, UserRoundPlus } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary">
            <Scissors size={22} />
            SalonEase
          </Link>
          <nav className="flex items-center gap-2">
            <Link className="btn-secondary" to="/salons"><Search size={16} />Salons</Link>
            {user?.role === "owner" && <Link className="btn-secondary" to="/owner"><LayoutDashboard size={16} />Owner</Link>}
            {user && <Link className="btn-secondary" to="/dashboard"><CalendarClock size={16} />Bookings</Link>}
            {!user ? (
              <Link className="btn-primary" to="/login"><UserRoundPlus size={16} />Login</Link>
            ) : (
              <button className="btn-secondary" onClick={handleLogout}><LogOut size={16} />Logout</button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
