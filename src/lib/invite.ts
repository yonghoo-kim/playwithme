import { customAlphabet } from "nanoid";

// Alphanumeric only (no "-"/"_") so invite codes read cleanly in a URL and
// in the "코드가 올바르지 않아요" manual-entry flow.
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const generateCode = customAlphabet(ALPHABET, 8);

export function generateInviteCode(): string {
  return generateCode();
}

export async function createUniqueInviteCode(
  checkExists: (code: string) => Promise<boolean>
): Promise<string> {
  let code = generateInviteCode();
  while (await checkExists(code)) {
    code = generateInviteCode();
  }
  return code;
}
