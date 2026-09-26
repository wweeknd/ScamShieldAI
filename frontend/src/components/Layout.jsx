import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { api } from "../api/client";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    let alive = true;
    const ping = () =>
      api
        .warmup()
        .then(() => alive && setStatus("online"))
        .catch(() => alive && setStatus("offline"));
    ping();
    const t = setInterval(ping, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Sidebar status={status} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="pl-72 min-h-screen flex flex-col">
        <Topbar status={status} onMenu={() => setMobileOpen(true)} />
        <main className="w-full pt-16 bg-surface">
          <div className="px-space-lg py-space-lg">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}