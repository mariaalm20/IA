import { FigureData, Colors } from '../types';

const convertFiguresToArray = (figures: {
  [key: string]: FigureData;
}): FigureData[] => {
  return Object.values(figures);
};

export const minmax = (
  depth: number,
  isMaximizingPlayer: boolean,
  board: any,
  alpha: number,
  beta: number,
  currentTurn: Colors,
  getAvailableCells: any
): {
  bestMove: { figureId: string; x: number; y: number } | null;
  score: number;
} => {
  const b = convertFiguresToArray(board);
  if (depth === 0) {
    const evaluationScore = evaluateBoard(b, currentTurn, getAvailableCells);
    return { bestMove: null, score: evaluationScore };
  }

  let bestMove = null;
  let bestScore = isMaximizingPlayer ? -Infinity : Infinity;

  for (let i = 0; i < b.length; i++) {
    const piece = b[i];

    if (piece && piece.color === currentTurn && piece.color === Colors.BLACK) {
      const moves = getAvailableCells(piece, false);

      for (const move in moves) {
        const [x, y] = move.split('-').map(Number);
        if (moves[move]) {
          const newBoard = makeMove(b, piece.id, x, y);
          const { score } = minmax(
            depth - 1,
            !isMaximizingPlayer,
            newBoard,
            alpha,
            beta,
            currentTurn,
            getAvailableCells
          );

          if (isMaximizingPlayer) {
            if (score > bestScore) {
              bestScore = score;
              bestMove = { figureId: piece.id, x, y };
            }
            alpha = Math.max(alpha, score);
          } else {
            if (score < bestScore) {
              bestScore = score;
              bestMove = { figureId: piece.id, x, y };
            }
            beta = Math.min(beta, score);
          }

          if (beta <= alpha) {
            break;
          }
        }
      }
    }
  }

  return { bestMove, score: bestScore };
};

const evaluateBoard = (
  board: FigureData[],
  currentPlayer: Colors,
  getAvailableCells: any
): number => {
  const pieceValues: { [key: string]: number } = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000,
  };

  const captureBonus = 100;
  const mobilityBonus = 1;
  const centerControlBonus = 10;
  const kingSafetyPenalty = 50;

  let whiteScore = 0;
  let blackScore = 0;

  for (const piece of board) {
    if (!piece) continue;

    const pieceValue = pieceValues[piece.name];
    if (piece.color === Colors.WHITE) {
      whiteScore += pieceValue;
    } else {
      blackScore += pieceValue;
    }
  }

  const scoreDifference =
    currentPlayer === Colors.WHITE
      ? whiteScore - blackScore
      : blackScore - whiteScore;

  let captureCount = 0;
  for (const piece of board) {
    if (piece && piece.color !== currentPlayer) {
      captureCount++;
    }
  }

  const whiteMobility = generatePossibleMoves(
    Colors.WHITE,
    board,
    getAvailableCells
  ).length;
  const blackMobility = generatePossibleMoves(
    Colors.BLACK,
    board,
    getAvailableCells
  ).length;
  const mobilityScore = mobilityBonus * (whiteMobility - blackMobility);

  const centerSquares = [28, 29, 36, 37];
  let centerControlScore = 0;
  for (const square of centerSquares) {
    const piece = board[square];
    if (piece && piece.color === Colors.WHITE) {
      centerControlScore += centerControlBonus;
    } else if (piece && piece.color === Colors.BLACK) {
      centerControlScore -= centerControlBonus;
    }
  }

  let kingSafetyScore = 0;
  const opponentKing = board.find(
    (piece) => piece && piece.name === 'king' && piece.color !== currentPlayer
  );
  if (opponentKing) {
    const opponentKingX = opponentKing.x;
    const opponentKingY = opponentKing.y;

    for (const piece of board) {
      if (!piece || piece.color !== currentPlayer || piece.name === 'king')
        continue;
      const moves = getAvailableCells(piece, true);
      for (const move in moves) {
        const [x, y] = move.split('-').map(Number);
        if (x === opponentKingX && y === opponentKingY) {
          kingSafetyScore += kingSafetyPenalty;
          break;
        }
      }
    }
  }

  const totalScore =
    scoreDifference +
    captureCount * captureBonus +
    mobilityScore +
    centerControlScore +
    kingSafetyScore;

  if (currentPlayer === Colors.WHITE) {
    return totalScore;
  } else {
    return -totalScore;
  }
};

const generatePossibleMoves = (
  currentPlayer: Colors,
  board: FigureData[],
  getAvailableCells: any
): { figureId: string; x: number; y: number }[] => {
  const possibleMoves: { figureId: string; x: number; y: number }[] = [];

  for (let i = 0; i < board.length; i++) {
    const piece = board[i];

    if (
      piece &&
      piece.color === currentPlayer &&
      piece.color === Colors.BLACK
    ) {
      const moves = getAvailableCells(piece, false);

      for (const move in moves) {
        const [x, y] = move.split('-').map(Number);
        if (moves[move]) {
          possibleMoves.push({
            figureId: piece.id,
            x,
            y,
          });
        }
      }
    }
  }

  return possibleMoves;
};

const makeMove = (
  board: FigureData[],
  figureId: string,
  x: number,
  y: number
): FigureData[] => {
  const figureIndex = board.findIndex((figure) => figure.id === figureId);

  if (figureIndex === -1) {
    return board;
  }

  const newBoard = [...board];

  newBoard[figureIndex] = {
    ...newBoard[figureIndex],
    x: x,
    y: y,
  };

  return newBoard;
};
