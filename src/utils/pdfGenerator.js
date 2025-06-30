import { PDFDocument, rgb } from 'pdf-lib';

// Standard Magic card dimensions (2.5" x 3.5")
const CARD_WIDTH = 2.5 * 72; // Convert inches to points (72 points per inch)
const CARD_HEIGHT = 3.5 * 72;

// Page dimensions (A4)
const PAGE_WIDTH = 8.5 * 72; // 8.5 inches
const PAGE_HEIGHT = 11 * 72; // 11 inches

// Margins (minimal)
const MARGIN_X = 0.25 * 72; // 0.25 inches
const MARGIN_Y = 0.25 * 72;

// Calculate grid spacing
const GRID_WIDTH = PAGE_WIDTH - (2 * MARGIN_X);
const GRID_HEIGHT = PAGE_HEIGHT - (2 * MARGIN_Y);
const CARD_SPACING_X = (GRID_WIDTH - (3 * CARD_WIDTH)) / 2;
const CARD_SPACING_Y = (GRID_HEIGHT - (3 * CARD_HEIGHT)) / 2;

export const generatePDF = async (cards) => {
  const pdfDoc = await PDFDocument.create();
  
  // Process cards in groups of 9 (3x3 grid per page)
  for (let i = 0; i < cards.length; i += 9) {
    const pageCards = cards.slice(i, i + 9);
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    
    // Add cards to the page
    for (let j = 0; j < pageCards.length; j++) {
      const card = pageCards[j];
      const row = Math.floor(j / 3);
      const col = j % 3;
      
      const x = MARGIN_X + (col * (CARD_WIDTH + CARD_SPACING_X));
      const y = PAGE_HEIGHT - MARGIN_Y - CARD_HEIGHT - (row * (CARD_HEIGHT + CARD_SPACING_Y));
      
      // Draw card border
      page.drawRectangle({
        x,
        y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 2,
        color: rgb(0.98, 0.98, 0.98),
      });
      
      // Draw card name
      page.drawText(card.name, {
        x: x + 10,
        y: y + CARD_HEIGHT - 30,
        size: 12,
        color: rgb(0.1, 0.1, 0.1),
        maxWidth: CARD_WIDTH - 20,
      });
      
      // Draw set information
      page.drawText(`${card.set} #${card.collectorNumber}`, {
        x: x + 10,
        y: y + 20,
        size: 8,
        color: rgb(0.4, 0.4, 0.4),
        maxWidth: CARD_WIDTH - 20,
      });
      
      // Draw card type indicator (simplified)
      const cardType = card.name.includes('Land') ? 'Land' : 'Spell';
      page.drawText(cardType, {
        x: x + 10,
        y: y + CARD_HEIGHT / 2,
        size: 10,
        color: rgb(0.3, 0.3, 0.3),
        maxWidth: CARD_WIDTH - 20,
      });
    }
  }
  
  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

export const downloadPDF = (pdfBytes, filename = 'mtg-deck.pdf') => {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}; 