import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";

const PI_API_BASE_URL =
  process.env.PI_API_BASE_URL || "https://api.minepi.com";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

function sendJson(res, status, body) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      error: "Method not allowed"
    });
  }

  try {
    const accessToken = req.body?.accessToken;

    if (
      typeof accessToken !== "string" ||
      accessToken.length < 20 ||
      accessToken.length > 4096
    ) {
      return sendJson(res, 400, {
        error: "Missing or invalid Pi access token"
      });
    }

    if (
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      !process.env.APP_JWT_SECRET
    ) {
      console.error("Missing required environment variables");

      return sendJson(res, 500, {
        error: "Server configuration is incomplete"
      });
    }

    const piResponse = await fetch(`${PI_API_BASE_URL}/v2/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(10000)
    });

    const piRaw = await piResponse.text();

    let piUser = null;

    try {
      piUser = piRaw ? JSON.parse(piRaw) : null;
    } catch {
      console.error("Pi API returned non-JSON:", piRaw);

      return sendJson(res, 502, {
        error: "Invalid response from Pi authentication server"
      });
    }

    if (!piResponse.ok) {
      console.error("Pi /me failed:", {
        status: piResponse.status,
        body: piUser
      });

      return sendJson(res, 401, {
        error: "Pi authentication token was rejected"
      });
    }

    const piUid = piUser?.uid;
    const username = piUser?.username;

    if (!piUid || !username) {
      console.error("Pi user response missing fields:", piUser);

      return sendJson(res, 401, {
        error: "Pi account information is incomplete"
      });
    }

    const { data: existingUser, error: readError } = await supabase
      .from("users")
      .select("id, pi_uid, username, role")
      .eq("pi_uid", piUid)
      .maybeSingle();

    if (readError) {
      console.error("Supabase user read failed:", readError);

      return sendJson(res, 500, {
        error: "Unable to read user account"
      });
    }

    let user = existingUser;

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          pi_uid: piUid,
          username,
          role: "user",
          last_login_at: new Date().toISOString()
        })
        .select("id, pi_uid, username, role")
        .single();

      if (insertError) {
        console.error("Supabase user insert failed:", insertError);

        return sendJson(res, 500, {
          error: "Unable to create user account"
        });
      }

      user = newUser;
    } else {
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          username,
          last_login_at: new Date().toISOString()
        })
        .eq("id", user.id)
        .select("id, pi_uid, username, role")
        .single();

      if (updateError) {
        console.error("Supabase user update failed:", updateError);

        return sendJson(res, 500, {
          error: "Unable to update user account"
        });
      }

      user = updatedUser;
    }

    const jwtSecret = new TextEncoder().encode(
      process.env.APP_JWT_SECRET
    );

    const token = await new SignJWT({
      userId: user.id,
      piUid: user.pi_uid,
      username: user.username,
      role: user.role
    })
      .setProtectedHeader({
        alg: "HS256",
        typ: "JWT"
      })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(jwtSecret);

    return sendJson(res, 200, {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Unexpected Pi login error:", error);

    return sendJson(res, 500, {
      error: "Authentication failed"
    });
  }
}
