export function fallbackCopyTextToClipboard(text: string) {
  var textArea = document.createElement("textarea");

  textArea.value = text;

  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  document.body.removeChild(textArea);
}

export async function copyTextToClipboard(text: string) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);

    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    fallbackCopyTextToClipboard(text);
  }
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function addDays(arg0: Date, arg1: number): any {
  const date = new Date(arg0);

  date.setDate(date.getDate() + arg1);

  return date;
}
