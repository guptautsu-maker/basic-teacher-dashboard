import React from 'react';
import { SensitiveDataValidationResult, SensitiveDataViolation } from '../types/settingsAndPrivacy';
import { validateSensitiveData } from '../utils/privacyAndSecurityManager';

interface SensitiveDataAlertProps {
  validationResult?: SensitiveDataValidationResult | null;
  validation?: SensitiveDataValidationResult | null;
  onDismiss?: () => void;
}

export const SensitiveDataAlert: React.FC<SensitiveDataAlertProps> = ({
  validationResult,
  validation,
  onDismiss,
}) => {
  const result = validationResult || validation;
  if (!result || result.isValid) return null;

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-500 text-rose-900 dark:text-rose-100 shadow-md space-y-2 animate-shake">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⛔</span>
          <h4 className="font-extrabold text-sm sm:text-base text-rose-800 dark:text-rose-200 m-0">
            डेटा प्राइवेसी व सुरक्षा चेतावनी (DPDP Act 2023 Violation)
          </h4>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        {result.violations.map((violation: SensitiveDataViolation, idx: number) => (
          <div key={idx} className="p-2.5 rounded-xl bg-white/70 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800">
            <div className="font-bold text-rose-900 dark:text-rose-100 flex items-center gap-1.5">
              <span>{violation.type === 'aadhaar' ? '🆔 12-अंकीय आधार नंबर पहचाना गया:' : '🔑 पासवर्ड / क्रेडेंशियल पहचाना गया:'}</span>
              <code className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-mono text-[11px]">
                {violation.matchedSnippet}
              </code>
            </div>
            <p className="mt-1 text-rose-800 dark:text-rose-200 leading-relaxed font-medium">
              {violation.messageHi}
            </p>
          </div>
        ))}
      </div>

      <div className="pt-1 flex items-center justify-between text-[11px] text-rose-700 dark:text-rose-300 font-semibold">
        <span>🔒 यह प्रविष्टि सेव होने से रोक दी गई है (Submission Blocked)।</span>
        <span>UIDAI & DPDP 2023 Protected</span>
      </div>
    </div>
  );
};

/**
 * Reusable React Hook for form inputs to enforce sensitive data blocking.
 */
export const useSensitiveDataGuard = () => {
  const [validation, setValidation] = React.useState<SensitiveDataValidationResult | null>(null);

  const check = (text: string): boolean => {
    const res = validateSensitiveData(text);
    if (!res.isValid) {
      setValidation(res);
      return false; // Invalid
    }
    setValidation(null);
    return true; // Valid
  };

  const clear = () => setValidation(null);

  return {
    validation,
    check,
    clear,
    isBlocked: Boolean(validation && !validation.isValid),
  };
};
