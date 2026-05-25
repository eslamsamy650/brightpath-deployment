export function parseApiError(res, json = {}, fallbackMessage = 'Request failed') {
  const status = res?.status;
  const message = json.message || fallbackMessage;

  if (status === 401) {
    return new Error('انتهت الجلسة — يرجى تسجيل الدخول مرة أخرى');
  }
  if (status === 403) {
    return new Error('غير مسموح — ليس لديك صلاحية لهذه العملية');
  }
  if (status === 404) {
    return new Error(message || 'العنصر غير موجود');
  }
  if (status === 422) {
    return new Error(message || 'بيانات غير صالحة');
  }
  if (status >= 500) {
    return new Error('خطأ في الخادم — حاول مرة أخرى لاحقاً');
  }
  return new Error(message);
}

export async function unwrapApiResponse(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw parseApiError(res, json, fallbackMessage);
  }
  return { data: json.data, meta: json.meta };
}
