import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';

// Multi-tenant app — users configure their own client ID or use the default
const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || '';

const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage' as const,
  },
};

const scopes = [
  'User.Read',
  'OnlineMeetingTranscript.Read.All',
  'OnlineMeetings.Read',
];

let msalInstance: PublicClientApplication | null = null;

export function getMsalInstance(): PublicClientApplication | null {
  if (!CLIENT_ID) return null;
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
}

export async function initMsal(): Promise<boolean> {
  const instance = getMsalInstance();
  if (!instance) return false;
  await instance.initialize();
  const response = await instance.handleRedirectPromise();
  if (response) return true;
  const accounts = instance.getAllAccounts();
  return accounts.length > 0;
}

export async function loginWithMicrosoft(): Promise<string | null> {
  const instance = getMsalInstance();
  if (!instance) return null;

  try {
    const result = await instance.loginPopup({ scopes });
    return result.accessToken;
  } catch (err) {
    console.error('Login failed:', err);
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const instance = getMsalInstance();
  if (!instance) return null;

  const accounts = instance.getAllAccounts();
  if (accounts.length === 0) return null;

  try {
    const result = await instance.acquireTokenSilent({
      scopes,
      account: accounts[0],
    });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const result = await instance.acquireTokenPopup({ scopes });
      return result.accessToken;
    }
    return null;
  }
}

export async function logout() {
  const instance = getMsalInstance();
  if (!instance) return;
  await instance.logoutPopup();
}

export function isConfigured(): boolean {
  return !!CLIENT_ID;
}

export function getUserName(): string | null {
  const instance = getMsalInstance();
  if (!instance) return null;
  const accounts = instance.getAllAccounts();
  return accounts[0]?.name || accounts[0]?.username || null;
}
