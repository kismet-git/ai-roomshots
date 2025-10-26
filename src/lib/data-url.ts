const DATA_URL_REGEX = /^data:(?<mime>[^;]+);base64,(?<data>.+)$/;

export interface ParsedDataUrl {
  mime: string;
  base64: string;
  buffer: Buffer;
}

export function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const match = DATA_URL_REGEX.exec(dataUrl);
  if (!match?.groups?.mime || !match?.groups?.data) {
    throw new Error("Invalid data URL");
  }
  const base64 = match.groups.data;
  const buffer = Buffer.from(base64, "base64");
  return {
    mime: match.groups.mime,
    base64,
    buffer
  };
}

export function dataUrlSizeInBytes(dataUrl: string): number {
  return parseDataUrl(dataUrl).buffer.length;
}
