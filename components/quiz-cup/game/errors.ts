import { ApiError } from "@/lib/errors";
import { mapErrorMessage } from "@/lib/rooms/error-messages";

const QUIZ_CUP_MESSAGES: Record<string, string> = {
  "Not enough energy": "พลังงานไม่พอ",
  "Not enough questions for these settings":
    "คำถามในคลังไม่พอสำหรับการตั้งค่านี้ ลองลดจำนวนข้อ หรือเปลี่ยนหมวด / ความยาก",
  "Only one tactic per question: fifty was already used":
    "ข้อนี้ใช้ตัดตัวเลือกไปแล้ว ใช้ Tactic อื่นเพิ่มไม่ได้",
  "That choice was removed by fifty": "ตัวเลือกนี้ถูกตัดออกไปแล้ว",
};

export function quizCupErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return mapErrorMessage("UNKNOWN");
  if (error.code === "ALREADY_SUBMITTED") return "ส่งคำตอบข้อนี้ไปแล้ว";
  return QUIZ_CUP_MESSAGES[error.message] ?? mapErrorMessage(error.code);
}
