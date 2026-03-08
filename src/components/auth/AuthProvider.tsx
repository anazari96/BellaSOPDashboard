"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
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
  supabase: supabaseClient,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = supabaseClient

  useEffect(() => {
    let mounted = true;
    let profileFetchedFor: string | null = null;

    const fallbackTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    const fetchProfile = async (userId: string, force = false) => {
      if (!force && profileFetchedFor === userId) return;
      profileFetchedFor = userId;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, role, avatar_url, created_at")
          .eq("id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching profile:", error);
        }

        if (mounted) setProfile(data ?? null);
      } catch (err) {
        console.error("Unexpected error fetching profile:", err);
      }
    };

    const initialize = async () => {
      try {
        const { data: { user: initialUser }, error } = await supabase.auth.getUser();
        if (error) console.warn("Auth getUser error:", error.message);
        if (!mounted) return;

        setUser(initialUser ?? null);

        if (initialUser) {
          await fetchProfile(initialUser.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Unexpected error getting session:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === "INITIAL_SESSION") {
        if (currentUser) await fetchProfile(currentUser.id);
        else setProfile(null);
        if (mounted) setLoading(false);
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (currentUser) await fetchProfile(currentUser.id, true);
      } else if (event === "SIGNED_OUT") {
        profileFetchedFor = null;
        setProfile(null);
      }
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
