export const ERROR_MESSAGES: Record<string, string> = {
  ROOM_NOT_FOUND: "ไม่พบห้องนี้",
  INVALID_ROOM_ID: "รหัสห้องไม่ถูกต้อง",
  GAME_ALREADY_STARTED: "เกมเริ่มไปแล้ว ไม่สามารถเข้าร่วมได้",
  ROOM_FULL: "ห้องเต็มแล้ว",
  JOIN_METHOD_NOT_ALLOWED: "เกมนี้ไม่เปิดให้เข้าร่วมด้วยช่องทางนี้",
  RECORDING_DISABLED: "เกมนี้ไม่ได้เปิดการอัดคลิป",
  LINE_TOKEN_INVALID: "กรุณาลองใหม่อีกครั้ง",
  LINE_AUTH_FAILED: "ระบบ LINE ขัดข้อง กรุณาลองใหม่ภายหลัง",
  LINE_PROFILE_UNAVAILABLE: "ไม่สามารถดึงข้อมูลโปรไฟล์ LINE ได้",
  INVALID_ROUND: "ข้อมูลรอบไม่ตรงกัน กรุณาลองใหม่",
  ROUND_NOT_ACTIVE: "ยังไม่ถึงเวลาตอบ",
  ROUND_EXPIRED: "หมดเวลาแล้ว",
  AVATAR_UPLOAD_NOT_ALLOWED: "เกมเริ่มไปแล้ว ไม่สามารถเปลี่ยนรูปได้",
  EMOJI_NOT_ALLOWED: "เกมเริ่มไปแล้ว ไม่สามารถส่งอิโมจิได้",
  ValidationError: "กรุณาเลือกไฟล์ JPEG, PNG หรือ WebP ขนาดไม่เกิน 5MB",
};

const GENERIC_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

const ROOM_NOT_FOUND_CODES = new Set(["ROOM_NOT_FOUND", "INVALID_ROOM_ID"]);

export const ROOM_CODE_NOT_FOUND_MESSAGE = "ไม่พบหมายเลขห้อง";

export function isRoomNotFound(code: string): boolean {
  return ROOM_NOT_FOUND_CODES.has(code);
}

export function mapErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? GENERIC_ERROR_MESSAGE;
}

// "Conflict" (409, a host action attempted from the wrong room state — e.g. a
// double-tapped "start game"/"next round"/"close room") and "GAME_FINISHED" are
// deliberately absent from ERROR_MESSAGES above: they're meant to be silent
// no-ops, since the UI self-corrects on the next poll. Call sites for host
// actions should check this before falling back to a toast.
export function isBenignConflict(code: string): boolean {
  return code === "Conflict" || code === "GAME_FINISHED";
}
