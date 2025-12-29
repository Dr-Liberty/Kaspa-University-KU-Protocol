import { QueryClient, QueryFunction } from "@tanstack/react-query";

let walletAddress: string | null = null;
let authToken: string | null = null;

const AUTH_TOKEN_KEY = "kaspa-university-auth-token";

// Restore auth token from storage on load
if (typeof window !== "undefined") {
  authToken = localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setWalletAddress(address: string | null) {
  walletAddress = address;
}

export function getWalletAddress(): string | null {
  return walletAddress;
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const data = await res.json();
      // Combine error and message for more detailed feedback
      if (data.message && data.error && data.message !== data.error) {
        errorMessage = `${data.error}: ${data.message}`;
      } else {
        errorMessage = data.message || data.error || data.details || JSON.stringify(data);
      }
    } catch {
      const text = await res.text().catch(() => "");
      if (text) errorMessage = text;
    }
    console.error(`[API] Request failed: ${res.status} - ${errorMessage}`);
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (walletAddress) {
    headers["x-wallet-address"] = walletAddress;
  }
  if (authToken) {
    headers["x-auth-token"] = authToken;
  }

  console.log(`[API] ${method} ${url}`, { hasWallet: !!walletAddress, hasAuth: !!authToken, walletPreview: walletAddress?.slice(0, 15) });

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`[API] ${method} ${url} failed:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    if (walletAddress) {
      headers["x-wallet-address"] = walletAddress;
    }
    if (authToken) {
      headers["x-auth-token"] = authToken;
    }

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
