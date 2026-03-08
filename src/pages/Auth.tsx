import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
        toast({
          title: "Welcome to Power Girls Club! 💜",
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
          Power Girls Club
        </h1>
        <p className="text-primary-foreground/80 font-bold text-lg mt-2">
          💜 Stronger Together, Anywhere 💜
        </p>
      </motion.div>

      <motion.form
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-card/95 backdrop-blur-sm rounded-2xl p-6 comic-border space-y-4 relative z-10"
      >
        <h2 className="text-2xl font-display text-center text-foreground">
          {isLogin ? "Welcome Back! 💜" : "Join Us! 💪"}
        </h2>

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

        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-center text-sm font-bold text-primary hover:underline"
        >
          {isLogin ? "New here? Join the club!" : "Already a member? Log in!"}
        </button>
      </motion.form>
    </div>
  );
};

export default Auth;
