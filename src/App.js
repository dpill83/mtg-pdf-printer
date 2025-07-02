import React, { useState } from 'react';
import DeckInput from './components/DeckInput';
import CardGrid from './components/CardGrid';
import PrintOptions from './components/PrintOptions';
import { parseDecklist, fetchMultipleCards, fetchAllPrintings } from './utils/scryfall';
import './App.css';

function App() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' });
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [errors, setErrors] = useState([]);
  const [decklistText, setDecklistText] = useState('');
  
  // Print options state - moved from inline controls to centralized state
  const [cropMarks, setCropMarks] = useState(true);
  const [cutLines, setCutLines] = useState(false);
  const [blackCorners, setBlackCorners] = useState(true);
  const [skipBasicLands, setSkipBasicLands] = useState(false);
  const [printDecklist, setPrintDecklist] = useState(false);
  const [playtestWatermark, setPlaytestWatermark] = useState(false);
  const [paperSize, setPaperSize] = useState('letter');
  const [scale, setScale] = useState('100');
  const [aboutOpen, setAboutOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Paper size options (expanded and unified)
  const paperSizes = [
    { value: 'a4', label: 'A4 (21.0x29.7 cm)', width: 21.0, height: 29.7, unit: 'cm' },
    { value: 'a3', label: 'A3 (42.0x29.7 cm)', width: 42.0, height: 29.7, unit: 'cm' },
    { value: 'letter', label: 'Letter (8.5x11.0 in)', width: 8.5, height: 11.0, unit: 'in' },
    { value: 'legal', label: 'Legal (14.0x8.5 in)', width: 14.0, height: 8.5, unit: 'in' },
    { value: 'archA', label: 'Arch A (9.0x12.0 in)', width: 9.0, height: 12.0, unit: 'in' },
    { value: 'archB', label: 'Arch B (18.0x12.0 in)', width: 18.0, height: 12.0, unit: 'in' },
    { value: 'superB', label: 'Super B (13.0x19.0 in)', width: 13.0, height: 19.0, unit: 'in' },
    { value: 'tabloid', label: 'Tabloid (11.0x17.0 in)', width: 11.0, height: 17.0, unit: 'in' },
    { value: '4r', label: '4R (10.2x15.2 cm)', width: 10.2, height: 15.2, unit: 'cm' },
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

      // Fetch card data from Scryfall with progress tracking
      setLoadingProgress({ current: 0, total: parsedCards.length, message: 'Starting to load cards...' });
      const { results, errors: fetchErrors } = await fetchMultipleCards(parsedCards, setLoadingProgress);
      if (results.length === 0) {
        setErrors(['No cards could be found. Please check the card names and try again.']);
        setLoading(false);
        return;
      }

      // For each card, fetch all printings and set up the card object
      setLoadingProgress({ current: 0, total: results.length, message: 'Loading card printings...' });
      const cardsWithPrintings = await Promise.all(results.map(async (card, idx) => {
        // Update progress for printings phase
        setLoadingProgress({
          current: idx + 1,
          total: results.length,
          message: `Loading printings for ${card.name}...`
        });
        
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
            imageUrl: p.imageUrl,
            backImageUrl: p.backImageUrl,
            isDoubleFaced: p.isDoubleFaced,
            frontName: p.frontName,
            backName: p.backName,
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
        const backImageUrl = selected && selected.backImageUrl ? selected.backImageUrl : card.backImageUrl;
        const isDoubleFaced = selected ? selected.isDoubleFaced : card.isDoubleFaced;
        const frontName = selected ? selected.frontName : card.frontName;
        const backName = selected ? selected.backName : card.backName;
        
        return {
          ...card,
          imageUrl: imageUrl,
          backImageUrl: backImageUrl,
          isDoubleFaced: isDoubleFaced,
          frontName: frontName,
          backName: backName,
        };
      });

      setCards(finalCards);

      // Update decklistText to match the canonical preview
      const canonicalDecklist = finalCards.map(card => {
        const qty = card.quantity || 1;
        const name = card.name;
        const setCode = card.setCode || card.set || (card.printings && card.printings[0]?.set) || '';
        const collectorNumber = card.collectorNumber || (card.printings && card.printings[0]?.collector_number) || '';
        let line = `${qty}x ${name}`;
        if (setCode && collectorNumber) {
          line += ` (${setCode}) ${collectorNumber}`;
        } else if (setCode) {
          line += ` (${setCode})`;
        } else if (collectorNumber) {
          line += ` ${collectorNumber}`;
        }
        return line;
      }).join('\n');
      setDecklistText(canonicalDecklist);

      if (fetchErrors.length > 0) {
        setErrors(fetchErrors);
      }
    } catch (error) {
      setErrors([`Error loading cards: ${error.message}`]);
    } finally {
      setLoading(false);
      setLoadingProgress({ current: 0, total: 0, message: '' });
    }
  };

  // Handler for when a user selects a different printing
  const handleSelectPrinting = (cardIdx, printingId) => {
    setCards(prevCards => prevCards.map((card, idx) => {
      if (idx !== cardIdx) return card;
      const selected = card.printings.find(p => p.id === printingId) || card.printings[0];
      const imageUrl = selected && selected.imageUrl ? selected.imageUrl : card.imageUrl;
      const backImageUrl = selected && selected.backImageUrl ? selected.backImageUrl : card.backImageUrl;
      const isDoubleFaced = selected ? selected.isDoubleFaced : card.isDoubleFaced;
      const frontName = selected ? selected.frontName : card.frontName;
      const backName = selected ? selected.backName : card.backName;
      
      return {
        ...card,
        selectedPrintingId: selected.id,
        imageUrl: imageUrl,
        backImageUrl: backImageUrl,
        isDoubleFaced: isDoubleFaced,
        frontName: frontName,
        backName: backName,
      };
    }));
    // Update decklistText to match the new printings
    setDecklistText(prev => {
      const updatedCards = cards.map((card, idx) => {
        if (idx !== cardIdx) return card;
        const selected = card.printings.find(p => p.id === printingId) || card.printings[0];
        return {
          ...card,
          selectedPrintingId: selected.id,
          imageUrl: selected && selected.imageUrl ? selected.imageUrl : card.imageUrl,
          backImageUrl: selected && selected.backImageUrl ? selected.backImageUrl : card.backImageUrl,
          isDoubleFaced: selected ? selected.isDoubleFaced : card.isDoubleFaced,
          frontName: selected ? selected.frontName : card.frontName,
          backName: selected ? selected.backName : card.backName,
          setCode: selected.set,
          collectorNumber: selected.collector_number,
        };
      });
      return updatedCards.map(card => {
        const qty = card.quantity || 1;
        const name = card.name;
        const setCode = card.setCode || card.set || (card.printings && card.printings[0]?.set) || '';
        const collectorNumber = card.collectorNumber || (card.printings && card.printings[0]?.collector_number) || '';
        let line = `${qty}x ${name}`;
        if (setCode && collectorNumber) {
          line += ` (${setCode}) ${collectorNumber}`;
        } else if (setCode) {
          line += ` (${setCode})`;
        } else if (collectorNumber) {
          line += ` ${collectorNumber}`;
        }
        return line;
      }).join('\n');
    });
  };

  const handleGeneratePDF = async () => {
    if (cards.length === 0) {
      setErrors(['No cards to generate PDF for. Please load a decklist first.']);
      return;
    }
    setGeneratingPDF(true);
    setErrors([]);
    try {
      const paper = paperSizes.find(p => p.value === paperSize) || paperSizes[0];
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards,
          paper,
          scale: Number(scale),
          options: {
            cropMarks,
            cutLines,
            blackCorners,
            skipBasicLands,
            printDecklist,
            playtestWatermark
          }
        })
      });
      if (!response.ok) throw new Error('Failed to generate PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mtg-deck.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrors([`Error generating PDF: ${error.message}`]);
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Spinner component for PDF generation
  function Spinner() {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '24px 0'
      }}>
        <div className="spinner" style={{
          width: 32,
          height: 32,
          border: '4px solid #e0e0e0',
          borderTop: '4px solid #764ba2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ marginTop: 12, fontSize: 18, color: '#764ba2', fontWeight: 600 }}>
          Generating PDF...
        </div>
      </div>
    );
  }

  // Add one to card quantity and update decklist text
  const handleAddOne = (cardIdx) => {
    setCards(prevCards => prevCards.map((card, idx) => {
      if (idx !== cardIdx) return card;
      return { ...card, quantity: (card.quantity || 1) + 1 };
    }));

    // Update decklist text
    setDecklistText(prevText => {
      const lines = prevText.split('\n');
      const card = cards[cardIdx];
      if (!card) return prevText;
      // Try to find a line that matches this card (by name, set, collector number)
      const matchIdx = lines.findIndex(line => {
        // Accepts lines like '2x Card Name (SET) 123', '2 Card Name', etc.
        const regex = new RegExp(`^\\s*\\d+x?\\s+${card.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*\\([^)]+\\))?(\\s+${card.collectorNumber})?`, 'i');
        return regex.test(line);
      });
      if (matchIdx !== -1) {
        // Increment the quantity in the matched line
        const line = lines[matchIdx];
        const parts = line.match(/^(\s*)(\d+)(x?)\s+(.+)$/);
        if (parts) {
          const [, pre, qty, x, rest] = parts;
          const newQty = parseInt(qty, 10) + 1;
          lines[matchIdx] = `${pre}${newQty}${x} ${rest}`;
        }
      } else {
        // Add a new line for this card
        lines.push(`1 ${card.name}`);
      }
      return lines.join('\n');
    });
  };

  // Remove one from card quantity and update decklist text
  const handleRemoveOne = (cardIdx) => {
    setCards(prevCards => prevCards.map((card, idx) => {
      if (idx !== cardIdx) return card;
      const newQuantity = Math.max(1, (card.quantity || 1) - 1);
      return { ...card, quantity: newQuantity };
    }));

    // Update decklist text
    setDecklistText(prevText => {
      const lines = prevText.split('\n');
      const card = cards[cardIdx];
      if (!card) return prevText;
      // Try to find a line that matches this card (by name, set, collector number)
      const matchIdx = lines.findIndex(line => {
        // Accepts lines like '2x Card Name (SET) 123', '2 Card Name', etc.
        const regex = new RegExp(`^\\s*\\d+x?\\s+${card.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*\\([^)]+\\))?(\\s+${card.collectorNumber})?`, 'i');
        return regex.test(line);
      });
      if (matchIdx !== -1) {
        // Decrement the quantity in the matched line
        const line = lines[matchIdx];
        const parts = line.match(/^(\s*)(\d+)(x?)\s+(.+)$/);
        if (parts) {
          const [, pre, qty, x, rest] = parts;
          const newQty = Math.max(1, parseInt(qty, 10) - 1);
          lines[matchIdx] = `${pre}${newQty}${x} ${rest}`;
        }
      }
      return lines.join('\n');
    });
  };

  return (
    <div className="App">
      {/* About Modal */}
      {aboutOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'white', borderRadius: 8, maxWidth: 480, width: '90%', padding: 32, boxShadow: '0 4px 32px rgba(0,0,0,0.2)', position: 'relative' }}>
            <button onClick={() => setAboutOpen(false)} style={{ position: 'absolute', top: 12, right: 16, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: '#888' }} aria-label="Close">×</button>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>About MTGtoPDF</h2>
            <div style={{ fontSize: 16, color: '#333', lineHeight: 1.6 }}>
              <p>MTGtoPDF is a free web tool for generating printable Magic: The Gathering decks as PDFs.<br/>It was inspired by <a href="https://mtgprint.cardtrader.com/" target="_blank" rel="noopener noreferrer">MTG Print</a>, a great service offered by CardTrader.</p>
              <p style={{ marginTop: 12 }}>This site exists because I wanted a similar tool without the CardTrader branding baked into the output. I'm not trying to rip off MTG Print — just needed a clean, simple solution for myself and figured others might appreciate it too.</p>
              <p style={{ marginTop: 12 }}>The interface is intentionally familiar so friends and playgroups don't have to relearn how to print proxies. That said, we're not affiliated with MTG Print, CardTrader, Wizards of the Coast, or Hasbro in any way.</p>
              <p style={{ marginTop: 12 }}>This is a personal project made with love for the MTG community. Use it responsibly, playtest ethically, and support the game however you can.</p>
            </div>
          </div>
        </div>
      )}
      {/* FAQ Modal */}
      {faqOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'white', borderRadius: 8, maxWidth: 540, width: '95%', maxHeight: '90vh', padding: 32, boxShadow: '0 4px 32px rgba(0,0,0,0.2)', position: 'relative', overflowY: 'auto' }}>
            <button onClick={() => setFaqOpen(false)} style={{ position: 'absolute', top: 12, right: 16, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: '#888' }} aria-label="Close">×</button>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>❓ Frequently Asked Questions</h2>
            <div style={{ fontSize: 16, color: '#333', lineHeight: 1.7 }}>
              <b>🖨 Some cards are getting cut off when I print the PDF.</b>
              <div>That's usually a paper size mismatch. If you're printing on Letter but the PDF is set to A4 (or vice versa), the bottom row might get trimmed. Make sure your paper size matches in both the app and your printer settings.</div>
              <br/>
              <b>📏 The cards are printing smaller than real Magic cards.</b>
              <div>This means your print settings are scaling the page. Make sure the scale is set to <b>100%</b> or <b>"Actual Size"</b>. Avoid options like "Fit to Page" or "Shrink to Printable Area" — those will mess with sizing.</div>
              <br/>
              <b>🖼 The image quality looks pixelated or blurry.</b>
              <div>Some card images (especially older or obscure ones) are only available in low resolution. For newer cards, image quality usually improves after a few days as higher-res versions become available. We're constantly updating.</div>
              <br/>
              <b>🃏 How do I print split cards like "Expansion // Explosion"?</b>
              <div>Just type the full name with the double slash, like: <code>Expansion // Explosion</code>.</div>
              <br/>
              <b>🌗 How do I print double-faced cards like "Daybreak Ranger"?</b>
              <div>Enter either <code>Daybreak Ranger</code> or <code>Daybreak Ranger // Nightfall Predator</code>. You'll only see the front in the preview, but the PDF will include both sides. At this time, there's no option to print just one side.</div>
              <br/>
              <b>🪙 Can I print tokens and emblems?</b>
              <div>Yes. Type the name of the token or emblem — like <code>Shark</code> or <code>Chandra, Awakened Inferno Emblem</code>.</div>
              <br/>
              <b>🎴 Can I print card backs?</b>
              <div>Yep. Just type <code>back</code>.</div>
              <br/>
              <b>📚 Can I print a full set?</b>
              <div>Yes, type the set code like <code>eld</code> for Throne of Eldraine. Keep in mind that large sets may take a while to generate.</div>
              <hr style={{ margin: '24px 0' }}/>
              <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>🧰 Feature Options</h3>
              <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                <li><b>🔲 Crop Marks</b><br/>Adds small marks at the corners of each card to guide your cuts.</li>
                <li style={{ marginTop: 10 }}><b>🔳 Cut Lines</b><br/>Draws lines between cards to help with trimming.</li>
                <li style={{ marginTop: 10 }}><b>🌿 Skip Basic Lands</b><br/>Removes all basic lands from your list. Great for saving space.</li>
                <li style={{ marginTop: 10 }}><b>⬛ Black Corners</b><br/>Adds black square corners to your cards. Only use this if you're printing black-bordered cards.</li>
                <li style={{ marginTop: 10 }}><b>📄 Print Decklist</b><br/>Adds a list of all cards at the end of the PDF — handy for keeping track.</li>
                <li style={{ marginTop: 10 }}><b>🔒 Playtest Watermark</b><br/>Adds a faint "Playtest Card" watermark to the cards. This helps keep things legit. Wizards of the Coast allows proxies for casual play as long as they're clearly marked.</li>
              </ul>
              <hr style={{ margin: '24px 0' }}/>
              <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>📱 Installing the App</h3>
              <b>Can I install mtg-pdf-printer like an app?</b>
              <div>Yes — it's a Progressive Web App (PWA).</div>
              <ul style={{ paddingLeft: 18 }}>
                <li>On <b>desktop</b>, click the install icon in your browser's address bar.</li>
                <li>On <b>iOS</b>, open in Safari, tap Share, then "Add to Home Screen".</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      {/* Send Feedback Modal */}
      {feedbackOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', borderRadius: 8, maxWidth: 480, width: '90%', padding: 32,
            boxShadow: '0 4px 32px rgba(0,0,0,0.2)', position: 'relative', textAlign: 'center'
          }}>
            <button onClick={() => setFeedbackOpen(false)} style={{
              position: 'absolute', top: 12, right: 16, fontSize: 22,
              background: 'none', border: 'none', cursor: 'pointer', color: '#888'
            }} aria-label="Close">×</button>

            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>Send Feedback</h2>

            <a href="mailto:feedback@mtgtopdf.com" style={{
              fontSize: 20, fontWeight: 'bold', color: '#3366cc', textDecoration: 'none', wordBreak: 'break-word'
            }}>
              feedback@mtgtopdf.com
            </a>

            <p style={{ fontSize: 14, color: '#777', marginTop: 24, textAlign: 'center' }}>
            <a href="https://www.buymeacoffee.com/gOZTM9e"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=gOZTM9e&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="Buy me a coffee" /></a>
            </p>
          </div>
        </div>
      )}
      {/* Top header bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="text-xl font-bold text-gray-900">MTGtoPDF</div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-600 hover:text-gray-900 font-medium" onClick={e => { e.preventDefault(); setAboutOpen(true); }}>About</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 font-medium" onClick={e => { e.preventDefault(); setFaqOpen(true); }}>FAQ</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 font-medium" onClick={e => { e.preventDefault(); setFeedbackOpen(true); }}>Send feedback</a>
          </div>
        </div>
      </div>
      
      <div className="container">
        <header className="app-header">
          <h1>MTGtoPDF</h1>
          <p>Generate print-ready PDFs from Magic: The Gathering decklists</p>
        </header>

        {/* Show spinner above print options if generating PDF */}
        {generatingPDF && <Spinner />}

        <div className="card">
          <DeckInput
            onDeckSubmit={handleDeckSubmit}
            loading={loading}
            loadingProgress={loadingProgress}
            decklistText={decklistText}
            setDecklistText={setDecklistText}
          />
          {/* PrintOptions component - only show if cards are loaded */}
          {cards.length > 0 && (
            <PrintOptions
              cropMarks={cropMarks}
              setCropMarks={setCropMarks}
              cutLines={cutLines}
              setCutLines={setCutLines}
              blackCorners={blackCorners}
              setBlackCorners={setBlackCorners}
              skipBasicLands={skipBasicLands}
              setSkipBasicLands={setSkipBasicLands}
              printDecklist={printDecklist}
              setPrintDecklist={setPrintDecklist}
              playtestWatermark={playtestWatermark}
              setPlaytestWatermark={setPlaytestWatermark}
              paperSize={paperSize}
              setPaperSize={setPaperSize}
              scale={scale}
              setScale={setScale}
              onPrint={handleGeneratePDF}
              printing={generatingPDF}
              paperSizes={paperSizes}
            />
          )}
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
              <CardGrid cards={cards} loading={loading} onSelectPrinting={handleSelectPrinting} onPrint={handleGeneratePDF} printing={generatingPDF} onAddOne={handleAddOne} onRemoveOne={handleRemoveOne} />
            </div>
          </div>
        )}

        <footer className="app-footer">
          <div className="footer-content">
            <p>&copy; 2024 MTGtoPDF. Made with ❤️ for Magic players.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App; 