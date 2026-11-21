const cookieName = 'coworking_manager';
const cookiePattern = new RegExp(`(?:^|;\\s*)${cookieName}=([a-f0-9]{64})(?=;|$)`);

export function readSessionToken(cookie: string | undefined): string | undefined {
  return cookie?.match(cookiePattern)?.[1];
}

export function sessionCookie(token: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${cookieName}=${token}; Path=/api/manager; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`;
}
