import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Family Asset Manager"' },
  });
}

export function proxy(request: NextRequest) {
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!password) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return unauthorized();
  }

  const [, receivedPassword] = Buffer.from(authHeader.slice(6), "base64")
    .toString("utf-8")
    .split(":");

  if (receivedPassword !== password) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
