import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

async function loadProfile(userId) {
  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("id, full_name, phone, status, is_super_admin")
    .eq("id", userId)
    .maybeSingle();

  if (appUserError) throw appUserError;
  if (!appUser) return { appUser: null, farmAccess: [], permissionCodes: new Set() };

  const { data: access, error: accessError } = await supabase
    .from("user_farm_access")
    .select("farm_id, farms:farm_id(id, code, name, status), role_id, roles:role_id(id, code, label_ar, label_fr)")
    .eq("user_id", userId);

  if (accessError) throw accessError;

  const farmAccess = (access || [])
    .filter((row) => row.farms)
    .map((row) => ({
      farm: row.farms,
      role: row.roles || null,
    }));

  const roleIds = [...new Set(farmAccess.map((row) => row.role?.id).filter(Boolean))];
  let permissionCodes = new Set();
  if (roleIds.length > 0) {
    const { data: rolePerms, error: rolePermsError } = await supabase
      .from("role_permissions")
      .select("role_id, permissions:permission_id(code)")
      .in("role_id", roleIds);
    if (rolePermsError) throw rolePermsError;
    permissionCodes = new Set((rolePerms || []).map((row) => row.permissions?.code).filter(Boolean));
  }

  return { appUser, farmAccess, permissionCodes };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const result = await loadProfile(userId);
      setProfile(result);
    } catch (err) {
      setProfileError(err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    refreshProfile(session?.user?.id ?? null);
  }, [session, refreshProfile]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const hasPermission = useCallback(
    (code) => {
      if (!profile) return false;
      if (profile.appUser?.is_super_admin) return true;
      return profile.permissionCodes.has(code);
    },
    [profile]
  );

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      authLoading: session === undefined,
      appUser: profile?.appUser ?? null,
      isSuperAdmin: !!profile?.appUser?.is_super_admin,
      farmAccess: profile?.farmAccess ?? [],
      profileLoading,
      profileError,
      hasPermission,
      signIn,
      signOut,
      refreshProfile: () => refreshProfile(session?.user?.id ?? null),
    }),
    [session, profile, profileLoading, profileError, hasPermission, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
