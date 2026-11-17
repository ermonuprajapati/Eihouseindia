/**
 * Utility functions for safely handling and normalizing image URLs across the website
 */

export function normalizeImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const url = rawUrl.trim();
  if (!url) return '';

  // Handle Google Drive links
  const gdriveMatch1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdriveMatch1 && gdriveMatch1[1]) {
    return `https://drive.google.com/thumbnail?id=${gdriveMatch1[1]}&sz=w1000`;
  }
  const gdriveMatch2 = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (gdriveMatch2 && gdriveMatch2[1]) {
    return `https://drive.google.com/thumbnail?id=${gdriveMatch2[1]}&sz=w1000`;
  }
  const gdriveMatch3 = url.match(/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/);
  if (gdriveMatch3 && gdriveMatch3[1]) {
    return `https://drive.google.com/thumbnail?id=${gdriveMatch3[1]}&sz=w1000`;
  }

  // Handle Dropbox links
  if (url.includes('dropbox.com') && url.includes('dl=0')) {
    return url.replace('dl=0', 'raw=1');
  }

  // Handle protocol-relative URLs
  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  return url;
}
