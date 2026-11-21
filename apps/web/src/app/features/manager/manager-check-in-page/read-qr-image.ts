export async function readQrImage(file: File): Promise<string | undefined> {
  const { default: jsQR } = await import('jsqr');
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(data, width, height)?.data;
  } finally {
    image.close();
  }
}
