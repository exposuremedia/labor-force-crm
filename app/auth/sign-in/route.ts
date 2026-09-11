import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Server-only aliases to existing Supabase accounts. Never expose this mapping
// or return an account's email to unauthenticated callers.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Unable to sign in." }, { status: 403 });
  }
  try {
    const body = await request.json();
    if (typeof body.identifier !== "string" || typeof body.password !== "string" ||
        body.identifier.length > 254 || body.password.length > 4096 || !body.password) {
      return NextResponse.json({ error: "Enter your username or email and password." }, { status: 400 });
    }
    const identifier = body.identifier.trim().toLowerCase();
    let email = identifier;
    if (!identifier.includes("@")) {
      const aliases = JSON.parse(process.env.CRM_USERNAME_ALIASES || "{}");
      const match = Object.prototype.hasOwnProperty.call(aliases, identifier) ? aliases[identifier] : null;
      email = typeof match === "string" ? match : "unregistered-login@invalid.invalid";
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: body.password });
    if (error) return NextResponse.json({ error: "Incorrect username, email, or password." }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 500 });
  }
}
