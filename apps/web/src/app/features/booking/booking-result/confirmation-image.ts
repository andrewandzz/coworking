type QrMatrix = readonly (readonly boolean[])[];

interface ConfirmationDetails {
  readonly bookingNumber: string;
  readonly spaceLabel: string;
  readonly date: string;
  readonly time: string;
}

const FONT = '"Manrope Variable", system-ui, sans-serif';

export function createQrPng(document: Document, matrix: QrMatrix): string | null {
  const moduleSize = 8;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = matrix.length * moduleSize;
  const context = canvas.getContext('2d');
  if (!context) return null;

  drawQr(context, matrix, 0, 0, moduleSize);
  return canvas.toDataURL('image/png');
}

export function createConfirmationPng(
  document: Document,
  matrix: QrMatrix,
  details: ConfirmationDetails,
): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 660;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = '#f6f1eb';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.fillStyle = '#222821';
  context.font = `700 52px ${FONT}`;
  context.fillText('Бронювання підтверджено!', canvas.width / 2, 105, 1060);
  context.fillStyle = '#626b61';
  context.font = `400 30px ${FONT}`;
  context.fillText('Дякуємо! Ваше місце успішно заброньовано.', canvas.width / 2, 170, 1060);

  const qrSize = 336;
  const qrLeft = 70;
  const qrTop = 234;
  const moduleSize = Math.floor(qrSize / matrix.length);
  const inset = Math.floor((qrSize - matrix.length * moduleSize) / 2);
  context.fillStyle = '#fff';
  context.fillRect(qrLeft, qrTop, qrSize, qrSize);
  drawQr(context, matrix, qrLeft + inset, qrTop + inset, moduleSize);

  const textLeft = 454;
  const textWidth = canvas.width - textLeft - 70;
  context.textAlign = 'start';
  context.fillStyle = '#222821';
  context.font = `700 36px ${FONT}`;
  context.fillText(`№ бронювання: ${details.bookingNumber}`, textLeft, 285, textWidth);
  context.fillText(details.spaceLabel, textLeft, 359, textWidth);
  context.font = `400 34px ${FONT}`;
  context.fillText(details.date, textLeft, 433, textWidth);
  context.font = `700 36px ${FONT}`;
  context.fillText(details.time, textLeft, 507, textWidth);

  return canvas.toDataURL('image/png');
}

function drawQr(
  context: CanvasRenderingContext2D,
  matrix: QrMatrix,
  left: number,
  top: number,
  moduleSize: number,
): void {
  const size = matrix.length * moduleSize;
  context.fillStyle = '#fff';
  context.fillRect(left, top, size, size);
  context.fillStyle = '#000';
  matrix.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) context.fillRect(left + x * moduleSize, top + y * moduleSize, moduleSize, moduleSize);
    });
  });
}
