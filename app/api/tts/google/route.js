export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DEFAULT_LIMIT = 900000;
const DEFAULT_WARN_AT = 800000;
const DEFAULT_VOICE = "ko-KR-Chirp3-HD-Kore";
const DEFAULT_LANGUAGE = "ko-KR";
const MAX_TEXT_CHARS_PER_REQUEST = 3000;

function getEnvFilePath() {
  return path.join(process.cwd(), "runtime", "hermes", "home", ".env");
}

function parseEnv(text) {
  const out = {};

  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

function readEnv() {
  const filePath = getEnvFilePath();
  const fileEnv = fs.existsSync(filePath)
    ? parseEnv(fs.readFileSync(filePath, "utf8"))
    : {};

  return { ...fileEnv, ...process.env };
}

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function getUsageDir() {
  const dir = path.join(process.cwd(), "runtime", "tts-usage");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getUsageFile(month = getMonthKey()) {
  return path.join(getUsageDir(), "google-tts-" + month + ".json");
}

function readUsage(month = getMonthKey()) {
  const file = getUsageFile(month);

  if (!fs.existsSync(file)) {
    return {
      provider: "google-cloud-tts",
      month,
      usedChars: 0,
      requestCount: 0,
      updatedAt: null
    };
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {
      provider: "google-cloud-tts",
      month,
      usedChars: 0,
      requestCount: 0,
      updatedAt: null
    };
  }
}

function writeUsage(usage) {
  fs.writeFileSync(getUsageFile(usage.month), JSON.stringify(usage, null, 2), "utf8");
}

function countBillableChars(text) {
  return Array.from(String(text || "")).length;
}

function getLimitConfig(env) {
  const limitChars = Number(env.GOOGLE_TTS_MONTHLY_LIMIT || DEFAULT_LIMIT);
  const warnAtChars = Number(env.GOOGLE_TTS_WARN_AT || DEFAULT_WARN_AT);
  const hardStop = String(env.GOOGLE_TTS_HARD_STOP || "true").toLowerCase() !== "false";

  return {
    limitChars: Number.isFinite(limitChars) ? limitChars : DEFAULT_LIMIT,
    warnAtChars: Number.isFinite(warnAtChars) ? warnAtChars : DEFAULT_WARN_AT,
    hardStop
  };
}

function buildToast({ usedChars, limitChars, warnAtChars, addedChars, blocked = false }) {
  const nextUsed = usedChars + addedChars;
  const percent = Math.round((nextUsed / limitChars) * 100);

  if (blocked) {
    return {
      tone: "danger",
      message: "TTS ?? ?? ?? ??? ?? ??? ??????. " + usedChars.toLocaleString() + " / " + limitChars.toLocaleString() + "?"
    };
  }

  if (nextUsed >= warnAtChars) {
    return {
      tone: "warning",
      message: "TTS ??? ??: " + nextUsed.toLocaleString() + " / " + limitChars.toLocaleString() + "? (" + percent + "%)"
    };
  }

  return {
    tone: "info",
    message: "TTS ???: " + nextUsed.toLocaleString() + " / " + limitChars.toLocaleString() + "? (" + percent + "%)"
  };
}

export async function GET() {
  const env = readEnv();
  const month = getMonthKey();
  const usage = readUsage(month);
  const config = getLimitConfig(env);

  return NextResponse.json({
    ok: true,
    provider: "google-cloud-tts",
    month,
    usage,
    config,
    remainingChars: Math.max(0, config.limitChars - Number(usage.usedChars || 0)),
    enabled: true
  });
}

export async function POST(request) {
  try {
    const env = readEnv();
    const apiKey = env.GOOGLE_TTS_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "GOOGLE_TTS_API_KEY is required",
          toast: {
            tone: "danger",
            message: "Google TTS ?? ????. GOOGLE_TTS_API_KEY? ?? ?????."
          }
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawText = String(body.text || "").trim();

    if (!rawText) {
      return NextResponse.json(
        { ok: false, error: "text is required" },
        { status: 400 }
      );
    }

    const text = rawText.slice(0, MAX_TEXT_CHARS_PER_REQUEST);
    const addedChars = countBillableChars(text);
    const month = getMonthKey();
    const usage = readUsage(month);
    const config = getLimitConfig(env);

    const usedChars = Number(usage.usedChars || 0);
    const wouldUse = usedChars + addedChars;

    if (config.hardStop && wouldUse > config.limitChars) {
      return NextResponse.json(
        {
          ok: false,
          code: "TTS_MONTHLY_LIMIT_REACHED",
          error: "Google TTS monthly safety limit reached",
          usage,
          config,
          toast: buildToast({
            usedChars,
            addedChars,
            limitChars: config.limitChars,
            warnAtChars: config.warnAtChars,
            blocked: true
          })
        },
        { status: 429 }
      );
    }

    const voiceName = String(body.voiceName || env.GOOGLE_TTS_VOICE || DEFAULT_VOICE);
    const languageCode = String(body.languageCode || env.GOOGLE_TTS_LANGUAGE || DEFAULT_LANGUAGE);
    const speakingRate = Number(body.speakingRate || 1.0);

    const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize?key=" + encodeURIComponent(apiKey), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode,
          name: voiceName
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: Number.isFinite(speakingRate) ? speakingRate : 1.0
        }
      })
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: json?.error?.message || "Google TTS failed: " + res.status,
          details: json,
          toast: {
            tone: "danger",
            message: "Google TTS ?? ??: " + (json?.error?.message || res.status)
          }
        },
        { status: res.status }
      );
    }

    usage.usedChars = usedChars + addedChars;
    usage.requestCount = Number(usage.requestCount || 0) + 1;
    usage.updatedAt = new Date().toISOString();
    usage.voiceName = voiceName;
    usage.languageCode = languageCode;
    usage.limitChars = config.limitChars;
    usage.warnAtChars = config.warnAtChars;

    writeUsage(usage);

    return NextResponse.json({
      ok: true,
      provider: "google-cloud-tts",
      audioContent: json.audioContent || "",
      mimeType: "audio/mpeg",
      addedChars,
      usage,
      config,
      toast: buildToast({
        usedChars,
        addedChars,
        limitChars: config.limitChars,
        warnAtChars: config.warnAtChars
      })
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || String(error),
        toast: {
          tone: "danger",
          message: "Google TTS ?? ? ??: " + (error.message || String(error))
        }
      },
      { status: 500 }
    );
  }
}
