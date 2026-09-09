"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, createSessionToken, passwordMatches } from "@/lib/auth";
import { requireEnv } from "@/lib/env";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export async function login(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");

  if (!passwordMatches(password, requireEnv("APP_PASSWORD"))) {
    redirect("/login?error=wrong");
  }

  const token = await createSessionToken(requireEnv("AUTH_SECRET"));
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_IN_SECONDS,
  });

  redirect("/");
}
