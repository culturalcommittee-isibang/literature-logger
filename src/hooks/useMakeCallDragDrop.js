import { useState, useCallback } from 'react';
import { findPit } from '../logic.js';

// Drag/drop helper for Make Call. Caller = drop target, Callee = drag source.
export default function useMakeCallDragDrop({ isEnabled, gameInstance, setPlayers, setLogs, getTeamOf }) {
  const [dragData, setDragData] = useState(null);

  const onCardDragStart = useCallback((fromPlayer, card, event) => {
    if (!isEnabled) return;
    setDragData({ fromPlayer, card });
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card);
    }
  }, [isEnabled]);

  const onCardDragEnd = useCallback(() => {
    setDragData(null);
  }, []);

  const onPanelDragOver = useCallback((targetPlayer, event) => {
    if (!isEnabled || !dragData) return;
    const fromTeam = getTeamOf(dragData.fromPlayer);
    const targetTeam = getTeamOf(targetPlayer);
    if (!fromTeam || !targetTeam || fromTeam === targetTeam) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }, [dragData, getTeamOf, isEnabled]);

  const onPanelDrop = useCallback((targetPlayer, event) => {
    if (!isEnabled || !dragData) return;
    const { fromPlayer, card } = dragData;
    const fromTeam = getTeamOf(fromPlayer);
    const targetTeam = getTeamOf(targetPlayer);
    if (!fromTeam || !targetTeam || fromTeam === targetTeam) {
      setDragData(null);
      return;
    }
    // Validate caller owns at least one card from the card's pit (game rule)
    const { pitCards } = findPit(card);
    const callerHasPitCard = pitCards?.some(c => gameInstance.players?.[targetPlayer]?.includes(c));
    if (!callerHasPitCard) {
      alert('Invalid call: caller must hold a card from that pit.');
      setDragData(null);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    try {
      // Caller = targetPlayer, Callee = fromPlayer
      gameInstance.makeCall(targetPlayer, fromPlayer, card);
      setPlayers({ ...gameInstance.players });
      setLogs([...gameInstance.logs]);
    } catch (err) {
      alert(err.message);
    } finally {
      setDragData(null);
    }
  }, [dragData, gameInstance, getTeamOf, isEnabled, setLogs, setPlayers]);

  return {
    draggingCard: dragData,
    onCardDragStart,
    onCardDragEnd,
    onPanelDragOver,
    onPanelDrop,
  };
}
