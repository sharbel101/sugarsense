import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header/Header";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate("/chat");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-50 to-white">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 pt-24 pb-16">
        <div className="w-full max-w-md rounded-3xl border border-green-100 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-green-800">Welcome back</h2>
            <p className="mt-2 text-sm text-green-600">
              Sign in to continue tracking your meals with SugarSense.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <label className="block text-sm font-medium text-green-900">
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm text-green-900 shadow-inner outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm font-medium text-green-900">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm text-green-900 shadow-inner outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                placeholder="Enter your password"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-green-500 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2"
            >
              Continue
            </button>
          </form>

          <div className="mt-8 space-y-2 text-center text-xs text-green-500">
            <p>No account? You can continue as a guest.</p>
            <button
              type="button"
              className="font-medium text-green-600 underline-offset-4 hover:underline"
              onClick={() => navigate("/login-values")}
            >
              Skip for now
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
