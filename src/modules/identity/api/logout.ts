"use server";

import { signOut } from "../lib/auth";
import { cookies } from "next/headers";

export async function logoutAction() {
  // Clear all additional cookies
  const cookieStore = await cookies();
  
  // Clear 2FA token if exists
  cookieStore.delete("2fa_token");
  
  // Clear pending referral code if exists
  cookieStore.delete("pending_referral_code");
  
  // Sign out from NextAuth (this clears session cookies)
  await signOut({ redirect: false });
}

