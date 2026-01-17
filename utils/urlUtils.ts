export const sanitizeUrl = (url: string | null | undefined): string => {
    if (!url) return '';

    // Remove whitespace
    const cleanedUrl = url.trim();

    // 1. Allow data:image/ for base64 images
    if (cleanedUrl.toLowerCase().startsWith('data:image/')) {
        return cleanedUrl;
    }

    // 2. Allow absolute URLs (http/https)
    if (/^https?:\/\//i.test(cleanedUrl)) {
        return cleanedUrl;
    }

    // 3. Allow relative paths
    if (cleanedUrl.startsWith('/') || cleanedUrl.startsWith('./') || cleanedUrl.startsWith('../')) {
        return cleanedUrl;
    }

    // 4. Block everything else (javascript:, vbscript:, file:, etc.)
    return '';
};
