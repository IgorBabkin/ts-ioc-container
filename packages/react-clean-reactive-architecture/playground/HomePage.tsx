import React from 'react';
import { FC } from 'react';

export const HomePage: FC<{ onChangePage: () => void }> = ({ onChangePage }) => {
  return (
    <div>
      <h3>HomePage</h3>
      <button onClick={onChangePage}>HomePage</button>
    </div>
  );
};
