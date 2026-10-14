import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
      <p className="font-display text-primary text-7xl sm:text-8xl tracking-wider drop-shadow">
        404
      </p>
      <h1 className="mt-4 font-display text-2xl sm:text-3xl text-foreground tracking-wide">
        This page took a rest day 💜
      </h1>
      <p className="mt-2 max-w-sm font-semibold text-muted-foreground">
        We couldn't find the page you were looking for.
      </p>
      <Button
        asChild
        className="mt-8 h-12 px-6 font-bold gradient-primary text-primary-foreground comic-border border-primary-foreground/20 hover:opacity-90"
      >
        <Link to="/">Back home</Link>
      </Button>
    </div>
  );
};

export default NotFound;
