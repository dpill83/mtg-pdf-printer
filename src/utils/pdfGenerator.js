// Use CommonJS require for server-side compatibility
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Polyfill fetch for Node.js environment
if (typeof fetch === 'undefined') {
  const nodeFetch = require('node-fetch');
  global.fetch = nodeFetch;
}

// MTGPrint default settings for Letter paper (8.5" x 11") at 300 DPI
// Letter page: 8.5" x 11" = 2550 x 3300 pixels at 300 DPI
const LETTER_WIDTH_INCHES = 8.5;
const LETTER_HEIGHT_INCHES = 11.0;
const DPI = 300;

// Standard Magic card dimensions: 2.5" x 3.5" = 750 x 1050 pixels at 300 DPI
const CARD_WIDTH_INCHES = 2.5;
const CARD_HEIGHT_INCHES = 3.5;

// Convert to points (1 inch = 72 points)
const POINTS_PER_INCH = 72;

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

const generatePDF = async (cards, paper = { width: 8.5, height: 11.0, unit: 'in' }, scale = 100, options = {}) => {
  // 1. Skip basic lands if option is enabled
  if (options.skipBasicLands) {
    const basicLands = [
      'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'
    ];
    cards = cards.filter(card => !basicLands.includes(card.name));
  }

  // Expand cards array by quantity and handle double-faced cards
  const expandedCards = [];
  for (const card of cards) {
    const qty = card.quantity || 1;
    for (let i = 0; i < qty; i++) {
      // For double-faced cards, add both front and back
      if (card.isDoubleFaced && card.backImageUrl) {
        // Add front face
        expandedCards.push({
          ...card,
          imageUrl: card.imageUrl,
          isBackFace: false
        });
        // Add back face
        expandedCards.push({
          ...card,
          imageUrl: card.backImageUrl,
          isBackFace: true
        });
      } else {
        // Single-faced card
      expandedCards.push(card);
      }
    }
  }
  cards = expandedCards;

  // Determine page dimensions in points
  let widthInches, heightInches;
  if (paper.unit === 'cm') {
    widthInches = paper.width / 2.54;
    heightInches = paper.height / 2.54;
  } else {
    widthInches = paper.width;
    heightInches = paper.height;
  }
  const pageWidth = widthInches * POINTS_PER_INCH;
  const pageHeight = heightInches * POINTS_PER_INCH;

  // Apply scale factor (90-110% range)
  const scaleFactor = Math.max(90, Math.min(Number(scale), 110)) / 100;
  const cardWidth = CARD_WIDTH_POINTS * scaleFactor;
  const cardHeight = CARD_HEIGHT_POINTS * scaleFactor;

  // Dynamically calculate columns and rows that fit on the page
  const numCols = Math.floor(pageWidth / cardWidth);
  const numRows = Math.floor(pageHeight / cardHeight);
  const cardsPerPage = numCols * numRows;

  // Recalculate margins for scaled cards to maintain centering
  const scaledMarginX = (pageWidth - (numCols * cardWidth)) / 2;
  const scaledMarginY = (pageHeight - (numRows * cardHeight)) / 2;

  const pdfDoc = await PDFDocument.create();

  // Pre-load triangle corner images if black corners are enabled
  let triangleImages = null;
  if (options.blackCorners) {
    try {
      const triangleFiles = [
        'triangle_topleft.png',
        'triangle_topright.png',
        'triangle_bottomleft.png',
        'triangle_bottomright.png'
      ];
      
      triangleImages = await Promise.all(
        triangleFiles.map(async (filename) => {
          const filePath = path.join(__dirname, '..', '..', 'public', filename);
          const fileBuffer = fs.readFileSync(filePath);
          return await pdfDoc.embedPng(fileBuffer);
        })
      );
    } catch (error) {
      triangleImages = null;
    }
  }

  // Pre-load playtest watermark image if enabled
  let playtestWatermarkImage = null;
  if (options.playtestWatermark) {
    try {
      const watermarkPath = path.join(__dirname, '..', '..', 'public', 'playtest_watermark.png');
      const watermarkBytes = fs.readFileSync(watermarkPath);
      playtestWatermarkImage = await pdfDoc.embedPng(watermarkBytes);
    } catch (error) {
      playtestWatermarkImage = null;
    }
  }

  // Pre-fetch all images as Uint8Array
  const imageBytesArr = await Promise.all(
    cards.map(async (card) => {
      try {
        const response = await fetch(card.imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (error) {
        return null;
      }
    })
  );

  // Process cards in groups of cardsPerPage (dynamic grid per page)
  for (let i = 0; i < cards.length; i += cardsPerPage) {
    const pageCards = cards.slice(i, i + cardsPerPage);
    const pageImages = imageBytesArr.slice(i, i + cardsPerPage);
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Place cards in grid, left-to-right, top-to-bottom
    for (let j = 0; j < pageCards.length; j++) {
      const imgBytes = pageImages[j];
      if (!imgBytes) continue; // Skip if image failed to load

      try {
        // Embed image (try PNG first, then JPG)
        let img;
        try {
          img = await pdfDoc.embedPng(imgBytes);
        } catch (error) {
          // If PNG fails, try JPG
          img = await pdfDoc.embedJpg(imgBytes);
        }
        
        // Calculate grid position
        const row = Math.floor(j / numCols);
        const col = j % numCols;
        
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

        // Draw Playtest Card watermark PNG if enabled
        if (options.playtestWatermark && playtestWatermarkImage) {
          // Modular watermark config
          const wmScale = 1.0; // 100% of card width
          const wmOpacity = 0.5;
          const wmWidth = cardWidth * wmScale;
          const wmHeight = (playtestWatermarkImage.height / playtestWatermarkImage.width) * wmWidth;
          const wmX = x + (cardWidth - wmWidth) / 2;
          const wmY = y + 4; // 4pt from bottom
          page.drawImage(playtestWatermarkImage, {
            x: wmX,
            y: wmY,
            width: wmWidth,
            height: wmHeight,
            opacity: wmOpacity
          });
        }
      } catch (error) {
        // Continue with next card if image embedding fails
      }
    }

    // Draw black corner triangles above the cards if enabled
    if (options.blackCorners && triangleImages) {
      // Triangle size: 8px = 8/72 = 0.111 inches = 8 points
      const TRIANGLE_SIZE_POINTS = 8;
      
      for (let j = 0; j < pageCards.length; j++) {
        const row = Math.floor(j / numCols);
        const col = j % numCols;
        
        // Calculate card position
        const cardX = scaledMarginX + (col * cardWidth);
        const cardY = pageHeight - scaledMarginY - cardHeight - (row * cardHeight);
        
        // Draw triangle corners at each corner of the card
        // Top-left corner
        page.drawImage(triangleImages[0], {
          x: cardX,
          y: cardY + cardHeight - TRIANGLE_SIZE_POINTS,
          width: TRIANGLE_SIZE_POINTS,
          height: TRIANGLE_SIZE_POINTS,
        });
        
        // Top-right corner
        page.drawImage(triangleImages[1], {
          x: cardX + cardWidth - TRIANGLE_SIZE_POINTS,
          y: cardY + cardHeight - TRIANGLE_SIZE_POINTS,
          width: TRIANGLE_SIZE_POINTS,
          height: TRIANGLE_SIZE_POINTS,
        });
        
        // Bottom-left corner
        page.drawImage(triangleImages[2], {
          x: cardX,
          y: cardY,
          width: TRIANGLE_SIZE_POINTS,
          height: TRIANGLE_SIZE_POINTS,
        });
        
        // Bottom-right corner
        page.drawImage(triangleImages[3], {
          x: cardX + cardWidth - TRIANGLE_SIZE_POINTS,
          y: cardY,
          width: TRIANGLE_SIZE_POINTS,
          height: TRIANGLE_SIZE_POINTS,
        });
      }
    }

    // Add crop marks if enabled
    if (options.cropMarks) {
      // Crop mark dimensions: 1/4" long, 0.5pt wide for thinner marks
      const CROP_MARK_LENGTH = 0.25 * POINTS_PER_INCH; // 18pt (1/4")
      const CROP_MARK_THICKNESS = 0.5; // 0.5pt wide for thinner crop marks
      
      // Draw crop marks for each card on the page
      for (let j = 0; j < pageCards.length; j++) {
        const row = Math.floor(j / numCols);
        const col = j % numCols;
        
        // Calculate card position
        const cardX = scaledMarginX + (col * cardWidth);
        const cardY = pageHeight - scaledMarginY - cardHeight - (row * cardHeight);
        
        // Calculate crop mark offset for outermost edges
        const isRightmostCard = col === numCols - 1;
        const isBottomCard = row === numRows - 1;
        const cropMarkOffset = CROP_MARK_THICKNESS - 0.75; // Reduced offset (moved back by ~1 pixel)
        const rightCropMarkOffset = 0.375; // Additional 0.5 pixel offset for right crop marks
        
        // Draw crop marks at each corner of the card
        // Top-left corner (always standard position)
        page.drawLine({
          start: { x: cardX - CROP_MARK_LENGTH, y: cardY + cardHeight },
          end: { x: cardX, y: cardY + cardHeight },
          thickness: CROP_MARK_THICKNESS,
          color: rgb(0.7, 0.7, 0.7)
        });
        page.drawLine({
          start: { x: cardX, y: cardY + cardHeight + CROP_MARK_LENGTH },
          end: { x: cardX, y: cardY + cardHeight },
          thickness: CROP_MARK_THICKNESS,
          color: rgb(0.7, 0.7, 0.7)
        });
        
        // Top-right corner (offset outward if rightmost card)
        const rightEdgeX = isRightmostCard ? cardX + cardWidth + cropMarkOffset + rightCropMarkOffset : cardX + cardWidth;
        page.drawLine({
          start: { x: rightEdgeX, y: cardY + cardHeight },
          end: { x: rightEdgeX + CROP_MARK_LENGTH, y: cardY + cardHeight },
          thickness: CROP_MARK_THICKNESS,
          color: rgb(0.7, 0.7, 0.7)
        });
        page.drawLine({
          start: { x: rightEdgeX, y: cardY + cardHeight + CROP_MARK_LENGTH },
          end: { x: rightEdgeX, y: cardY + cardHeight },
          thickness: CROP_MARK_THICKNESS,
          color: rgb(0.7, 0.7, 0.7)
        });
        
        // Bottom-left corner (offset outward if bottom card)
        const bottomEdgeY = isBottomCard ? cardY - cropMarkOffset : cardY;
        page.drawLine({
          start: { x: cardX - CROP_MARK_LENGTH, y: bottomEdgeY },
          end: { x: cardX, y: bottomEdgeY },
          thickness: CROP_MARK_THICKNESS,
          color: rgb(0.7, 0.7, 0.7)
        });
        page.drawLine({
          start: { x: cardX, y: bottomEdgeY - CROP_MARK_LENGTH },
          end: { x: cardX, y: bottomEdgeY },
          thickness: CROP_MARK_THICKNESS,
          color: rgb(0.7, 0.7, 0.7)
        });
        
        // Bottom-right corner (offset outward if rightmost AND bottom card)
        page.drawLine({
          start: { x: rightEdgeX, y: bottomEdgeY },
          end: { x: rightEdgeX + CROP_MARK_LENGTH, y: bottomEdgeY },
          thickness: CROP_MARK_THICKNESS,
          color: rgb(0.7, 0.7, 0.7)
        });
        page.drawLine({
          start: { x: rightEdgeX, y: bottomEdgeY - CROP_MARK_LENGTH },
          end: { x: rightEdgeX, y: bottomEdgeY },
          thickness: CROP_MARK_THICKNESS,
          color: rgb(0.7, 0.7, 0.7)
        });
      }
    }

    // Add cut lines if enabled
    if (options.cutLines) {
      // Draw vertical cut lines between columns
      for (let col = 1; col < numCols; col++) {
        const x = scaledMarginX + col * cardWidth;
        // Draw from top of grid to bottom of grid
        page.drawLine({
          start: { x, y: pageHeight - scaledMarginY },
          end: { x, y: pageHeight - scaledMarginY - numRows * cardHeight },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7)
        });
      }
      // Draw horizontal cut lines between rows
      for (let row = 1; row < numRows; row++) {
        const y = pageHeight - scaledMarginY - row * cardHeight;
        page.drawLine({
          start: { x: scaledMarginX, y },
          end: { x: scaledMarginX + numCols * cardWidth, y },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7)
        });
      }
    }
  }

  // Add decklist page if requested
  if (options.printDecklist) {
    let checklistPage = pdfDoc.addPage([pageWidth, pageHeight]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 14;
    const margin = 40;
    let y = pageHeight - margin;
    const lineHeight = fontSize + 4;
    checklistPage.drawText('Checklist', {
      x: margin,
      y,
      size: fontSize + 4,
      font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight * 2;
    const sanitize = (str) => {
      // Replace characters outside basic Latin and Latin-1 Supplement with '?'
      return str.replace(/[^\x00-\xFF]/g, '?');
    };
    cards.forEach(card => {
      const setCode = card.setCode || (card.printings && card.printings[0]?.set_name) || '';
      const collectorNumber = card.collectorNumber || (card.printings && card.printings[0]?.collector_number) || '';
      const line = `${card.quantity} ${card.name} (${setCode}) ${collectorNumber}`;
      const safeLine = sanitize(line);
      if (y < margin) {
        y = pageHeight - margin;
        checklistPage = pdfDoc.addPage([pageWidth, pageHeight]);
        checklistPage.drawText('Checklist (cont.)', {
          x: margin,
          y,
          size: fontSize + 4,
          font,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight * 2;
      }
      checklistPage.drawText(safeLine, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes; // Return bytes instead of Blob for server-side compatibility
};

const downloadPDF = (pdfBlob, filename = 'mtg-deck.pdf') => {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// CommonJS exports for server-side usage
module.exports = { generatePDF, downloadPDF };

// ES6 exports for client-side usage (if needed)
if (typeof exports !== 'undefined') {
  exports.generatePDF = generatePDF;
  exports.downloadPDF = downloadPDF;
} 