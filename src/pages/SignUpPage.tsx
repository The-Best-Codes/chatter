import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SignUpForm } from "@/components/auth";
import { useAuth } from "@/components/auth";

export function SignUpPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-screen min-h-screen bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Chatter</h1>
        <SignUpForm />
      </div>
    </div>
  );
}
