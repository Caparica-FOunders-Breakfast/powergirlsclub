import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "Check your email! 📧",
        description: "We sent you a link to reset your password.",
      });
      setIsForgotPassword(false);
    } catch (err: any) {
      toast({ title: "Oops!", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
        toast({
          title: "Welcome to Power Club! 💜",
          description: "Check your email to confirm your account.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Oops!",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gradient-primary relative overflow-hidden">
      <div className="absolute top-10 left-10 w-24 h-24 rounded-full bg-accent/30 blur-xl" />
      <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-secondary/30 blur-xl" />
      <div className="absolute top-1/3 right-5 w-16 h-16 rounded-full bg-primary/40 blur-lg" />

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-center mb-8 relative z-10"
      >
        <h1 className="text-6xl font-display text-primary-foreground drop-shadow-lg tracking-wider">
          Power Club
        </h1>
        <p className="text-primary-foreground/80 font-bold text-lg mt-2">
          💜 Stronger Together, Anywhere 💜
        </p>
      </motion.div>

      <motion.form
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit}
        className="w-full max-w-sm bg-card/95 backdrop-blur-sm rounded-2xl p-6 comic-border space-y-4 relative z-10"
      >
        <h2 className="text-2xl font-display text-center text-foreground">
          {isForgotPassword ? "Reset Password 📧" : isLogin ? "Welcome Back! 💜" : "Join Us! 💪"}
        </h2>

        {isForgotPassword ? (
          <>
            <p className="text-sm text-center text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>
            <div>
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="mt-1 border-2 border-primary/30 focus:border-primary"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-lg font-bold gradient-primary hover:opacity-90 transition-opacity comic-border border-primary-foreground/20 text-primary-foreground"
            >
              {loading ? "Sending..." : "SEND RESET LINK 📧"}
            </Button>
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="w-full text-center text-sm font-bold text-primary hover:underline"
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            {!isLogin && (
              <div>
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Your Name</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Sofia"
                  required={!isLogin}
                  className="mt-1 border-2 border-primary/30 focus:border-primary"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="mt-1 border-2 border-primary/30 focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Password</label>
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-lg font-bold gradient-primary hover:opacity-90 transition-opacity comic-border border-primary-foreground/20 text-primary-foreground"
            >
              {loading ? "Loading..." : isLogin ? "LET'S GO! 💜" : "JOIN THE CLUB! 🎉"}
            </Button>

            {isLogin && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                Forgot your password?
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center text-sm font-bold text-primary hover:underline"
            >
              {isLogin ? "New here? Join the club!" : "Already a member? Log in!"}
            </button>
          </>
        )}
      </motion.form>
    </div>
  );
};

export default Auth;
