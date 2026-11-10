/**
 * MediBooking Client-Side Authentication & Session Management Library
 */

export interface StoredUser {
  userId?: string;
  mobile: string;
  fullName?: string;
  role: string;
  clinicId?: string;
  clinicName?: string;
  chamberNumber?: string;
  locality?: string;
}

/**
 * Set authenticated session in both cookie (for Next.js Edge Middleware) and localStorage
 */
export function setAuthSession(token: string, user: StoredUser): void {
  if (typeof document !== 'undefined') {
    // 7 days cookie expiration, SameSite=Lax for edge middleware inspection
    document.cookie = `medibooking_session=${token}; path=/; max-age=604800; SameSite=Lax`;
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('medibooking_session', token);
    localStorage.setItem('medibooking_user', JSON.stringify(user));
    window.dispatchEvent(new Event('medibooking:auth-change'));
  }
}

/**
 * Get current authenticated user profile from localStorage
 */
export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('medibooking_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Check if client has an active session token
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('medibooking_session'));
}

/**
 * Clear all authentication tokens, cookies, and local storage state
 */
export function clearAuthSession(): void {
  if (typeof document !== 'undefined') {
    // Delete cookie by setting expiration in the past
    document.cookie = 'medibooking_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('medibooking_session');
    localStorage.removeItem('medibooking_user');
    window.dispatchEvent(new Event('medibooking:auth-change'));
  }
}

/**
 * Full logout flow: cleans state, optionally signals API, and redirects cleanly
 */
export async function logout(
  router?: { push: (url: string) => void },
  redirectUrl: string = '/login?logged_out=1'
): Promise<void> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('medibooking_session') : null;
    if (token) {
      await fetch(`${apiBase}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {});
    }
  } catch {
    // Graceful offline fallback
  }

  // Clear client storage
  clearAuthSession();

  // Navigate to login or target
  if (router) {
    router.push(redirectUrl);
  } else if (typeof window !== 'undefined') {
    window.location.href = redirectUrl;
  }
}
