/**
 * Google OAuth 2.0 Authentication Service with PKCE
 * Handles authentication flow and token management
 * Uses PKCE (Proof Key for Code Exchange) - no client secret needed!
 * Perfect for frontend-only apps on GitHub Pages
 */

export interface GoogleAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

const TOKEN_STORAGE_KEY = 'google_auth_tokens';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Note: For Google OAuth with web applications, even with PKCE, the client_secret
// may be required for token exchange. However, for true frontend-only apps,
// we can use PKCE without it. If this fails, you may need to configure the
// OAuth client in Google Cloud Console to allow public clients.
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
// Use a dedicated callback page that works in popup
// Handle base URL properly to avoid double slashes
const getRedirectUri = () => {
  const base = import.meta.env.BASE_URL || '/';
  const basePath = base === '/' ? '' : base.replace(/\/$/, ''); // Remove trailing slash if not root
  return `${window.location.origin}${basePath}/auth-callback.html`;
};
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

/**
 * Generate a cryptographically random string for PKCE
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate code challenge from verifier (SHA256 hash, base64url encoded)
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate OAuth 2.0 authorization URL with PKCE
 * PKCE allows OAuth without client secret - perfect for frontend-only apps!
 */
export async function getAuthUrl(): Promise<string> {
  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
  
  // Store verifier and state for later
  sessionStorage.setItem('oauth_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);
  
  // Calculate redirect URI dynamically (in case it changes)
  const redirectUri = getRedirectUri();
  console.log('OAuth Redirect URI:', redirectUri);
  console.log('Make sure this exact URI is in Google Cloud Console authorized redirect URIs!');
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline', // Required to get refresh token
    prompt: 'consent', // Force consent screen to get refresh token
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256', // SHA256
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Open OAuth in popup window and handle callback
 * Returns tokens when user completes authentication
 */
export async function authenticateWithPopup(): Promise<GoogleAuthTokens> {
  const authUrl = await getAuthUrl();
  
  return new Promise((resolve, reject) => {
    // Open popup window
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      authUrl,
      'Google OAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    let messageReceived = false;
    let checkClosedInterval: NodeJS.Timeout | null = null;

    // Listen for messages from popup (when it redirects to callback)
    const messageListener = async (event: MessageEvent) => {
      // Security: verify origin
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'oauth-callback') {
        messageReceived = true;
        if (checkClosedInterval) {
          clearInterval(checkClosedInterval);
        }
        window.removeEventListener('message', messageListener);
        
        // Close popup after a short delay to ensure message is processed
        setTimeout(() => {
          if (popup && !popup.closed) {
            popup.close();
          }
        }, 100);

        const { code, state } = event.data;
        const storedState = sessionStorage.getItem('oauth_state');

        if (state !== storedState) {
          reject(new Error('Invalid state parameter. Security check failed.'));
          return;
        }

        try {
          const tokens = await exchangeCodeForTokens(code);
          resolve(tokens);
        } catch (error) {
          reject(error);
        }
        return;
      }

      if (event.data.type === 'oauth-error') {
        messageReceived = true;
        if (checkClosedInterval) {
          clearInterval(checkClosedInterval);
        }
        window.removeEventListener('message', messageListener);
        if (popup && !popup.closed) {
          popup.close();
        }
        reject(new Error(event.data.error || 'OAuth failed'));
        return;
      }
    };

    window.addEventListener('message', messageListener);

    // Check if popup is closed manually (only if we haven't received a message)
    checkClosedInterval = setInterval(() => {
      if (popup.closed && !messageReceived) {
        clearInterval(checkClosedInterval!);
        window.removeEventListener('message', messageListener);
        reject(new Error('Authentication cancelled'));
      }
    }, 500);
  });
}


/**
 * Exchange authorization code for tokens using PKCE
 * No client secret needed! PKCE verifier is used instead.
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleAuthTokens> {
  const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
  
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart the OAuth flow.');
  }

  // Calculate redirect URI dynamically (must match the one used in getAuthUrl)
  const redirectUri = getRedirectUri();
  
  console.log('Exchanging code for tokens...');
  console.log('Redirect URI:', redirectUri);
  console.log('Has code verifier:', !!codeVerifier);

  // For Google OAuth with web applications, even with PKCE, client_secret may be required.
  // If CLIENT_SECRET is not set, we try without it (pure PKCE).
  // If it fails, you'll need to add VITE_GOOGLE_CLIENT_SECRET to .env.local
  const tokenParams: Record<string, string> = {
    code,
    client_id: CLIENT_ID || '',
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier, // PKCE: verifier provides security
  };
  
  // Only include client_secret if provided (for web app compatibility)
  // Note: This is less secure for frontend-only apps, but Google may require it
  if (CLIENT_SECRET) {
    tokenParams.client_secret = CLIENT_SECRET;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(tokenParams),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Token exchange error:', error);
    throw new Error(`Token exchange failed: ${error.error_description || error.error || 'Unknown error'}`);
  }

  const data = await response.json();
  
  // Clean up PKCE verifier
  sessionStorage.removeItem('oauth_code_verifier');
  
  const tokens: GoogleAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    scope: data.scope,
  };

  saveTokens(tokens);
  return tokens;
}

/**
 * Get stored tokens
 */
export function getStoredTokens(): GoogleAuthTokens | null {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save tokens to localStorage
 */
export function saveTokens(tokens: GoogleAuthTokens): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

/**
 * Clear stored tokens
 */
export function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Check if tokens are valid and not expired
 */
export function isTokenValid(tokens: GoogleAuthTokens | null): boolean {
  if (!tokens) return false;
  // Check if token expires in next 5 minutes
  return tokens.expiresAt > Date.now() + (5 * 60 * 1000);
}

/**
 * Refresh access token using refresh token
 * For public clients (PKCE), no client secret is needed for refresh
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleAuthTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  const existingTokens = getStoredTokens();
  
  if (!existingTokens) {
    throw new Error('No existing tokens found');
  }

  const tokens: GoogleAuthTokens = {
    ...existingTokens,
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  saveTokens(tokens);
  return tokens;
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(): Promise<string | null> {
  let tokens = getStoredTokens();
  
  if (!tokens) {
    return null;
  }

  if (!isTokenValid(tokens)) {
    try {
      tokens = await refreshAccessToken(tokens.refreshToken);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      clearTokens();
      return null;
    }
  }

  return tokens.accessToken;
}

