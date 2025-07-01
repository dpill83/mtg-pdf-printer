import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cards, paper, scale, options } = req.body;
    // Basic validation
    if (!Array.isArray(cards) || typeof paper !== 'object' || typeof scale !== 'number' || typeof options !== 'object') {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // PDF generation logic (adapted from src/utils/pdfGenerator.js)
    const POINTS_PER_INCH = 72;
    const CARD_WIDTH_INCHES = 2.5;
    const CARD_HEIGHT_INCHES = 3.5;
    const CARD_WIDTH_POINTS = CARD_WIDTH_INCHES * POINTS_PER_INCH;
    const CARD_HEIGHT_POINTS = CARD_HEIGHT_INCHES * POINTS_PER_INCH;
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
    const scaleFactor = Math.max(90, Math.min(Number(scale), 110)) / 100;
    const cardWidth = CARD_WIDTH_POINTS * scaleFactor;
    const cardHeight = CARD_HEIGHT_POINTS * scaleFactor;
    const scaledMarginX = (pageWidth - (3 * cardWidth)) / 2;
    const scaledMarginY = (pageHeight - (3 * cardHeight)) / 2;
    const pdfDoc = await PDFDocument.create();

    // Pre-fetch all images as Uint8Array
    const imageBytesArr = await Promise.all(
      cards.map(async (card) => {
        try {
          const response = await fetch(card.imageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MTG-PDF-Printer/1.0; +https://yourdomain.com)',
              'Accept': 'image/png,image/*;q=0.8,*/*;q=0.5'
            }
          });
          const arrayBuffer = await response.arrayBuffer();
          return new Uint8Array(arrayBuffer);
        } catch (error) {
          return null;
        }
      })
    );

    // Process cards in groups of 9 (3x3 grid per page)
    for (let i = 0; i < cards.length; i += 9) {
      const pageCards = cards.slice(i, i + 9);
      const pageImages = imageBytesArr.slice(i, i + 9);
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      for (let j = 0; j < pageCards.length; j++) {
        const imgBytes = pageImages[j];
        if (!imgBytes) continue;
        try {
          const img = await pdfDoc.embedPng(imgBytes);
          const row = Math.floor(j / 3);
          const col = j % 3;
          const x = scaledMarginX + (col * cardWidth);
          const y = pageHeight - scaledMarginY - cardHeight - (row * cardHeight);
          page.drawImage(img, {
            x,
            y,
            width: cardWidth,
            height: cardHeight,
          });
        } catch (error) {
          // skip
        }
      }
    }

    // Checklist page (if requested)
    if (options.printChecklist) {
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
      const sanitize = (str) => str.replace(/[^\x00-\xFF]/g, '?');
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
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=mtg-deck.pdf');
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
} 