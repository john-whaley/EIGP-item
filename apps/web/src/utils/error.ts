export function extractErrorMessage(error: unknown, fallback: string) {
  const responseMessage = (error as any)?.response?.data?.message;

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage;
  }

  if (Array.isArray(responseMessage) && responseMessage.length) {
    return responseMessage
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join('；');
  }

  if (responseMessage && typeof responseMessage === 'object') {
    const nestedValues = Object.values(responseMessage)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (nestedValues.length) {
      return nestedValues.join('；');
    }
  }

  const directMessage = (error as any)?.message;
  if (typeof directMessage === 'string' && directMessage.trim()) {
    return directMessage;
  }

  return fallback;
}
