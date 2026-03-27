import React, { useState, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { RotateCcw } from 'lucide-react';

export interface TicTacToeProps {
  onGameEnd?: (winner: 'X' | 'O' | null, scores: { X: number; O: number }) => void;
  playerXName?: string;
  playerOName?: string;
}

/**
 * Multiplayer Tic-Tac-Toe Game Component
 * Two-player game with real-time state management
 */
export const TicTacToe = React.memo(function TicTacToe({
  onGameEnd,
  playerXName = 'Player X',
  playerOName = 'Player O',
}: TicTacToeProps) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [moveCount, setMoveCount] = useState(0);

  // Calculate winner
  const calculateWinner = useCallback((squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  }, []);

  const winner = calculateWinner(board);
  const isBoardFull = moveCount === 9;
  const gameOver = winner || isBoardFull;

  // Handle square click
  const handleClick = useCallback((index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
    setMoveCount(moveCount + 1);

    // Check if game ended
    const gameWinner = calculateWinner(newBoard);
    if (gameWinner || moveCount === 8) {
      const winner = (gameWinner as 'X' | 'O') || null;
      onGameEnd?.(winner, {
        X: gameWinner === 'X' ? 1 : 0,
        O: gameWinner === 'O' ? 1 : 0,
      });
    }
  }, [board, isXNext, winner, moveCount, calculateWinner, onGameEnd]);

  // Reset game
  const handleReset = useCallback(() => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setMoveCount(0);
  }, []);

  const currentPlayer = isXNext ? playerXName : playerOName;
  const status = winner
    ? `Winner: ${winner === 'X' ? playerXName : playerOName}`
    : isBoardFull
    ? 'Draw!'
    : `Current: ${currentPlayer}`;

  return (
    <Card className="p-6 max-w-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Tic Tac Toe</h2>
        <p className={`text-lg font-semibold ${
          winner ? 'text-green-600' : isBoardFull ? 'text-blue-600' : 'text-gray-600'
        }`}>
          {status}
        </p>
      </div>

      {/* Game Board */}
      <div className="mb-6 grid grid-cols-3 gap-2 bg-gray-200 p-2 rounded-lg">
        {board.map((value, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            disabled={!!value || !!winner}
            className={`aspect-square text-2xl font-bold rounded transition-colors ${
              value
                ? 'bg-white text-gray-800 cursor-default'
                : 'bg-white hover:bg-gray-50 cursor-pointer'
            } disabled:opacity-75`}
          >
            {value}
          </button>
        ))}
      </div>

      {/* Reset Button */}
      <Button
        onClick={handleReset}
        variant="outline"
        className="w-full"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        New Game
      </Button>

      {/* Player Names */}
      <div className="mt-4 space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span className="font-semibold">{playerXName}</span>
          <span>Playing as X</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">{playerOName}</span>
          <span>Playing as O</span>
        </div>
      </div>
    </Card>
  );
});

TicTacToe.displayName = 'TicTacToe';
