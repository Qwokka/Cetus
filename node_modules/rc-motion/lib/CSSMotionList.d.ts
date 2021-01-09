import * as React from 'react';
import { CSSMotionProps } from './CSSMotion';
import { KeyObject } from './util/diff';
export interface CSSMotionListProps extends CSSMotionProps {
    keys: (React.Key | {
        key: React.Key;
        [name: string]: any;
    })[];
    component?: string | React.ComponentType | false;
}
export interface CSSMotionListState {
    keyEntities: KeyObject[];
}
export declare function genCSSMotionList(transitionSupport: boolean, CSSMotion?: React.ForwardRefExoticComponent<CSSMotionProps>): React.ComponentClass<CSSMotionListProps>;
declare const _default: React.ComponentClass<CSSMotionListProps, any>;
export default _default;
