export function truncateString(str: string, maxLength: number, truncateIndicator: string = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - truncateIndicator.length) + truncateIndicator;
}

export function sanitizeHTML(str: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.textContent = str;
  return tempDiv.innerHTML;
}
