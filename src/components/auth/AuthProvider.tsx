"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import type { User, SupabaseClient } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  supabase: SupabaseClient;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  supabase: createClient(),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let mounted = true;
    let loadingDone = false;

    const setLoadingFalse = () => {
      if (mounted && !loadingDone) {
        loadingDone = true;
        setLoading(false);
      }
    };

    // Fallback: stop loading after 3s so we never hang indefinitely (e.g. slow network)
    const fallbackTimer = setTimeout(setLoadingFalse, 3000);

    const getSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.warn("Auth getUser error:", error.message);
        }

        if (mounted) setUser(user ?? null);

        if (user) {
          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profileError && profileError.code !== "PGRST116") {
            console.error("Error fetching profile:", profileError);
          }

          if (mounted) setProfile(data ?? null);
        } else if (mounted) {
          setProfile(null);
        }
      } catch (err) {
        console.error("Unexpected error getting session:", err);
      } finally {
        setLoadingFalse();
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      console.log("session", session)

      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        try {
          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", sessionUser.id)
            .single();

          if (profileError && profileError.code !== "PGRST116") {
            console.error("Error fetching profile on auth change:", profileError);
          }

          if (mounted) setProfile(data ?? null);
        } catch (err) {
          console.error("Unexpected error fetching profile:", err);
        }
      } else {
        if (mounted) setProfile(null);
      }

      setLoadingFalse();
    });

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: profile?.role === "admin",
        supabase,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
