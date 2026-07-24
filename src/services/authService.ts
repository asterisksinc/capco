import { supabaseAuth, supabaseRest, type RoleCode, type SupabaseSession } from "./supabaseClient";

export type CurrentUser = {
  id: string;
  auth_user_id?: string | null;
  full_name: string;
  email?: string | null;
  phone: string;
  status: "active" | "inactive" | "suspended";
  roles?: { code: RoleCode; name: string } | null;
};

const profileSelect = "id,auth_user_id,full_name,email,phone,status,roles(code,name)";

export const authService = {
  requestOtp(phone: string) {
    return supabaseAuth.sendOtp(phone);
  },
  verifyOtp(phone: string, token: string): Promise<SupabaseSession> {
    return supabaseAuth.verifyOtp(phone, token);
  },
  loginWithPassword(identifier: string, password: string): Promise<SupabaseSession> {
    return supabaseAuth.signInWithPassword(identifier, password);
  },
  logout() {
    return supabaseAuth.signOut();
  },
  async getCurrentProfile() {
    const authUser = await supabaseAuth.getUser();
    return supabaseRest
      .list<CurrentUser>("profiles", {
        select: profileSelect,
        filters: { auth_user_id: authUser.id },
        limit: 1,
      })
      .then((rows) => rows[0] ?? null);
  },
};
