import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check hash for recovery token
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated! 💜", description: "You can now log in with your new password." });
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 gradient-primary">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm bg-card/95 backdrop-blur-sm rounded-2xl p-6 comic-border space-y-4 text-center"
        >
          <h2 className="text-2xl font-display text-foreground">Invalid Link</h2>
          <p className="text-muted-foreground">This password reset link is invalid or has expired.</p>
          <Button onClick={() => navigate("/auth")} className="w-full gradient-primary text-primary-foreground comic-border border-primary-foreground/20">
            Back to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gradient-primary relative overflow-hidden">
      <div className="absolute top-10 left-10 w-24 h-24 rounded-full bg-accent/30 blur-xl" />
      <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-secondary/30 blur-xl" />

      <motion.form
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onSubmit={handleReset}
        className="w-full max-w-sm bg-card/95 backdrop-blur-sm rounded-2xl p-6 comic-border space-y-4 relative z-10"
      >
        <h2 className="text-2xl font-display text-center text-foreground">Set New Password 🔒</h2>
        <p className="text-sm text-center text-muted-foreground">Enter your new password below.</p>

        <div>
          <label className="text-sm font-bold text-muted-foreground uppercase tracking-wide">New Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="mt-1 border-2 border-primary/30 focus:border-primary"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Confirm Password</label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="mt-1 border-2 border-primary/30 focus:border-primary"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-lg font-bold gradient-primary hover:opacity-90 transition-opacity comic-border border-primary-foreground/20 text-primary-foreground"
        >
          {loading ? "Updating..." : "UPDATE PASSWORD 💜"}
        </Button>
      </motion.form>
    </div>
  );
};

export default ResetPassword;
