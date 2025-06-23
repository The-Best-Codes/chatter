import { createContext, useContext, useEffect, useState } from "react";
import AuthService from "../services/auth-service";

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const storedToken = AuthService.getToken();
    const storedUser = localStorage.getItem("chatterUser");

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        localStorage.removeItem("chatterUser");
        localStorage.removeItem("chatterUserToken");
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await AuthService.login(username, password);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem("chatterUser", JSON.stringify(response.user));
    return response;
  };

  const signup = async (userData) => {
    const response = await AuthService.signup(userData);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem("chatterUser", JSON.stringify(response.user));
    return response;
  };

  const logout = () => {
    AuthService.logout();
    localStorage.removeItem("chatterUser");
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
