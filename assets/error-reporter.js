const $ = selector => document.querySelector(selector);

function serializeError(error, context = 'Application') {
  const now = new Date().toISOString();
  const locationText = `${location.href}\nUser agent: ${navigator.userAgent}`;
  if (error instanceof Error) {
    return `[${context}] ${now}\n${error.name}: ${error.message}\n${error.stack || ''}\n${locationText}`;
  }
  if (typeof error === 'object' && error) {
    let json;
    try { json = JSON.stringify(error, null, 2); } catch { json = String(error); }
    return `[${context}] ${now}\n${json}\n${locationText}`;
  }
  return `[${context}] ${now}\n${String(error || 'Unknown error')}\n${locationText}`;
}

export function reportError(error, context = 'Application') {
  const details = serializeError(error, context);
  console.error(context, error);
  const modal = $('#errorModal');
  const output = $('#errorDetails');
  if (output) output.value = details;
  if (modal) {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }
  return details;
}

export function installErrorReporter(showToast = () => {}) {
  $('#closeErrorModal')?.addEventListener('click', () => {
    $('#errorModal')?.classList.remove('show');
    $('#errorModal')?.setAttribute('aria-hidden', 'true');
  });
  $('#copyErrorBtn')?.addEventListener('click', async () => {
    const text = $('#errorDetails')?.value || '';
    try { await navigator.clipboard.writeText(text); }
    catch { $('#errorDetails')?.select(); document.execCommand('copy'); }
    showToast('تم نسخ تفاصيل الخطأ');
  });
  window.addEventListener('error', event => reportError(event.error || event.message, 'Unhandled window error'));
  window.addEventListener('unhandledrejection', event => reportError(event.reason, 'Unhandled promise rejection'));
}
