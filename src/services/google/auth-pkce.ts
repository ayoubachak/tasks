/**
 * Google OAuth 2.0 with PKCE (Proof Key for Code Exchange)
 * This allows OAuth without exposing client secret - perfect for frontend-only apps!
 * 
 * PKCE flow:
 * 1. Generate code verifier + code challenge
 * 2. Redirect to Google with code challenge
 * 3. Google redirects back with code
 * 4. Exchange code + verifier for tokens (no secret needed!)
 */

export interface GoogleAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

const TOKEN_STORAGE_KEY = 'google_auth_tokens';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}${import.meta.env.BASE_URL || ''}/auth/google/callback`;
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
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID || '',
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline', // Required to get refresh token
    prompt: 'consent', // Force consent screen to get refresh token
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens using PKCE
 * No client secret needed!
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleAuthTokens> {
  const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
  
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart the OAuth flow.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID || '',
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier, // PKCE: verifier instead of secret!
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
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
 * Note: Refresh still requires client_id, but no secret for public clients
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

