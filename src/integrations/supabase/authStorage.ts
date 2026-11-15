// Makes "Keep me logged in" real.
//
// - checked (default): the auth session lives in localStorage, so it survives
//   closing and reopening the browser.
// - unchecked: the session lives in sessionStorage, so it's cleared when the
//   browser/tab is closed — the user has to log in again next time.
//
// Only the auth tokens move between the two stores. The user's choice itself is
// a tiny boolean kept in localStorage so we know where to write on sign-in.

const PREF_KEY = "powerclub:keepLoggedIn";

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

/** Record the choice BEFORE calling signIn so the session is written to the
 *  right store. Defaults to persistent when never set. */
export const setKeepLoggedIn = (keep: boolean): void =>
  safe(() => window.localStorage.setItem(PREF_KEY, keep ? "true" : "false"), undefined);

const sessionOnly = (): boolean =>
  safe(() => window.localStorage.getItem(PREF_KEY) === "false", false);

/** Storage adapter passed to supabase-js. Reads from whichever store has the
 *  value (session first), writes to the one the preference selects. */
export const authStorage = {
  getItem: (key: string): string | null =>
    safe(() => window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key), null),
  setItem: (key: string, value: string): void => {
    if (sessionOnly()) {
      safe(() => {
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
      }, undefined);
    } else {
      safe(() => {
        window.localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      }, undefined);
    }
  },
  removeItem: (key: string): void =>
    safe(() => {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    }, undefined),
};
