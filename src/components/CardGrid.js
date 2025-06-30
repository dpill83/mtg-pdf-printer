import React from 'react';
import './CardGrid.css';

const CardGrid = ({ cards, loading }) => {
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

  // Show first 9 cards in the preview grid
  const previewCards = cards.slice(0, 9);
  const remainingCards = cards.length - 9;

  return (
    <div className="card-grid-container">
      <div className="card-grid">
        {previewCards.map((card, index) => (
          <div key={index} className="card-item">
            <img
              src={card.imageUrl}
              alt={card.name}
              className="card-image"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="card-placeholder" style={{ display: 'none' }}>
              <span>{card.name}</span>
            </div>
          </div>
        ))}
      </div>
      
      {remainingCards > 0 && (
        <div className="remaining-cards">
          <p>+ {remainingCards} more cards will be included in the PDF</p>
        </div>
      )}
      
      <div className="card-count">
        <p>Total cards: {cards.length}</p>
        <p>Pages needed: {Math.ceil(cards.length / 9)}</p>
      </div>
    </div>
  );
};

export default CardGrid; 