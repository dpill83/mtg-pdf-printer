import React, { useState } from 'react';
import DeckInput from './components/DeckInput';
import CardGrid from './components/CardGrid';
import PrintOptions from './components/PrintOptions';
import { parseDecklist, fetchMultipleCards, fetchAllPrintings } from './utils/scryfall';
import { generatePDF, downloadPDF } from './utils/pdfGenerator';
import './App.css';

function App() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [errors, setErrors] = useState([]);
  
  // Print options state - moved from inline controls to centralized state
  const [cropMarks, setCropMarks] = useState(true);
  const [cutLines, setCutLines] = useState(false);
  const [blackCorners, setBlackCorners] = useState(true);
  const [skipBasicLands, setSkipBasicLands] = useState(false);
  const [printChecklist, setPrintChecklist] = useState(false);
  const [playtestWatermark, setPlaytestWatermark] = useState(false);
  const [paperSize, setPaperSize] = useState('letter');
  const [scale, setScale] = useState('100');



  // Paper size options
  const paperSizes = [
    { value: 'letter', label: 'Letter (8.5x11.0 in)', width: 8.5, height: 11.0 },
    { value: 'legal', label: 'Legal (8.5x14.0 in)', width: 8.5, height: 14.0 },
    { value: 'a4', label: 'A4 (8.27x11.69 in)', width: 8.27, height: 11.69 },
    { value: 'a3', label: 'A3 (11.69x16.54 in)', width: 11.69, height: 16.54 },
    { value: 'tabloid', label: 'Tabloid (11x17 in)', width: 11, height: 17 },
  ];

  const handleDeckSubmit = async (decklistText) => {
    setLoading(true);
    setErrors([]);
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

      // For each card, fetch all printings and set up the card object
      const cardsWithPrintings = await Promise.all(results.map(async (card, idx) => {
        let printings = [];
        try {
          if (card.prints_search_uri) {
            printings = await fetchAllPrintings(card.prints_search_uri);
          }
        } catch (e) {
          printings = [];
        }
        // Default to the originally loaded card
        const selectedPrinting = printings.find(p => p.set_name === card.set && p.collector_number === card.collectorNumber) || printings[0];
        const cardWithPrintings = {
          ...card,
          printings: printings.map(p => ({
            id: p.id,
            set_name: p.set_name,
            collector_number: p.collector_number,
            released_at: p.released_at,
            imageUrl: p.image_uris?.png || p.card_faces?.[0]?.image_uris?.png,
          })),
          selectedPrintingId: selectedPrinting ? selectedPrinting.id : null,
        };
        console.log('Card with printings:', cardWithPrintings.name, 'printings:', cardWithPrintings.printings.length, cardWithPrintings.printings[0]);
        return cardWithPrintings;
      }));

      // Use direct Scryfall URLs
      const finalCards = cardsWithPrintings.map(card => {
        const selected = card.printings.find(p => p.id === card.selectedPrintingId) || card.printings[0];
        const imageUrl = selected && selected.imageUrl ? selected.imageUrl : card.imageUrl;
        
        return {
          ...card,
          imageUrl: imageUrl,
        };
      });

      setCards(finalCards);

      if (fetchErrors.length > 0) {
        setErrors(fetchErrors);
      }
    } catch (error) {
      setErrors([`Error loading cards: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Handler for when a user selects a different printing
  const handleSelectPrinting = (cardIdx, printingId) => {
    setCards(prevCards => prevCards.map((card, idx) => {
      if (idx !== cardIdx) return card;
      const selected = card.printings.find(p => p.id === printingId) || card.printings[0];
      const imageUrl = selected && selected.imageUrl ? selected.imageUrl : card.imageUrl;
      
      return {
        ...card,
        selectedPrintingId: selected.id,
        imageUrl: imageUrl,
      };
    }));
  };

  const handleGeneratePDF = async () => {
    if (cards.length === 0) {
      setErrors(['No cards to generate PDF for. Please load a decklist first.']);
      return;
    }
    setGeneratingPDF(true);
    setErrors([]);
    try {
      // Find the selected paper size object
      const paper = paperSizes.find(p => p.value === paperSize) || paperSizes[0];
      // Pass paper size, scale, and print options to generatePDF
      const pdfBytes = await generatePDF(cards, paper, Number(scale), {
        cropMarks,
        cutLines,
        blackCorners,
        skipBasicLands,
        printChecklist,
        playtestWatermark
      });
      downloadPDF(pdfBytes, 'mtg-deck.pdf');
    } catch (error) {
      setErrors([`Error generating PDF: ${error.message}`]);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="App">
      {/* Top header bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="text-xl font-bold text-gray-900">MTG PDF PRINTER</div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-600 hover:text-gray-900 font-medium">About</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 font-medium">FAQ</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 font-medium">Send feedback</a>
          </div>
        </div>
      </div>
      
      <div className="container">
        <header className="app-header">
          <h1>MTG PDF Printer</h1>
          <p>Generate print-ready PDFs from Magic: The Gathering decklists</p>
        </header>

        <div className="card">
          <DeckInput
            onDeckSubmit={handleDeckSubmit}
            loading={loading}
          />
          
          {/* PrintOptions component - single source of truth for all print controls */}
          <PrintOptions
            cropMarks={cropMarks}
            setCropMarks={setCropMarks}
            cutLines={cutLines}
            setCutLines={setCutLines}
            blackCorners={blackCorners}
            setBlackCorners={setBlackCorners}
            skipBasicLands={skipBasicLands}
            setSkipBasicLands={setSkipBasicLands}
            printChecklist={printChecklist}
            setPrintChecklist={setPrintChecklist}
            playtestWatermark={playtestWatermark}
            setPlaytestWatermark={setPlaytestWatermark}
            paperSize={paperSize}
            setPaperSize={setPaperSize}
            scale={scale}
            setScale={setScale}
            onPrint={handleGeneratePDF}
            printing={generatingPDF}
          />
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



        {cards.length > 0 && (
          <div className="card">
            <div className="preview-section">
              <h2>Card Preview (3x3 Grid)</h2>
              <CardGrid cards={cards} loading={loading} onSelectPrinting={handleSelectPrinting} onPrint={handleGeneratePDF} printing={generatingPDF} />
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