import { useCallback, useState } from 'react';

export const useForceUpdate = (): (() => void) => {
    const [, updateState] = useState({});
    return useCallback(() => updateState({}), []);
};
