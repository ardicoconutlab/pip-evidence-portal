export function normaliseSingaporePhone(input: string): string | null {
  const digits = input.replace(/[^0-9+]/g, "");
  const local = digits.startsWith("+65")
    ? digits.slice(3)
    : digits.startsWith("65") && digits.length === 10
      ? digits.slice(2)
      : digits;

  if (!/^[3689][0-9]{7}$/.test(local)) return null;
  return `+65${local}`;
}

export function formatSingaporePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^65/, "");
  return digits.length === 8
    ? `+65 ${digits.slice(0, 4)} ${digits.slice(4)}`
    : phone;
}
