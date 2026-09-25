"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./client";
import { hasSupabase } from "./env";

/**
 * Whether a session exists: `null` while it is read from storage.
 * The app is a static bundle in the iOS build, so sign-in is checked on the client.
 */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(hasSupabase ? null : true);

  useEffect(() => {
    if (!hasSupabase) return;
    const auth = getSupabase().auth;
    void auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  return signedIn;
}
