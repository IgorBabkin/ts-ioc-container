import { ObservableReader } from '../src';
import { of, Subject } from 'rxjs';
import { Mock, Times } from 'moq.ts';

describe('ObservableReader', () => {
    it('should keep current value of observable', () => {
        const obs$ = of(2);

        const reader = new ObservableReader(obs$, () => {});
        reader.enable();

        expect(reader.current).toBe(2);
    });

    it('should not invoke observer callback if observable already have value', () => {
        const obs$ = of(2);
        const mock = new Mock<(v: number) => void>();

        const reader = new ObservableReader(obs$, mock.object());
        reader.enable();

        mock.verify((i) => i(2), Times.Never());
    });

    it('should invoke observer callback', () => {
        const obs$ = new Subject<number>();
        const mock = new Mock<(v: number) => void>();

        const reader = new ObservableReader(obs$, mock.object());
        reader.enable();
        obs$.next(2);
        obs$.next(2);
        obs$.next(2);

        mock.verify((i) => i(2), Times.Exactly(3));
    });

    it('should not listen to changes if it is disabled', () => {
        const obs$ = new Subject<number>();
        const mock = new Mock<(v: number) => void>();

        const reader = new ObservableReader(obs$, mock.object());
        reader.enable();
        obs$.next(1);
        reader.disable();
        obs$.next(2);

        expect(reader.current).toBe(1);
        mock.verify((i) => i(2), Times.Never());
    });

    it('shound start listening until it is enabled', () => {
        const obs$ = new Subject<number>();
        const mock = new Mock<(v: number) => void>();

        const reader = new ObservableReader(obs$, mock.object());
        obs$.next(2);

        expect(reader.current).toBeUndefined();
        mock.verify((i) => i(2), Times.Never());
    });

    it('shound stop reading changes since it is disposed', () => {
        const obs$ = new Subject<number>();
        const mock = new Mock<(v: number) => void>();

        const reader = new ObservableReader(obs$, mock.object());
        reader.enable();
        obs$.next(1);
        reader.dispose();
        obs$.next(2);

        expect(reader.current).toBe(1);
        mock.verify((i) => i(2), Times.Never());
    });

    it('should be prevented of double enabling', () => {
        const obs$ = new Subject<number>();
        const mock = new Mock<(v: number) => void>();

        const reader = new ObservableReader(obs$, mock.object());
        reader.enable();
        obs$.next(1);
        reader.enable();
        obs$.next(2);

        expect(reader.current).toBe(2);
        mock.verify((i) => i(2), Times.Once());
    });
});
