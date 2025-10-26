export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Unsupported file reader result"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unknown file reader error"));
    reader.readAsDataURL(file);
  });
}

export function validateFileSize(file: File, maxMb: number): void {
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File exceeds ${maxMb} MB limit`);
  }
}
