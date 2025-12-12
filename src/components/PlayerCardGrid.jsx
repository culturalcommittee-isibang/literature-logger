import React, { useState } from 'react';
import SvgCard from './SvgCard';

export default function PlayerCardGrid({
  playerName,
  cards,
  cardScale = 0.23,
  draggableEnabled = false,
  onCardDragStart,
  onCardDragEnd,
  onPanelDragOver,
  onPanelDrop,
  title,
}) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    if (!draggableEnabled) return;
    onPanelDragOver?.(playerName, e);
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e) => {
    if (!draggableEnabled) return;
    onPanelDrop?.(playerName, e);
    setIsOver(false);
  };

  return (
    <div
      className={`cards cards-grid ${draggableEnabled ? 'cards-draggable' : ''} ${isOver ? 'cards-over' : ''}`}
      title={title}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {cards.map((card) => (
        <div
          key={card}
          className="card-chip"
          draggable={draggableEnabled}
          onDragStart={(e) => draggableEnabled && onCardDragStart?.(playerName, card, e)}
          onDragEnd={onCardDragEnd}
        >
          <SvgCard
            code={card}
            scale={cardScale}
            title={card}
            aria-label={card}
          />
        </div>
      ))}
    </div>
  );
}
