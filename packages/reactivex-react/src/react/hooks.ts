import { Observable } from 'rxjs';
import { useCallback, useEffect, useMemo } from 'react';
import { IObservableStorage } from '../storage/IObservableStorage';
import { useForceUpdate } from './core';
import { CleanMode, ObservableStorageBuilder } from '../storage/ObservableStorageBuilder';
import { ObservableReader } from '../storage/reader/ObservableReader';
import { IObservableReader } from '../storage/reader/IObservableReader';

export type Reader = <T>(obs$: Observable<T>) => T | undefined;

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
  return useCallback((obs$) => observableStorage.getValue(obs$), [observableStorage]);
}

function useObservableReader<T>(obs$: Observable<T>, onUpdate: () => void): IObservableReader<T> {
  return useMemo(() => new ObservableReader(obs$, onUpdate).enable(), [obs$, onUpdate]);
}

export const useObservable: Reader = (obs$, onUpdate?: () => void) => {
  const forceUpdate = useForceUpdate();
  const reader = useObservableReader(obs$, onUpdate || forceUpdate);
  useEffect(
    () => () => {
      reader.disable();
    },
    [reader],
  );
  return reader.current;
};
