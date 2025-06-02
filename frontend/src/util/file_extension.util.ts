export function getMimeTypeFromExtension(extension: string) {
  const mimeTypeMap = {
    // Image formats
    heic: 'image/heic',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',

    // Video formats
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mpeg: 'video/mpeg',
    mov: 'video/quicktime',
    webm: 'video/webm',

    // PDF format
    pdf: 'application/pdf',
  };

  extension = extension.toLowerCase();

  return mimeTypeMap[extension];
}

export function getExtensionFromURL(url: string) {
  const match = url.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
  if (match) {
    return match[1].toLowerCase();
  }
  return null;
}
