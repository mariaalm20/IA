import React from 'react';
import styles from './Board.module.scss';
import { BoardNumberByLetter, Colors } from '../../types';
import classNames from 'classnames/bind';
import figure from '../Figure/Figure';

interface CellProps {
  color: Colors;
  x: string;
  y: number;
  cellClicked: (x: number, y: number) => void;
  isAvailableForMove?: boolean;
  isHavingFigure?: boolean;
  isSelected?: boolean;
}

const Cell = (props: CellProps) => {
  const cx = classNames.bind(styles);
  return (
    <li
      onClick={() => props.cellClicked(BoardNumberByLetter[props.x], props.y)}
      id={`cell-${props.x}-${props.y}`}
      className={cx(styles.cell, {
        [styles.cellWhite]: props.color === Colors.WHITE,
        [styles.cellBlack]: props.color === Colors.BLACK,
        [styles.availableCell]:
          props.isAvailableForMove && !props.isHavingFigure,
        [styles.cellSelected]: props.isSelected,
      })}
    >
      <div
        className={cx(styles.cellCircle, {
          [styles.cellCircleShow]:
            props.isAvailableForMove && !props.isHavingFigure,
        })}
      ></div>
    </li>
  );
};

export default Cell;
