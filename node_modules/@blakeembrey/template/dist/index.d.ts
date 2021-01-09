export declare type Template<T extends object> = (data: T) => string;
/**
 * Stringify a template into a function.
 */
export declare function compile(value: string, displayName?: string): string;
/**
 * Fast and simple string templates.
 */
export declare function template<T extends object = object>(value: string, displayName?: string): Template<T>;
