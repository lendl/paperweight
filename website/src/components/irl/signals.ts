export interface ClientSignals {
  os: string;
  browser: string;
  screen: string;
  language: string;
  timezone: string;
  cpuCores: string;
  colorScheme: string;
  touchPoints: string;
  doNotTrack: string;
  cookies: string;
  fingerprint: string;
  gpu: string;
}

async function hashString(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function parseUserAgentFallback(): { os: string; browser: string } {
  const ua = navigator.userAgent;

  let os = "unknown";
  if (/iPhone|iPad|iPod/.test(ua)) {
    const match = ua.match(/OS (\d+[_\d]*)/);
    os = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
  } else if (/Android/.test(ua)) {
    const match = ua.match(/Android (\d+[\d.]*)/);
    os = match ? `Android ${match[1]}` : "Android";
  } else if (/Mac OS X/.test(ua)) {
    const match = ua.match(/Mac OS X (\d+[_\d]*)/);
    os = match ? `macOS ${match[1].replace(/_/g, ".")}` : "macOS";
  } else if (/Windows/.test(ua)) {
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    os = match ? `Windows ${match[1]}` : "Windows";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  }

  let browser = "unknown";
  if (/Edg\//.test(ua)) {
    const match = ua.match(/Edg\/(\d+[\d.]*)/);
    browser = match ? `Edge ${match[1]}` : "Edge";
  } else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) {
    const match = ua.match(/Chrome\/(\d+[\d.]*)/);
    browser = match ? `Chrome ${match[1]}` : "Chrome";
  } else if (/Version\/.*Safari/.test(ua)) {
    const match = ua.match(/Version\/(\d+[\d.]*)/);
    browser = match ? `Safari ${match[1]}` : "Safari";
  } else if (/Firefox\//.test(ua)) {
    const match = ua.match(/Firefox\/(\d+[\d.]*)/);
    browser = match ? `Firefox ${match[1]}` : "Firefox";
  }

  return { os, browser };
}

interface NavigatorUABrandVersion {
  brand: string;
  version: string;
}

interface NavigatorUAData {
  platform: string;
  getHighEntropyValues(hints: string[]): Promise<{
    platform?: string;
    platformVersion?: string;
    fullVersionList?: NavigatorUABrandVersion[];
  }>;
}

async function parsePlatform(): Promise<{ os: string; browser: string }> {
  const fallback = parseUserAgentFallback();
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;

  if (!uaData) {
    return fallback;
  }

  try {
    const hints = await uaData.getHighEntropyValues([
      "platform",
      "platformVersion",
      "fullVersionList",
    ]);

    let os = fallback.os;
    if (hints.platform === "iOS") {
      os = hints.platformVersion
        ? `iOS ${hints.platformVersion.split(".")[0]}`
        : "iOS";
    } else if (hints.platform === "Android") {
      os = hints.platformVersion
        ? `Android ${hints.platformVersion.split(".")[0]}`
        : "Android";
    } else if (hints.platform === "macOS") {
      os = hints.platformVersion
        ? `macOS ${hints.platformVersion.split(".")[0]}`
        : "macOS";
    } else if (hints.platform === "Windows") {
      os = hints.platformVersion
        ? `Windows ${hints.platformVersion.split(".")[0]}`
        : "Windows";
    } else if (hints.platform) {
      os = hints.platform;
    }

    const brandEntry = hints.fullVersionList?.find(
      (entry: NavigatorUABrandVersion) => !/Not.?A.?Brand/i.test(entry.brand),
    );
    const browser = brandEntry
      ? `${brandEntry.brand} ${brandEntry.version.split(".")[0]}`
      : fallback.browser;

    return { os, browser };
  } catch {
    return fallback;
  }
}

function getCanvasSeed(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 60;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "canvas-unavailable";

  ctx.textBaseline = "top";
  ctx.font = "16px monospace";
  ctx.fillStyle = "#0f0";
  ctx.fillRect(0, 0, 120, 30);
  ctx.fillStyle = "#069";
  ctx.fillText("paperweight", 2, 2);
  ctx.strokeStyle = "#f60";
  ctx.arc(60, 30, 18, 0, Math.PI * 2);
  ctx.stroke();

  return canvas.toDataURL();
}

function getWebGLSeed(): { renderer: string; seed: string } {
  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl") ??
    canvas.getContext("experimental-webgl") as WebGLRenderingContext | null;

  if (!gl) {
    return { renderer: "unavailable", seed: "webgl-unavailable" };
  }

  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
    : String(gl.getParameter(gl.RENDERER));

  const seed = [
    renderer,
    gl.getParameter(gl.VENDOR),
    gl.getParameter(gl.VERSION),
    gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    gl.getParameter(gl.MAX_TEXTURE_SIZE),
    gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
  ].join("|");

  return { renderer, seed };
}

function formatDoNotTrack(): string {
  const value = navigator.doNotTrack ?? (window as Window & { doNotTrack?: string }).doNotTrack;
  if (value === "1" || value === "yes") return "enabled (lol)";
  if (value === "0" || value === "no") return "disabled";
  return "unset";
}

export async function collectClientSignals(): Promise<ClientSignals> {
  const { os, browser } = await parsePlatform();
  const canvasSeed = getCanvasSeed();
  const { renderer, seed: webglSeed } = getWebGLSeed();
  const fingerprint = await hashString(`${canvasSeed}|${webglSeed}`);

  const languages = navigator.languages?.length
    ? navigator.languages.join(", ")
    : navigator.language;

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  return {
    os,
    browser,
    screen: `${screen.width} x ${screen.height} @${window.devicePixelRatio}x`,
    language: languages,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cpuCores: String(navigator.hardwareConcurrency ?? "unknown"),
    colorScheme: prefersDark ? "dark" : "light",
    touchPoints: String(navigator.maxTouchPoints ?? 0),
    doNotTrack: formatDoNotTrack(),
    cookies: navigator.cookieEnabled ? "allowed" : "blocked",
    fingerprint,
    gpu: renderer,
  };
}
