import React, { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Lock, User } from "lucide-react";
import { api } from "@/services/api";
import { getSession, setSession } from "@/auth/session";

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const u = username.trim();
    if (!u || !password) {
      setError("Enter your username or employee ID and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await api.login({ username: u, password });
      setSession({
        user_id: result.user_id,
        username: result.username,
        full_name: result.full_name,
        employee_id: result.employee_id,
        role: result.role,
        email: result.email ?? null,
        permissions: result.permissions,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full grid grid-cols-1 md:grid-cols-2">
        <div className="bg-black flex items-center justify-center p-12 relative">
          <div className="text-center">
            <div className="border-2 border-white/20 rounded-lg p-8 inline-block">
              <h1 className="text-5xl font-bold mb-2">
                <span className="text-white">Jonb</span>
                <span className="text-red-600">rix</span>
              </h1>
              <p className="text-white text-sm tracking-widest uppercase mt-2">
                Motorcycle Parts and
                <br />
                Accessories
              </p>
            </div>
          </div>
        </div>

        <div className="p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-blue-600 mb-2">Welcome</h2>
            <p className="text-gray-600">Sign in with the username and password from User Management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-blue-600 mb-2">
                Username or Employee ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. jsmith or EMP-0001"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-600 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "LOGIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
