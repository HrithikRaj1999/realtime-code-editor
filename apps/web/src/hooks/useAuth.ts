import { useState, useCallback, useEffect } from "react";
import axios from "axios";

interface User {
  id: string;
  username: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("token"),
    loading: true,
  });

  // On mount, verify existing token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios
        .get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setState({ user: res.data.user, token, loading: false });
        })
        .catch(() => {
          localStorage.removeItem("token");
          setState({ user: null, token: null, loading: false });
        });
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await axios.post(`${API_URL}/auth/login`, { username, password });
    const { token, user } = res.data;
    localStorage.setItem("token", token);
    setState({ user, token, loading: false });
    return user;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const res = await axios.post(`${API_URL}/auth/register`, { username, password });
    const { token, user } = res.data;
    localStorage.setItem("token", token);
    setState({ user, token, loading: false });
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setState({ user: null, token: null, loading: false });
  }, []);

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    isAuthenticated: !!state.user,
    login,
    register,
    logout,
  };
}
