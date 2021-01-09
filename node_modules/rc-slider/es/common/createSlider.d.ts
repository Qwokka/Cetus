/// <reference types="react" />
export default function createSlider(Component: any): {
    new (props: any): {
        [x: string]: any;
        componentDidMount(): void;
        componentWillUnmount(): void;
        onMouseDown: (e: any) => void;
        onTouchStart: (e: any) => void;
        onFocus: (e: any) => void;
        onBlur: (e: any) => void;
        onMouseUp: () => void;
        onMouseMove: (e: any) => void;
        onTouchMove: (e: any) => void;
        onKeyDown: (e: any) => void;
        onClickMarkLabel: (e: any, value: any) => void;
        getSliderStart(): any;
        getSliderLength(): any;
        addDocumentTouchEvents(): void;
        addDocumentMouseEvents(): void;
        removeDocumentEvents(): void;
        focus(): void;
        blur(): void;
        calcValue(offset: any): any;
        calcValueByPos(position: any): any;
        calcOffset(value: any): number;
        saveSlider: (slider: any) => void;
        saveHandle(index: any, handle: any): void;
        render(): JSX.Element;
    };
    [x: string]: any;
    displayName: string;
    defaultProps: any;
};
