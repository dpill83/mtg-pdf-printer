import React, { useState } from 'react';
import './CardGrid.css';

const CARD_WIDTH = 220; // px

const CardGrid = ({ cards, loading, onSelectPrinting, onPrint, printing, onAddOne }) => {
  const [imgErrors, setImgErrors] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(null);

  if (loading) {
    return (
      <div className="card-grid-container">
        <div className="loading">Loading cards...</div>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="card-grid-container">
        <div className="no-cards">
          <p>No cards to display. Enter a decklist above to see the preview.</p>
        </div>
      </div>
    );
  }

  // Show all cards in the preview grid
  const previewCards = cards; // no slicing, show all

  const handleImgError = (index) => {
    setImgErrors((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  };

  // Dismiss overlay if clicking outside any card
  React.useEffect(() => {
    if (activeCardIndex === null) return;
    const handleClick = (e) => {
      if (!e.target.closest('.card-item-wrapper')) {
        setActiveCardIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [activeCardIndex]);

  return (
    <div className="card-grid-container mt-6">
      <div className="card-grid">
        {previewCards.map((card, index) => (
          <div
            key={index}
            className="card-item-wrapper"
            style={{ width: CARD_WIDTH }}
            onClick={() => setActiveCardIndex(index)}
          >
            <div className="card-item">
              {!imgErrors[index] ? (
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="card-image"
                  onError={(e) => {
                    console.error(`Failed to load image for ${card.name}:`, card.imageUrl, e);
                    handleImgError(index);
                  }}
                  onLoad={() => {
                    console.log(`Successfully loaded image for ${card.name}:`, card.imageUrl);
                  }}
                />
              ) : (
                <div className="card-placeholder">
                  <span>{card.name}</span>
                </div>
              )}
              {/* Overlay for + Add One */}
              {activeCardIndex === index && (
                <div className="add-one-overlay">
                  <button
                    className="add-one-btn"
                    onClick={e => {
                      e.stopPropagation();
                      onAddOne && onAddOne(index);
                      setActiveCardIndex(null);
                    }}
                  >+ Add One</button>
                </div>
              )}
            </div>
            {/* Controls: dropdown and quantity badge */}
            <div className="card-controls flex flex-row items-center justify-center mt-2">
              <span className="card-quantity-badge">{card.quantity}</span>
              {card.printings && card.printings.length > 0 && (
                <select
                  value={card.selectedPrintingId || card.printings[0].id}
                  onChange={e => onSelectPrinting(index, e.target.value)}
                  className="card-version-dropdown"
                >
                  {card.printings.map((printing) => (
                    <option key={printing.id} value={printing.id}>
                      {printing.set_name} ({printing.collector_number})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Centered Print button at the bottom */}
      <div className="flex justify-center mt-8">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onPrint}
          disabled={printing}
        >
          {printing ? (
            'Generating PDF...'
          ) : (
            <>
              <span role="img" aria-label="Print" style={{ marginRight: 4 }}>🖨️</span>Print
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CardGrid; 