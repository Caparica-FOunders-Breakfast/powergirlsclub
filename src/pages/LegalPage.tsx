import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  children: ReactNode;
}

/** Simple, branded shell for static legal pages (Privacy, Terms). */
const LegalPage = ({ title, children }: LegalPageProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b-2 border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-display text-primary tracking-wider">Power Club</span>
            <span aria-hidden>💜</span>
          </Link>
          <Link to="/" className="text-sm font-bold text-foreground hover:text-primary">
            ← Back home
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="font-display text-4xl sm:text-5xl text-foreground tracking-wide">{title}</h1>
        <div className="mt-8 space-y-4 text-sm sm:text-base font-semibold text-muted-foreground leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-foreground [&_h2]:tracking-wide [&_h2]:mt-8 [&_h2]:mb-2">
          {children}
        </div>
      </main>
    </div>
  );
};

export default LegalPage;
