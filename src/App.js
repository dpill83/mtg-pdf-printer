import React, { useState } from 'react';
import DeckInput from './components/DeckInput';
import CardGrid from './components/CardGrid';
import { parseDecklist, fetchMultipleCards, testScryfallAPI } from './utils/scryfall';
import { generatePDF, downloadPDF } from './utils/pdfGenerator';
import './App.css';

function App() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');

  const handleDeckSubmit = async (decklistText) => {
    setLoading(true);
    setErrors([]);
    setSuccess('');
    setCards([]);

    try {
      // Parse the decklist
      const parsedCards = parseDecklist(decklistText);
      
      if (parsedCards.length === 0) {
        setErrors(['No valid cards found in the decklist. Please check the format.']);
        setLoading(false);
        return;
      }

      // Fetch card data from Scryfall
      const { results, errors: fetchErrors } = await fetchMultipleCards(parsedCards);
      
      if (results.length === 0) {
        setErrors(['No cards could be found. Please check the card names and try again.']);
        setLoading(false);
        return;
      }

      setCards(results);
      
      if (fetchErrors.length > 0) {
        setErrors(fetchErrors);
      } else {
        setSuccess(`Successfully loaded ${results.length} cards!`);
      }
    } catch (error) {
      setErrors([`Error loading cards: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (cards.length === 0) {
      setErrors(['No cards to generate PDF for. Please load a decklist first.']);
      return;
    }

    setGeneratingPDF(true);
    setErrors([]);
    setSuccess('');

    try {
      // Map cards to use proxy for imageUrl
      const proxiedCards = cards.map(card => ({
        ...card,
        imageUrl: `http://localhost:4000/proxy?url=${encodeURIComponent(card.imageUrl)}`
      }));
      const pdfBytes = await generatePDF(proxiedCards);
      downloadPDF(pdfBytes, 'mtg-deck.pdf');
      setSuccess('PDF generated and downloaded successfully!');
    } catch (error) {
      setErrors([`Error generating PDF: ${error.message}`]);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleTestAPI = async () => {
    setErrors([]);
    setSuccess('');
    
    try {
      const result = await testScryfallAPI();
      if (result) {
        setSuccess('API test completed successfully! Check console for details.');
      } else {
        setErrors(['API test failed. Check console for details.']);
      }
    } catch (error) {
      setErrors([`API test error: ${error.message}`]);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="app-header">
          <h1>MTG PDF Printer</h1>
          <p>Generate print-ready PDFs from Magic: The Gathering decklists</p>
        </header>

        <div className="card">
          <DeckInput onDeckSubmit={handleDeckSubmit} loading={loading} />
          
          {/*
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleTestAPI}
              disabled={loading}
            >
              Test API Connection
            </button>
          </div>
          */}
        </div>

        {errors.length > 0 && (
          <div className="card">
            <div className="error">
              <h3>Errors:</h3>
              {errors.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </div>
          </div>
        )}

        {success && (
          <div className="card">
            <div className="success">
              <p>{success}</p>
            </div>
          </div>
        )}

        {cards.length > 0 && (
          <div className="card">
            <div className="preview-section">
              <h2>Card Preview (3x3 Grid)</h2>
              <CardGrid cards={cards} loading={loading} />
              
              <div className="pdf-actions">
                <button
                  className="btn btn-success"
                  onClick={handleGeneratePDF}
                  disabled={generatingPDF || cards.length === 0}
                >
                  {generatingPDF ? 'Generating PDF...' : 'Generate PDF'}
                </button>
                
                <div className="pdf-info">
                  <p>• Print-ready PDF with 9 cards per page</p>
                  <p>• Standard card size (2.5" x 3.5")</p>
                  <p>• Minimal margins for optimal printing</p>
                  <p>• No watermarks or branding</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="app-footer">
          <div className="footer-content">
            <p>&copy; 2024 MTG PDF Printer. Made with ❤️ for Magic players.</p>
            <div className="coffee-button">
              <a href="https://www.buymeacoffee.com/gOZTM9e" target="_blank" rel="noopener noreferrer">
                <img 
                  src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=gOZTM9e&button_colour=FFDD00&font_colour=000000&font_family=Poppins&outline_colour=000000&coffee_colour=ffffff" 
                  alt="Buy me a coffee"
                />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App; 