import React from 'react';
import { FC } from 'react';

export const AboutPage: FC<{ onChangePage: () => void }> = ({ onChangePage }) => {
  return (
    <div>
      <h3>AboutPage</h3>
      <button onClick={onChangePage}>HomePage</button>
    </div>
  );
};
