import { Sparkles } from "lucide-react";
import { useFeatureFlags, type FeatureFlagKey } from "@/hooks/useAppSettings";
import type { ReactNode } from "react";

interface FeatureGateProps {
  flag: FeatureFlagKey;
  title: string;
  children: ReactNode;
}

/**
 * Render `children` only when the named flag is enabled.
 * When disabled, show a friendly "coming soon" placeholder.
 *
 * While the flag query is still in flight we render the children — the
 * defaults in useFeatureFlags() are all-on, so this matches the optimistic
 * behavior the rest of the app expects.
 */
const FeatureGate = ({ flag, title, children }: FeatureGateProps) => {
  const { data: flags, isLoading } = useFeatureFlags();
  if (isLoading) return <>{children}</>;
  if (flags?.[flag]) return <>{children}</>;

  return (
    <div className="px-4 pt-10 pb-24 max-w-md mx-auto lg:max-w-lg lg:px-8 lg:pb-8">
      <div className="rounded-2xl border-2 border-border bg-card p-8 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h2 className="font-display text-2xl text-foreground">{title} is coming soon</h2>
        <p className="text-sm font-bold text-muted-foreground">
          This feature is temporarily turned off. Check back in a bit!
        </p>
      </div>
    </div>
  );
};

export default FeatureGate;
