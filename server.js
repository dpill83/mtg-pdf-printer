const express = require('express');
const path = require('path');
const { generatePDF } = require('./src/utils/pdfGenerator');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'build')));

// API Routes
app.post('/api/generate-pdf', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cards, paper, scale, options } = req.body;
    
    // Validate required fields
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'Cards array is required and must not be empty' });
    }
    
    if (!paper || typeof paper !== 'object') {
      return res.status(400).json({ error: 'Paper configuration is required' });
    }
    
    if (typeof scale !== 'number' || scale < 90 || scale > 110) {
      return res.status(400).json({ error: 'Scale must be a number between 90 and 110' });
    }
    
    if (!options || typeof options !== 'object') {
      return res.status(400).json({ error: 'Options object is required' });
    }

    // Generate PDF using shared utility
    const pdfBytes = await generatePDF(cards, paper, scale, options);
    
    // Return PDF with proper headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=mtg-deck.pdf');
    res.status(200).send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('PDF generation error:', error);
    
    // Handle specific error types
    if (error.message.includes('fetch')) {
      return res.status(500).json({ error: 'Failed to fetch card images. Please try again.' });
    }
    
    if (error.message.includes('embed')) {
      return res.status(500).json({ error: 'Failed to process card images. Please check your decklist.' });
    }
    
    return res.status(500).json({ error: 'Failed to generate PDF. Please try again.' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 