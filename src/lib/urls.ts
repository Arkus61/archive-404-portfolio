const configuredBaseUrl = import.meta.env.BASE_URL;

export const baseUrl = configuredBaseUrl.endsWith("/")
  ? configuredBaseUrl
  : `${configuredBaseUrl}/`;

export function homeUrl(fragment?: string): string {
  return fragment ? `${baseUrl}#${fragment.replace(/^#/, "")}` : baseUrl;
}
