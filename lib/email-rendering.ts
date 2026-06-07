export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function applyEmailVariables(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => variables[key] ?? '');
}

export function safeEmailHeaderValue(value: string, maxLength = 300) {
  return value.replace(/[\r\n<>"]/g, '').trim().slice(0, maxLength);
}

export function extractTrackedLinks(html: string) {
  const links: Array<{ placeholder: string; target: string }> = [];
  const rewritten = html.replace(
    /href=(["'])(https?:\/\/[^"']+)\1/gi,
    (_match, quote: string, target: string) => {
      const placeholder = `__PDS_LINK_${links.length}__`;
      links.push({ placeholder, target });
      return `href=${quote}${placeholder}${quote}`;
    },
  );
  return { html: rewritten, links };
}

export function replaceTrackedLink(html: string, placeholder: string, trackingUrl: string) {
  return html.replaceAll(placeholder, escapeHtml(trackingUrl));
}
