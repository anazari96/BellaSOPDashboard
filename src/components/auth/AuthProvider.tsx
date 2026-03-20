"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), [createClient])

  useEffect(() => {
    let profileFetchedFor: string | null = null;
    const abortController = new AbortController();

    const fetchProfile = async (userId: string, force = false) => {
      if (!force && profileFetchedFor === userId) return;
      profileFetchedFor = userId;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, role, avatar_url, is_approved, terms_accepted, created_at")
          .eq("id", userId)
          .abortSignal(abortController.signal)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            setProfile(null);
          } else {
            console.error("Error fetching profile:", error);
          }
          return;
        }

        setProfile(data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Unexpected error fetching profile:", err);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === "INITIAL_SESSION") {
        if (currentUser) {
          // Defer Supabase calls outside the callback to avoid deadlock (see Supabase docs)
          setTimeout(() => {
            fetchProfile(currentUser.id).finally(() => setLoading(false));
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (currentUser) {
          setTimeout(() => fetchProfile(currentUser.id, true), 0);
        }
      } else if (event === "SIGNED_OUT") {
        profileFetchedFor = null;
        setProfile(null);
      }
    });

    return () => {
      abortController.abort();
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
