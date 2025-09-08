import { useCallback, useState } from "react";
import type { z } from "zod";

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function useFormValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback((data: unknown) => {
    setIsValidating(true);
    const result = schema.safeParse(data);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        if (error.path.length > 0) {
          const field = error.path[0] as string;
          fieldErrors[field] = error.message;
        }
      });
      setErrors(fieldErrors);
      setIsValidating(false);
      return { success: false, data: null, errors: fieldErrors };
    }

    setErrors({});
    setIsValidating(false);
    return { success: true, data: result.data, errors: {} };
  }, [schema]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  return {
    errors,
    isValidating,
    validate,
    clearErrors,
    setFieldError,
  };
}
