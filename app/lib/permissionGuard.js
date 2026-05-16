/**
 * permissionGuard.js
 * Suggest / Edit / Auto 모드별 실제 차단 로직
 */

// 차단할 위험 명령어 패턴
const BLOCKED_COMMANDS = [
  /rm\s+-rf/i,
  /del\s+\/s/i,
  /format\s+/i,
  /git\s+reset\s+--hard/i,
  /git\s+clean\s+-fd/i,
  /Remove-Item\s+-Recurse/i,
  /rmdir\s+\/s/i,
  /mkfs/i,
  /dd\s+if=/i,
  /:\(\)\{:|:&\};:/,
];

// 차단할 민감 파일 패턴
const BLOCKED_FILES = [
  /\.env$/i,
  /\.env\.local$/i,
  /credentials\.json$/i,
  /vault\.json/i,
  /id_rsa$/i,
  /id_ed25519$/i,
  /\.pem$/i,
  /\.key$/i,
  /secrets\//i,
];

/**
 * 명령어가 위험한지 검사
 */
export function checkCommand(command = "") {
  for (const pattern of BLOCKED_COMMANDS) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: "위험 명령어 차단: " + command.slice(0, 80),
      };
    }
  }
  return { allowed: true };
}

/**
 * 파일 경로가 민감한지 검사
 */
export function checkFilePath(filePath = "") {
  for (const pattern of BLOCKED_FILES) {
    if (pattern.test(filePath)) {
      return {
        allowed: false,
        reason: "민감 파일 접근 차단: " + filePath,
      };
    }
  }
  return { allowed: true };
}

/**
 * 모드별 실행 허용 여부 검사
 * mode: "suggest" | "edit" | "auto"
 */
export function checkPermission({ mode = "suggest", action = "", target = "" }) {
  const m = String(mode).toLowerCase().trim();

  // Suggest 모드: 읽기만 허용, 수정/실행 차단
  if (m === "suggest") {
    if (action === "write" || action === "execute") {
      return {
        allowed: false,
        reason: "Suggest 모드에서는 파일 수정과 명령 실행이 차단됩니다.",
        mode,
        action,
      };
    }
  }

  // Edit 모드: 파일 수정 허용, 명령 실행은 승인 필요 표시
  if (m === "edit") {
    if (action === "execute") {
      const cmdCheck = checkCommand(target);
      if (!cmdCheck.allowed) {
        return {
          allowed: false,
          reason: cmdCheck.reason,
          mode,
          action,
        };
      }
      return {
        allowed: true,
        requiresApproval: true,
        reason: "Edit 모드에서 명령 실행은 사용자 승인이 필요합니다.",
        mode,
        action,
      };
    }
    if (action === "write") {
      const fileCheck = checkFilePath(target);
      if (!fileCheck.allowed) {
        return {
          allowed: false,
          reason: fileCheck.reason,
          mode,
          action,
        };
      }
    }
  }

  // Auto 모드: 위험 명령/민감 파일만 차단
  if (m === "auto") {
    if (action === "execute") {
      const cmdCheck = checkCommand(target);
      if (!cmdCheck.allowed) {
        return {
          allowed: false,
          reason: cmdCheck.reason,
          mode,
          action,
        };
      }
    }
    if (action === "write") {
      const fileCheck = checkFilePath(target);
      if (!fileCheck.allowed) {
        return {
          allowed: false,
          reason: fileCheck.reason,
          mode,
          action,
        };
      }
    }
  }

  return { allowed: true, mode, action };
}

/**
 * 프롬프트 앞에 모드별 안전 지시문 추가
 */
export function buildModePrefix(mode = "suggest") {
  const m = String(mode).toLowerCase().trim();

  if (m === "suggest") {
    return [
      "[Suggest 모드]",
      "- 파일을 직접 수정하지 마세요.",
      "- 명령을 실행하지 마세요.",
      "- 분석과 제안만 제공하세요.",
      "",
    ].join("\n");
  }

  if (m === "edit") {
    return [
      "[Edit 모드]",
      "- 파일 수정은 허용됩니다.",
      "- 명령 실행 전 반드시 사용자 승인을 받으세요.",
      "- .env, credentials, secrets 파일은 수정하지 마세요.",
      "",
    ].join("\n");
  }

  if (m === "auto") {
    return [
      "[Auto 모드]",
      "- 허용된 작업만 자동 실행합니다.",
      "- rm -rf, git reset --hard 등 위험 명령은 차단됩니다.",
      "- 민감 파일(.env, credentials)은 수정하지 마세요.",
      "",
    ].join("\n");
  }

  return "";
}