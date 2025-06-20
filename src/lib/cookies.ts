// Simple cookie utilities for working with cookies in Bun

// Parse cookies from request
function parse(req: Request): Record<string, string> {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return {};
  
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {} as Record<string, string>);
}

// Get a specific cookie value
function get(req: Request, name: string): string | undefined {
  const cookies = parse(req);
  return cookies[name];
}

// Set a cookie in the response
function set(
  res: Response, 
  name: string, 
  value: string, 
  options: {
    maxAge?: number;
    expires?: Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}
): Response {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  if (options.secure) cookie += '; Secure';
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  
  const newHeaders = new Headers(res.headers);
  newHeaders.append('Set-Cookie', cookie);
  
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders
  });
}

// Remove a cookie
function remove(res: Response, name: string, options: { path?: string; domain?: string } = {}): Response {
  return set(res, name, '', {
    ...options,
    maxAge: 0,
    expires: new Date(0)
  });
}

export const cookies = {
  parse,
  get,
  set,
  remove
};