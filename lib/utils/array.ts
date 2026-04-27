export const Filter = {
  exclude: <T>(arr: Set<T> | T[]) => {
    const excludeSet = arr instanceof Array ? new Set(arr) : arr;
    return (v: T) => !excludeSet.has(v);
  },
};
