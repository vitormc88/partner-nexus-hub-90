import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getAppUrl, getAppRedirectUrl } from "@/lib/app-url";

type AuthView = "login" | "signup" | "forgot";

export default function Auth() {
  const { session, isLoading } = useAuth();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: getAppUrl(),
        },
      });
      if (error) throw error;
      toast.success("Check your email to confirm your account");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAppRedirectUrl("/reset-password"),
      });
      if (error) throw error;
      toast.success("If an account exists with that email, you will receive a password reset link.");
    } catch (error: any) {
      // Generic message to not expose user existence
      toast.success("If an account exists with that email, you will receive a password reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">M</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">ManWinWin PartnerOS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {view === "login" && "Sign in to your account"}
            {view === "signup" && "Create your account"}
            {view === "forgot" && "Reset your password"}
          </p>
        </div>

        {view === "forgot" ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full h-10 px-3 rounded-lg border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder="you@company.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              <button onClick={() => setView("login")} className="text-primary hover:underline font-medium">
                Back to Sign In
              </button>
            </p>
          </form>
        ) : (
          <>
            <form onSubmit={view === "signup" ? handleSignUp : handleLogin} className="space-y-4">
              {view === "signup" && (
                <div>
                  <label className="text-sm font-medium text-foreground">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="mt-1 w-full h-10 px-3 rounded-lg border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="Your full name"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="••••••••"
                />
              </div>
              {view === "login" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setView("forgot")}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : view === "signup" ? "Create Account" : "Sign In"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {view === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setView(view === "signup" ? "login" : "signup")} className="text-primary hover:underline font-medium">
                {view === "signup" ? "Sign in" : "Sign up"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
