export const Filter = {
  exclude: <T>(arr: Set<T> | T[]) => {
    const excludeSet = arr instanceof Array ? new Set(arr) : arr;
    return (v: T) => !excludeSet.has(v);
  },
};

export function fillEmptyIndexes<T>(baseArr: (T | undefined)[], insertArr: T[]): T[] {
  const a = [...baseArr];
  const b = [...insertArr];

  for (let i = 0; i < a.length; i++) {
    if (a[i] === undefined) {
      a[i] = b.shift() as T;
    }
  }
  return a.concat(b) as T[];
}
