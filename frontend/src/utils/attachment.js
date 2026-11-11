/**
 * Shared helpers for handling both newly uploaded File/Blob objects
 * and saved base64 attachment objects ({ name, type, data }).
 */

export const isPdfAttachment = (file) => {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  const data = typeof file.data === 'string' ? file.data.toLowerCase() : '';
  return name.endsWith('.pdf') || type.includes('pdf') || data.startsWith('data:application/pdf');
};

export const isImageAttachment = (file) => {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  const data = typeof file.data === 'string' ? file.data.toLowerCase() : '';
  return (
    type.startsWith('image/') ||
    data.startsWith('data:image/') ||
    /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name)
  );
};

export const getAttachmentBlobUrl = (file) => {
  if (!file) return null;
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    return URL.createObjectURL(file);
  }
  const rawData = file.data;
  if (!rawData || typeof rawData !== 'string') return null;
  if (rawData.startsWith('blob:') || rawData.startsWith('http://') || rawData.startsWith('https://')) {
    return rawData;
  }
  try {
    const isPdf = isPdfAttachment(file);
    const defaultMime = isPdf ? 'application/pdf' : 'image/png';
    let mime = file.type || defaultMime;
    let base64String = rawData;
    if (rawData.includes(',')) {
      const parts = rawData.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match && match[1]) {
        mime = match[1];
      }
      base64String = parts[1];
    }
    base64String = base64String.replace(/\s/g, '');
    const byteCharacters = atob(base64String);
    const sliceSize = 1024;
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    const blob = new Blob(byteArrays, { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to create blob URL for attachment:', err);
    return rawData;
  }
};

