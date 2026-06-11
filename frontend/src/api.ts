import type { MatchResponse, Meta, Profile, SchemeCard, SchemeDetail } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new Error(message);
  }
  return res.json();
}

export const getMeta = () => request<Meta>("/api/meta");

export const listSchemes = (params: {
  category?: string;
  state?: string;
  q?: string;
  tag?: string;
}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  );
  return request<{ count: number; schemes: SchemeCard[] }>(
    `/api/schemes${qs.size ? `?${qs}` : ""}`,
  );
};

export const getScheme = (id: string) => request<SchemeDetail>(`/api/schemes/${id}`);

export const matchProfile = (profile: Profile) =>
  request<MatchResponse>("/api/match", {
    method: "POST",
    body: JSON.stringify({ profile }),
  });
