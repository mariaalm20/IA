import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import styles from './Board.module.scss';
import { BoardLettersByNumber, Colors, FigureData, Figures } from 'types';
import Cell from './Cell';
import Figure from 'components/Figure/Figure';
import {
  changeFigurePosition,
  removeFigure,
  selectColor,
  selectFigures,
  selectGameWon,
  setGameStarted,
  setGameWon,
} from 'redux/gameSlice';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import store from '../../redux/store';
import { Link } from 'react-router-dom';

import { minmax } from '../../IA/minmax';

const Board: React.FC = () => {
  const dispatch = useAppDispatch();
  const gameColor = useAppSelector(selectColor); //cor do jogador atual
  const figures = useAppSelector(selectFigures); //info sobre as peças
  const gameWon = useAppSelector(selectGameWon); //vencedor
  const [currentTurn, setCurrentTurn] = useState<Colors>(Colors.WHITE);
  let [isKingInCheck, setIsKingInCheck] = useState<boolean>(false); //indica se o rei esta em cheque
  let dangerousCells: MutableRefObject<{
    white: { [key: string]: boolean };
    black: { [key: string]: boolean };
  }> = useRef({ white: {}, black: {} });

  const sides = {
    ally: gameColor,
    enemy: gameColor === Colors.WHITE ? Colors.BLACK : Colors.WHITE,
  }; //informaçoes sobre o lado da peça com base na cor do jogador atual

  const boardRef = useRef<HTMLDivElement>(null);
  const [choseFigurePos, setChoseFigurePos] = useState<{
    figure: FigureData;
    availableCells: { [key: string]: boolean };
  } | null>(null); //peça que o jogador escolheu

  const cellsFigure: { [key: string]: FigureData | null } = {}; // informações sobre todas as células do tabuleiro e quais peças estão em cada célula.

  useEffect(() => {
    // Verifica se é a vez da IA jogar e chama a função
    if (currentTurn === sides.enemy) {
      nextAIMoveDelayed();
    }
  }, [currentTurn]);

  const isAvailableCellForMove = (x: number, y: number): boolean => {
    if (choseFigurePos && choseFigurePos.availableCells[`${x}-${y}`]) {
      return true;
    }
    return false;
  }; //recebe as coordenadas x e y e verifica se esta disponivel

  const isCellHavingFigure = (x: number, y: number): boolean => {
    return cellsFigure[`${x}-${y}`] ? true : false;
  }; //verifica se uma célula possui peça

  const moveOn = (figure: FigureData, x: number, y: number) => {
    cellsFigure[`${figure.x}-${figure.y}`] = null; //tira a peça da posição atual
    cellsFigure[`${x}-${y}`] = figure; //coloca na posição x e y
    dispatch(changeFigurePosition({ figure, x, y })); //muda o estado da figura
    setChoseFigurePos(null);
  };

  const cellClicked = (x: number, y: number): void => {
    if (!choseFigurePos) return; //se nao tiver peça selecionada
    if (!choseFigurePos.availableCells[`${x}-${y}`]) return; //se nao tiver disponivel aquela célula

    moveOn(choseFigurePos.figure, x, y); //se estiver disponivel chama moveOn para mover a peça
    nextAIMoveDelayed();
    setCurrentTurn(getOtherColor(currentTurn));
  };

  const initCells = (): JSX.Element[] => {
    const cells: JSX.Element[] = [];
    //faz uma matriz de 1 a 8
    for (let y = 8; y >= 1; y--) {
      //itera sobre as linhas de cima para baixa (8 ao 1)
      for (let x = 1; x <= 8; x++) {
        //itera sobre as colunas, da esquerda para a direita (1 ao 8)
        cellsFigure[`${x}-${y}`] = null; //inicia todas as célular com null
        const boardLetter = BoardLettersByNumber[x]; //obtem a letra da coluna atual
        if ((y + x) % 2 !== 0) {
          //verifica se a célula é par ou impar para alternar as cores
          cells.push(
            <Cell
              color={Colors.BLACK}
              x={boardLetter}
              y={y}
              key={`${boardLetter}-${y}`}
              isAvailableForMove={isAvailableCellForMove(x, y)} //verifica se da para mover para a celula
              isHavingFigure={isCellHavingFigure(x, y)} //verifica se tem peça
              cellClicked={cellClicked} //callback para quando a celula for clicada
              isSelected={isSelectedCell(x, y)} //verifica se ta selecionada
            />
          );
        } else {
          cells.push(
            <Cell
              color={Colors.WHITE}
              x={boardLetter}
              y={y}
              key={`${boardLetter}-${y}`}
              isAvailableForMove={isAvailableCellForMove(x, y)}
              isHavingFigure={isCellHavingFigure(x, y)}
              cellClicked={cellClicked}
              isSelected={isSelectedCell(x, y)}
            />
          );
        }
      }
    }
    return cells;
  };

  const isEatableFigure = (figure: FigureData): boolean => {
    if (!choseFigurePos) return false;
    return choseFigurePos.availableCells[`${figure.x}-${figure.y}`]; //verifica se a celula que o jogador quer capturar esta disponivel para captura
  };

  const isSelectedFigure = (figure: FigureData): boolean => {
    if (!choseFigurePos) return false;
    return choseFigurePos.figure.id === figure.id; //retorna se a figura esta selecionada
  };

  const isSelectedCell = (x: number, y: number): boolean => {
    if (!choseFigurePos) return false;
    return choseFigurePos.figure.x === x && choseFigurePos.figure.y === y; //retorna se a celula esta selecionada
  };

  const initFigures = (): JSX.Element[] => {
    const figuresJSX: JSX.Element[] = [];

    for (let item in figures) {
      if (!figures[item].id || !figures[item].color) continue;
      cellsFigure[`${figures[item].x}-${figures[item].y}`] = figures[item]; //passa a peça para o objeto cellsFigure
      figuresJSX.push(
        <Figure
          figureClicked={figureClicked}
          key={figures[item].id}
          figure={figures[item]}
          isEatable={isEatableFigure(figures[item])}
          isSelected={isSelectedFigure(figures[item])}
        />
      );
    }

    return figuresJSX;
  };

  const resizeBoard = () => {
    const paddingsWidth = 48 + 12;
    const paddingHeight = 52 + 12;

    if (boardRef.current) {
      const board = boardRef.current;
      board.style.height = '';
      board.style.width = '';

      const boardRect = board.getBoundingClientRect();
      const boardWidth = boardRect.width - paddingsWidth + paddingHeight;
      const boardHeight = boardRect.height - paddingHeight + paddingsWidth;

      if (boardHeight > boardWidth) {
        board.style.height = boardWidth + 'px';
      } else {
        board.style.width = boardHeight + 'px';
      }
    }
  };

  const figureClicked = (figure: FigureData) => {
    if (
      choseFigurePos && //verifica ha peça inicial selecionada pelo jogador
      choseFigurePos.availableCells[`${figure.x}-${figure.y}`] && //verifica a peça selecionada pelo jogador esta disponivel
      choseFigurePos.figure.color !== figure.color //verifica se a cor é diferente da peça destino
    ) {
      moveOrEat(choseFigurePos.figure, figure.x, figure.y);
      nextAIMoveDelayed();
      return;
    }

    if (
      choseFigurePos && //verifica ha peça inicial selecionada pelo jogador
      choseFigurePos.figure.name === figure.name &&
      figure.x === choseFigurePos.figure.x &&
      choseFigurePos.figure.y === figure.y &&
      choseFigurePos.figure.color === figure.color
    ) {
      //no geral verifica se a peça inicial é a mesmo que ele selecionou depois
      setChoseFigurePos(null);
      return;
    }

    if (sides.ally !== figure.color) return; //jogador tentando selecionar uma peça adversaria

    //ve se precisa proteger o rei
    //verifica se a peça selecionada nao é o proprio rei (pois n é permitido)
    if (isKingInCheck && figure.name !== Figures.KING) return;

    //se nada acima funcionar, apenas mostra pro jogador(a) as celulas disponiveis para clique
    setChoseFigurePos({
      figure,
      availableCells: getAvailableCells(figure),
    });
  };

  const endGame = (winner: Colors) => {
    dispatch(setGameWon(winner));
    dispatch(setGameStarted(false));
  };

  const eatFigure = (figure: FigureData): void => {
    cellsFigure[`${figure.x}-${figure.y}`] = null; //deixa a celula do adversario nula
    if (figure.name === Figures.KING) {
      //se for o rei, o jogo acaba
      endGame(getOtherColor(figure.color));
    }
    dispatch(removeFigure(figure)); //remove figura do tabuleiro
  };

  const moveOrEat = (figure: FigureData, x: number, y: number): void => {
    const figureOnCell = cellsFigure[`${x}-${y}`]; //peça destino
    if (figureOnCell && figureOnCell.color !== figure.color)
      //verifica se é diferente da peça do jogador
      eatFigure(figureOnCell); //se sim, come
    moveOn(figure, x, y); //e move
  };

  const getAvailableCells = (
    figure: FigureData,
    isForDangerousCells: boolean = false
  ): { [key: string]: boolean } => {
    let way: { y: number; x: number }[] = [];

    const toStopWay = (x: number, y: number): boolean => {
      if (cellsFigure[`${x}-${y}`] === undefined) return true; //se nao existir
      if (cellsFigure[`${x}-${y}`]) return true; //se ja tiver figura na celula
      return false;
    };

    const checkCellForMove = (x: number, y: number): boolean => {
      if (toStopWay(x, y)) return false; //se ja estiver ocupada
      way.push({ x, y }); //se nao, só deixa a celula available
      return true;
    };

    const verticalTop = (toY: number, fromY: number = figure.y) => {
      for (let i = fromY + 1; i <= toY; i++) {
        if (toStopWay(figure.x, i)) return;
        way.push({ y: i, x: figure.x });
      }
    };

    const verticalBottom = (toY: number, fromY: number = figure.y) => {
      for (let i = fromY - 1; i >= toY; i--) {
        if (toStopWay(figure.x, i)) return;
        way.push({ y: i, x: figure.x });
      }
    };

    const horizontalLeft = (toX: number, fromX: number = figure.x) => {
      for (let i = fromX - 1; i >= toX; i--) {
        if (toStopWay(i, figure.y)) return;
        way.push({ x: i, y: figure.y });
      }
    };

    const horizontalRight = (toX: number, fromX: number = figure.x) => {
      for (let i = fromX + 1; i <= toX; i++) {
        if (toStopWay(i, figure.y)) return;
        way.push({ x: i, y: figure.y });
      }
    };

    const checkDiagonal = () => {
      // top right
      for (let i = 1; i <= 8; i++) {
        if (!checkCellForMove(figure.x + i, figure.y + i)) break;
      }
      // bottom right
      for (let i = 1; i <= 8; i++) {
        if (!checkCellForMove(figure.x + i, figure.y - i)) break;
      }
      // bottom left
      for (let i = 1; i <= 8; i++) {
        if (!checkCellForMove(figure.x - i, figure.y - i)) break;
      }
      for (let i = 1; i <= 8; i++) {
        if (!checkCellForMove(figure.x - i, figure.y + i)) break;
      }
    };

    const checkEatableFiguresByDiagonal = () => {
      for (let i = 1; i <= 8; i++) {
        if (checkEatableOrAlliesCell(figure.x + i, figure.y + i)) break;
      }
      // bottom right
      for (let i = 1; i <= 8; i++) {
        if (checkEatableOrAlliesCell(figure.x + i, figure.y - i)) break;
      }
      // bottom left
      for (let i = 1; i <= 8; i++) {
        if (checkEatableOrAlliesCell(figure.x - i, figure.y - i)) break;
      }
      for (let i = 1; i <= 8; i++) {
        if (checkEatableOrAlliesCell(figure.x - i, figure.y + i)) break;
      }
    };

    const isEatableCell = (x: number, y: number): boolean => {
      if (
        cellsFigure[`${x}-${y}`] &&
        figure.color !== cellsFigure[`${x}-${y}`]?.color
      )
        return true;
      return false;
    };

    const checkEatableCell = (x: number, y: number): boolean => {
      if (isEatableCell(x, y)) {
        way.push({ x, y });
        return true;
      }
      return false;
    };

    const checkEatableOrAlliesCell = (x: number, y: number): boolean => {
      if (
        cellsFigure[`${x}-${y}`] &&
        cellsFigure[`${x}-${y}`]?.color === figure.color
      )
        return true;
      if (isEatableCell(x, y)) {
        way.push({ x, y });
        return true;
      }
      return false;
    };

    // PAWN
    const checkEatableFiguresByPawn = () => {
      if (figure.color === Colors.BLACK) {
        checkEatableCell(figure.x - 1, figure.y - 1);
        checkEatableCell(figure.x + 1, figure.y - 1);
      } else {
        checkEatableCell(figure.x - 1, figure.y + 1);
        checkEatableCell(figure.x + 1, figure.y + 1);
      }
    };

    if (figure.name === Figures.PAWN) {
      if (figure.color === Colors.BLACK) {
        if (!isForDangerousCells) {
          verticalBottom(figure.y - 2);
        } else {
          way.push({ y: figure.y - 1, x: figure.x - 1 });
          way.push({ y: figure.y - 1, x: figure.x + 1 });
        }
      }
      if (figure.color === Colors.WHITE) {
        if (!isForDangerousCells) {
          verticalTop(figure.y + 2);
        } else {
          way.push({ y: figure.y + 1, x: figure.x - 1 });
          way.push({ y: figure.y + 1, x: figure.x + 1 });
        }
      }
      checkEatableFiguresByPawn();
    }

    // ROOK
    const checkEatableFiguresByRook = () => {
      // check top
      for (let i = figure.y + 1; i <= 8; i++) {
        if (checkEatableOrAlliesCell(figure.x, i)) break;
      }
      // check bottom
      for (let i = figure.y - 1; i >= 0; i--) {
        if (checkEatableOrAlliesCell(figure.x, i)) break;
      }
      // check left
      for (let i = figure.x - 1; i >= 0; i--) {
        if (checkEatableOrAlliesCell(i, figure.y)) break;
      }
      // check right
      for (let i = figure.x + 1; i <= 8; i++) {
        if (checkEatableOrAlliesCell(i, figure.y)) break;
      }
    };

    if (figure.name === Figures.ROOK) {
      verticalBottom(0);
      verticalTop(8);
      horizontalLeft(0);
      horizontalRight(8);
      checkEatableFiguresByRook();
    }

    // KNIGHT
    const checkMovesByKnight = () => {
      checkCellForMove(figure.x + 1, figure.y + 2);
      checkCellForMove(figure.x - 1, figure.y + 2);
      checkCellForMove(figure.x + 2, figure.y + 1);
      checkCellForMove(figure.x + 2, figure.y - 1);
      checkCellForMove(figure.x + 1, figure.y - 2);
      checkCellForMove(figure.x - 1, figure.y - 2);
      checkCellForMove(figure.x - 2, figure.y - 1);
      checkCellForMove(figure.x - 2, figure.y + 1);
    };

    const checkEatableFiguresByKnight = () => {
      checkEatableOrAlliesCell(figure.x + 1, figure.y + 2);
      checkEatableOrAlliesCell(figure.x - 1, figure.y + 2);
      checkEatableOrAlliesCell(figure.x + 2, figure.y + 1);
      checkEatableOrAlliesCell(figure.x + 2, figure.y - 1);
      checkEatableOrAlliesCell(figure.x + 1, figure.y - 2);
      checkEatableOrAlliesCell(figure.x - 1, figure.y - 2);
      checkEatableOrAlliesCell(figure.x - 2, figure.y - 1);
      checkEatableOrAlliesCell(figure.x - 2, figure.y + 1);
    };

    if (figure.name === Figures.KNIGHT) {
      checkMovesByKnight();
      checkEatableFiguresByKnight();
    }

    // BISHOP
    if (figure.name === Figures.BISHOP) {
      checkDiagonal();
      checkEatableFiguresByDiagonal();
    }

    // QUEEN
    if (figure.name === Figures.QUEEN) {
      checkDiagonal();
      checkEatableFiguresByDiagonal();
      verticalBottom(0);
      verticalTop(8);
      horizontalLeft(0);
      horizontalRight(8);
      checkEatableFiguresByRook();
    }

    // KING
    const checkKingDiagonal = () => {
      checkCellForMove(figure.x + 1, figure.y + 1);
      checkCellForMove(figure.x + 1, figure.y - 1);
      checkCellForMove(figure.x - 1, figure.y - 1);
      checkCellForMove(figure.x - 1, figure.y + 1);
    };

    const checkEatableFiguresByKing = () => {
      checkEatableOrAlliesCell(figure.x + 1, figure.y + 1);
      checkEatableOrAlliesCell(figure.x + 1, figure.y - 1);
      checkEatableOrAlliesCell(figure.x - 1, figure.y - 1);
      checkEatableOrAlliesCell(figure.x - 1, figure.y + 1);
      checkEatableOrAlliesCell(figure.x + 1, figure.y);
      checkEatableOrAlliesCell(figure.x - 1, figure.y);
      checkEatableOrAlliesCell(figure.x, figure.y + 1);
      checkEatableOrAlliesCell(figure.x, figure.y - 1);
    };

    if (figure.name === Figures.KING) {
      verticalBottom(figure.y - 1);
      verticalTop(figure.y + 1);
      horizontalLeft(figure.x - 1);
      horizontalRight(figure.x + 1);
      checkKingDiagonal();
      checkEatableFiguresByKing();

      const cellsForRemoving: { x: number; y: number }[] = [];
      for (let i = 0; i < way.length; i++) {
        if (
          dangerousCells.current[getOtherColor(figure.color)][
            `${way[i].x}-${way[i].y}`
          ]
        ) {
          cellsForRemoving.push({ x: way[i].x, y: way[i].y });
        }
      }
      cellsForRemoving.forEach((elw) => {
        way = way.filter((el) => !(el.y === elw.y && el.x === elw.x));
      });
    }

    const obj: { [key: string]: boolean } = {};
    way.forEach((el) => {
      obj[`${el.x}-${el.y}`] = true;
    });
    return obj;
  };

  const nextAIMove = () => {
    const figures = store.getState().game.figures;

    const bestMove = minmax(
      3,
      true,
      figures,
      -Infinity,
      Infinity,
      currentTurn,
      getAvailableCells
    );

    if (bestMove.bestMove) {
      const { figureId, x, y } = bestMove.bestMove;
      moveOrEat(figures[figureId], x, y);
    }
  };

  const nextAIMoveDelayed = (delay: number = 200) => {
    nextAIMove();
  };

  const getFiguresBySide = (color: Colors) => {
    return Object.keys(figures)
      .filter((figureId) => figures[figureId].color === color)
      .map((figureId) => figures[figureId]);
  };

  const updateAllAvailableCells = () => {
    dangerousCells.current.white = {};
    dangerousCells.current.black = {};
    const whiteFigures = getFiguresBySide(Colors.WHITE);
    const blackFigures = getFiguresBySide(Colors.BLACK);
    whiteFigures.forEach((figure) => {
      dangerousCells.current.white = {
        ...dangerousCells.current.white,
        ...getAvailableCells(figure, true),
      };
    });
    blackFigures.forEach((figure) => {
      dangerousCells.current.black = {
        ...dangerousCells.current.black,
        ...getAvailableCells(figure, true),
      };
    });
  };

  const getOtherColor = (color: Colors) => {
    return color === Colors.BLACK ? Colors.WHITE : Colors.BLACK;
  };

  const checkIsKingInCheck = (color: Colors) => {
    updateAllAvailableCells();
    const kings = {
      [Colors.WHITE]: figures['white-king-5-1'],
      [Colors.BLACK]: figures['black-king-5-8'],
    };
    const king = kings[color];
    if (!king) return;
    if (dangerousCells.current[getOtherColor(color)][`${king.x}-${king.y}`])
      setIsKingInCheck(true);
    else setIsKingInCheck(false);
  };

  const getGameWonJSX = (): JSX.Element | null => {
    if (!gameWon) return null;
    const color = gameWon[0].toUpperCase() + gameWon.slice(1);

    return (
      <div className={styles.gameWon}>
        <h2 className={styles.gameWonTitle}>{color} won</h2>
        <Link to="/" className={styles.gameWonButton}>
          Main page
        </Link>
      </div>
    );
  };

  useEffect(() => {
    checkIsKingInCheck(sides.ally);
  }, [figures]);

  useEffect(() => {
    resizeBoard();
    window.addEventListener('resize', resizeBoard);
    dispatch(setGameStarted(true));
  }, []);

  return (
    <div className={styles.boardWrapper} ref={boardRef}>
      <ul className={styles.boardLeft}>
        <li className={styles.boardLeftItem}>1</li>
        <li className={styles.boardLeftItem}>2</li>
        <li className={styles.boardLeftItem}>3</li>
        <li className={styles.boardLeftItem}>4</li>
        <li className={styles.boardLeftItem}>5</li>
        <li className={styles.boardLeftItem}>6</li>
        <li className={styles.boardLeftItem}>7</li>
        <li className={styles.boardLeftItem}>8</li>
      </ul>

      <ul className={styles.boardBottom}>
        <li className={styles.boardBottomItem}>A</li>
        <li className={styles.boardBottomItem}>B</li>
        <li className={styles.boardBottomItem}>C</li>
        <li className={styles.boardBottomItem}>D</li>
        <li className={styles.boardBottomItem}>E</li>
        <li className={styles.boardBottomItem}>F</li>
        <li className={styles.boardBottomItem}>G</li>
        <li className={styles.boardBottomItem}>H</li>
      </ul>

      <ul className={styles.board}>
        {initCells()}
        {initFigures()}
      </ul>

      {getGameWonJSX()}
    </div>
  );
};

export default Board;
