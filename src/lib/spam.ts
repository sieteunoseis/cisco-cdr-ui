// A real external DID, not a short internal extension — spam-checking
// assumes NANP (10 digits, or 11 starting with 1) since that's what the
// backend's E.164 conversion supports.
export function isCheckableNumber(number: string): boolean {
  const digits = number.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits[0] === "1");
}
