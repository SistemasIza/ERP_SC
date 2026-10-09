const countryCodes = ['1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '88', '91', '92', '93', '94', '95', '98'];

export interface PhoneFormatted {
  prefix: string;
  number: string;
  full: string;
}

export function formatPhoneNumber(phone: string): PhoneFormatted {
  if (!phone) return { prefix: '', number: '', full: '' };

  let clean = String(phone).trim();
  clean = clean.replace(/@c\.us$/i, '').replace(/@s\.whatsapp\.net$/i, '').replace(/@g\.us$/i, '').replace(/@whatsapp\.net$/i, '');
  clean = clean.replace(/[^\d+]/g, '');

  if (!clean) return { prefix: '', number: '', full: '' };

  if (clean.startsWith('+')) {
    const match = clean.match(/^\+(\d{1,3})(.*)$/);
    if (match) {
      const potential = match[1];
      if (countryCodes.includes(potential)) {
        return { prefix: '+' + potential, number: match[2].trim(), full: '+' + potential + ' ' + match[2].trim() };
      }
      if (potential.length === 3) {
        const two = potential.substring(0, 2);
        if (countryCodes.includes(two)) {
          return { prefix: '+' + two, number: potential.substring(2) + match[2].trim(), full: '+' + two + ' ' + potential.substring(2) + match[2].trim() };
        }
      }
    }
  }

  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 10) {
    for (const code of countryCodes.sort((a, b) => b.length - a.length)) {
      if (digits.startsWith(code)) {
        const remaining = digits.length - code.length;
        if (remaining >= 8 && remaining <= 10) {
          return { prefix: '+' + code, number: digits.substring(code.length), full: '+' + code + ' ' + digits.substring(code.length) };
        }
      }
    }
  }

  return { prefix: '', number: clean, full: clean };
}

export function formatPhoneDisplay(phone: string): string {
  const { full } = formatPhoneNumber(phone);
  return full || phone || '';
}

export function getPhoneLocal(phone: string): string {
  const { number } = formatPhoneNumber(phone);
  return number || phone || '';
}
