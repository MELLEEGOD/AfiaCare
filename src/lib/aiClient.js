export class ApiRequestError extends Error {
  constructor(message, { status = 0, isUnavailable = false } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.isUnavailable = isUnavailable;
  }
}

function friendlyApiMessage(error, fallback = "Live AI is unavailable, so AfiaCare used built-in guidance.") {
  const message = String(error?.message || "");
  const unavailable =
    error?.name === "AbortError" ||
    error?.isUnavailable ||
    error?.status === 404 ||
    error?.status === 502 ||
    error?.status === 503 ||
    error?.status === 504 ||
    /failed to fetch|fetch failed|load failed|networkerror|operation was aborted|abort|timeout/i.test(message);

  if (unavailable) return fallback;
  return message || fallback;
}

export async function postJson(path, payload, { timeoutMs = 18000, fallbackMessage } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : {};
    if (!response.ok) {
      throw new ApiRequestError(data.error || `Request failed with status ${response.status}.`, {
        status: response.status,
        isUnavailable: response.status === 404 || response.status >= 502,
      });
    }
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    throw new ApiRequestError(friendlyApiMessage(error, fallbackMessage), {
      status: error?.status || 0,
      isUnavailable: true,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export function describeApiFallback(error, fallback) {
  return friendlyApiMessage(error, fallback);
}
