"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Неверный email или пароль.");
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-courtLine px-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 shadow-sm w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-display font-bold text-court mb-2">Вход в админку</h1>
        <div>
          <label className="text-sm text-slateGray mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court"
          />
        </div>
        <div>
          <label className="text-sm text-slateGray mb-1 block">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-black/10 rounded-lg px-4 py-2.5 outline-none focus:border-court"
          />
        </div>
        {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-2.5 rounded-xl bg-court text-white font-semibold hover:bg-court/90 transition disabled:opacity-50"
        >
          {loading ? "Вхожу..." : "Войти"}
        </button>
      </form>
    </div>
  );
}
