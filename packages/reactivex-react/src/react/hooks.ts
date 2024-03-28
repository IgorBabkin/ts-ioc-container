import { Observable } from 'rxjs';
import { useCallback, useEffect, useMemo } from 'react';
import { IObservableStorage } from '../storage/IObservableStorage';
import { useForceUpdate } from './core';
import { CleanMode, ObservableStorageBuilder } from '../storage/ObservableStorageBuilder';

export type Reader = <T>(obs$: Observable<T>, initial: T) => T;

export type UseObservablesProps = {
  unusedReaderStrategy: CleanMode;
  onUpdate: () => void;
};

function useObservableStorage(props: Partial<UseObservablesProps> = {}): IObservableStorage {
  const forceUpdate = useForceUpdate();
  const { onUpdate = forceUpdate, unusedReaderStrategy = 'disable-reader' } = props;
  return useMemo(
    () => ObservableStorageBuilder.fromObserver(onUpdate).changeCleanupMode(unusedReaderStrategy).build(),
    [onUpdate, unusedReaderStrategy],
  );
}

export function useObservables(props: Partial<UseObservablesProps> = {}): Reader {
  const observableStorage = useObservableStorage(props);
  useEffect(() => () => observableStorage.dispose(), [observableStorage]);
  useEffect(() => observableStorage.cleanup());
  return useCallback((obs$, initial) => observableStorage.getValue(obs$, initial), [observableStorage]);
}
