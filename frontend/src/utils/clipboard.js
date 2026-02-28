export const fallbackCopy = (text) => {
  try {
    // Fallback for older browsers without navigator.clipboard support (execCommand is deprecated).
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(ta);
    return copied;
  } catch {
    return false;
  }
};

export const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return 'success';
    } catch (err) {
      if (err?.name === 'NotAllowedError') return 'denied';
      return fallbackCopy(text) ? 'success' : 'failed';
    }
  }
  return fallbackCopy(text) ? 'success' : 'failed';
};
