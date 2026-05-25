/**
 * Shared load/error banner with optional retry (RTL-friendly).
 */
export function LoadErrorBanner({ title = 'تعذر التحميل', message, onRetry, retryLabel = 'إعادة المحاولة' }) {
  if (!message) return null;

  return (
    <div className="load-error-banner" role="alert">
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="students-button" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
