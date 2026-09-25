export function sanitizeInput(value: string): string {
  if (!value) return value;
  return value
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/['";\\]/g, "")
    .slice(0, 500);
}

export function sanitizeNumber(value: string): string {
  return value.replace(/[^0-9.-]/g, "");
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { valid: boolean; message: string } {
  if (!password) return { valid: false, message: "Password is required" };
  if (password.length < 8) return { valid: false, message: "Password must be at least 8 characters" };
  if (password.length > 200) return { valid: false, message: "Password exceeds maximum length" };
  return { valid: true, message: "" };
}

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}
