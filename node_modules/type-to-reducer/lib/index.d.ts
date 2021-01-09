interface reducerMapFunction<S, A> {
  (state: S, action?: A): S;
}

interface reducerMapReturnFunction<S, A> {
  (state: S | undefined, action?: A): S;
}

interface reducerMap<S, A> {
  [key: string]: reducerMap<S, A> | reducerMapFunction<S, A>;
}

declare module 'type-to-reducer' {
  export default function typeToReducer<S, A = any>(
    reducerMap: reducerMap<S, A>,
    initialState: S,
  ): reducerMapReturnFunction<S, A>;
}
