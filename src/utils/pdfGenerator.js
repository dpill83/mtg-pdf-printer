import { PDFDocument } from 'pdf-lib';

// Standard Magic card dimensions (2.5" x 3.5")
const CARD_WIDTH = 2.5 * 72; // 180pt
const CARD_HEIGHT = 3.5 * 72; // 252pt

// US Letter dimensions (8.5" x 11")
const PAGE_WIDTH = 8.5 * 72; // 612pt
const PAGE_HEIGHT = 11 * 72; // 792pt

// Margins (minimal for cutting)
const MARGIN_X = 0.25 * 72; // 18pt
const MARGIN_Y = 0.25 * 72; // 18pt

// Calculate grid spacing
const GRID_WIDTH = PAGE_WIDTH - (2 * MARGIN_X);
const GRID_HEIGHT = PAGE_HEIGHT - (2 * MARGIN_Y);
const CARD_SPACING_X = (GRID_WIDTH - (3 * CARD_WIDTH)) / 2;
const CARD_SPACING_Y = (GRID_HEIGHT - (3 * CARD_HEIGHT)) / 2;

export const generatePDF = async (cards) => {
  const pdfDoc = await PDFDocument.create();

  // Pre-fetch all images as Uint8Array
  const imageBytesArr = await Promise.all(
    cards.map(async (card) => {
      const response = await fetch(card.imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    })
  );

  for (let i = 0; i < cards.length; i += 9) {
    const pageCards = cards.slice(i, i + 9);
    const pageImages = imageBytesArr.slice(i, i + 9);
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    for (let j = 0; j < pageCards.length; j++) {
      const imgBytes = pageImages[j];
      // Embed image (assume PNG)
      const img = await pdfDoc.embedPng(imgBytes);
      const row = Math.floor(j / 3);
      const col = j % 3;
      const x = MARGIN_X + (col * (CARD_WIDTH + CARD_SPACING_X));
      const y = PAGE_HEIGHT - MARGIN_Y - CARD_HEIGHT - (row * (CARD_HEIGHT + CARD_SPACING_Y));
      page.drawImage(img, {
        x,
        y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  // Return as Blob for download
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

export const downloadPDF = (pdfBlob, filename = 'mtg-deck.pdf') => {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}; 