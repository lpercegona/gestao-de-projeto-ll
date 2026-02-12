export const getWysiwygPlainText = (content?: string | null): string => {
  if (!content) return '';

  const withLineBreaks = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ');

  const withoutTags = withLineBreaks.replace(/<[^>]*>/g, ' ');

  const decoded = typeof window !== 'undefined'
    ? (() => {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = withoutTags;
        return textarea.value;
      })()
    : withoutTags;

  return decoded.replace(/\u00a0/g, ' ').replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
};

