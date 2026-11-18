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

export const isExcelAttachment = (file) => {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  const data = typeof file.data === 'string' ? file.data.toLowerCase() : '';
  return (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.csv') ||
    type.includes('spreadsheet') ||
    type.includes('excel') ||
    type.includes('csv') ||
    data.startsWith('data:application/vnd.openxmlformats-officedocument.spreadsheetml') ||
    data.startsWith('data:application/vnd.ms-excel') ||
    data.startsWith('data:text/csv')
  );
};

export const isWordAttachment = (file) => {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  const data = typeof file.data === 'string' ? file.data.toLowerCase() : '';
  return (
    name.endsWith('.docx') ||
    name.endsWith('.doc') ||
    type.includes('word') ||
    type.includes('wordprocessingml') ||
    data.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml') ||
    data.startsWith('data:application/msword')
  );
};

export const isImageAttachment = (file) => {
  if (!file) return false;
  if (isPdfAttachment(file) || isExcelAttachment(file) || isWordAttachment(file)) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  const data = typeof file.data === 'string' ? file.data.toLowerCase() : '';
  return (
    type.startsWith('image/') ||
    data.startsWith('data:image/') ||
    /\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)$/i.test(name)
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
    const name = (file.name || '').toLowerCase();

    let defaultMime = 'image/png';
    if (isPdf) {
      defaultMime = 'application/pdf';
    } else if (name.endsWith('.xlsx')) {
      defaultMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (name.endsWith('.xls')) {
      defaultMime = 'application/vnd.ms-excel';
    } else if (name.endsWith('.csv')) {
      defaultMime = 'text/csv';
    } else if (name.endsWith('.docx')) {
      defaultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (name.endsWith('.doc')) {
      defaultMime = 'application/msword';
    }

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

