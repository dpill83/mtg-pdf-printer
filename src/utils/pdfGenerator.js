import { PDFDocument } from 'pdf-lib';

// MTGPrint default settings for Letter paper (8.5" x 11") at 300 DPI
// Letter page: 8.5" x 11" = 2550 x 3300 pixels at 300 DPI
const LETTER_WIDTH_INCHES = 8.5;
const LETTER_HEIGHT_INCHES = 11.0;
const DPI = 300;

// Standard Magic card dimensions: 2.5" x 3.5" = 750 x 1050 pixels at 300 DPI
const CARD_WIDTH_INCHES = 2.5;
const CARD_HEIGHT_INCHES = 3.5;

// Convert to points (1 inch = 72 points, 1 inch = 300 pixels at 300 DPI)
const POINTS_PER_INCH = 72;
const PIXELS_PER_INCH = DPI;

// Page dimensions in points
const PAGE_WIDTH_POINTS = LETTER_WIDTH_INCHES * POINTS_PER_INCH;  // 612pt
const PAGE_HEIGHT_POINTS = LETTER_HEIGHT_INCHES * POINTS_PER_INCH; // 792pt

// Card dimensions in points
const CARD_WIDTH_POINTS = CARD_WIDTH_INCHES * POINTS_PER_INCH;  // 180pt
const CARD_HEIGHT_POINTS = CARD_HEIGHT_INCHES * POINTS_PER_INCH; // 252pt

// Calculate margins to center 3x3 grid on Letter page
// Total grid width: 3 cards * 180pt = 540pt
// Total grid height: 3 cards * 252pt = 756pt
// Available space: 612pt x 792pt
// Margins: (612 - 540) / 2 = 36pt horizontal, (792 - 756) / 2 = 18pt vertical
const MARGIN_X = (PAGE_WIDTH_POINTS - (3 * CARD_WIDTH_POINTS)) / 2;  // 36pt
const MARGIN_Y = (PAGE_HEIGHT_POINTS - (3 * CARD_HEIGHT_POINTS)) / 2; // 18pt

// No gutter needed since cards are exactly sized to fit 3x3 grid
const GUTTER_X = 0;
const GUTTER_Y = 0;

export const generatePDF = async (cards, paper = { width: 8.5, height: 11.0 }, scale = 100, options = {}) => {
  // Use default Letter paper dimensions
  const pageWidth = PAGE_WIDTH_POINTS;
  const pageHeight = PAGE_HEIGHT_POINTS;

  // Apply scale factor (90-110% range)
  const scaleFactor = Math.max(90, Math.min(Number(scale), 110)) / 100;
  const cardWidth = CARD_WIDTH_POINTS * scaleFactor;
  const cardHeight = CARD_HEIGHT_POINTS * scaleFactor;

  // Recalculate margins for scaled cards to maintain centering
  const scaledMarginX = (pageWidth - (3 * cardWidth)) / 2;
  const scaledMarginY = (pageHeight - (3 * cardHeight)) / 2;

  const pdfDoc = await PDFDocument.create();

  // Pre-fetch all images as Uint8Array
  const imageBytesArr = await Promise.all(
    cards.map(async (card) => {
      try {
        const response = await fetch(card.imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (error) {
        console.error(`Failed to fetch image for ${card.name}:`, error);
        return null;
      }
    })
  );

  // Process cards in groups of 9 (3x3 grid per page)
  for (let i = 0; i < cards.length; i += 9) {
    const pageCards = cards.slice(i, i + 9);
    const pageImages = imageBytesArr.slice(i, i + 9);
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Place cards in 3x3 grid, left-to-right, top-to-bottom
    for (let j = 0; j < pageCards.length; j++) {
      const imgBytes = pageImages[j];
      if (!imgBytes) continue; // Skip if image failed to load

      try {
        // Embed image (assume PNG)
        const img = await pdfDoc.embedPng(imgBytes);
        
        // Calculate grid position (0-2 for row and column)
        const row = Math.floor(j / 3);
        const col = j % 3;
        
        // Calculate card position (PDF coordinates: bottom-left origin)
        const x = scaledMarginX + (col * cardWidth);
        const y = pageHeight - scaledMarginY - cardHeight - (row * cardHeight);
        
        // Draw the card image
        page.drawImage(img, {
          x,
          y,
          width: cardWidth,
          height: cardHeight,
        });
      } catch (error) {
        console.error(`Failed to embed image for ${pageCards[j].name}:`, error);
      }
    }

    // TODO: Add crop marks, cut lines, and watermarks based on options
    // if (options.cropMarks) { ... }
    // if (options.cutLines) { ... }
    // if (options.playtestWatermark) { ... }
  }

  const pdfBytes = await pdfDoc.save();
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