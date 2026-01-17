export const formatPhone = (value: string) => {
    if (!value) return value;
    const digits = value.replace(/\D/g, '');

    // Limit to 11 digits
    const cleaned = digits.slice(0, 11);

    if (cleaned.length <= 2) {
        return cleaned;
    }
    if (cleaned.length <= 6) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    }
    if (cleaned.length <= 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
};

export const unmaskPhone = (value: string) => {
    return value.replace(/\D/g, '');
};

export const isWhatsAppValid = (value: string) => {
    if (!value) return false;
    const digits = unmaskPhone(value);
    // Standard Brazilian mobile: 11 digits (DD + 9 + 8 digits)
    // or sometimes 10 digits for older systems, but usually 11 for modern WhatsApp
    return digits.length >= 10 && digits.length <= 11;
};

export const getWhatsAppLink = (value: string) => {
    if (!value) return '';
    const digits = unmaskPhone(value);

    // If it doesn't have country code, assume Brazil (+55)
    const phoneWithCountryCode = digits.length <= 11 ? `55${digits}` : digits;

    return `https://wa.me/${phoneWithCountryCode}`;
};
