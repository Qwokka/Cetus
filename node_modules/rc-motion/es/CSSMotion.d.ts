import * as React from 'react';
import { MotionEventHandler, MotionEndEventHandler, MotionStatus } from './interface';
export declare type CSSMotionConfig = boolean | {
    transitionSupport?: boolean;
    forwardRef?: boolean;
};
export declare type MotionName = string | {
    appear?: string;
    enter?: string;
    leave?: string;
    appearActive?: string;
    enterActive?: string;
    leaveActive?: string;
};
export interface CSSMotionProps {
    motionName?: MotionName;
    visible?: boolean;
    motionAppear?: boolean;
    motionEnter?: boolean;
    motionLeave?: boolean;
    motionLeaveImmediately?: boolean;
    motionDeadline?: number;
    removeOnLeave?: boolean;
    leavedClassName?: string;
    eventProps?: object;
    onAppearStart?: MotionEventHandler;
    onEnterStart?: MotionEventHandler;
    onLeaveStart?: MotionEventHandler;
    onAppearActive?: MotionEventHandler;
    onEnterActive?: MotionEventHandler;
    onLeaveActive?: MotionEventHandler;
    onAppearEnd?: MotionEndEventHandler;
    onEnterEnd?: MotionEndEventHandler;
    onLeaveEnd?: MotionEndEventHandler;
    internalRef?: React.Ref<any>;
    children?: (props: {
        className?: string;
        style?: React.CSSProperties;
        [key: string]: any;
    }, ref: (node: any) => void) => React.ReactNode;
}
export interface CSSMotionState {
    status?: MotionStatus;
    statusActive?: boolean;
    newStatus?: boolean;
    statusStyle?: React.CSSProperties;
    prevProps?: CSSMotionProps;
}
/**
 * `transitionSupport` is used for none transition test case.
 * Default we use browser transition event support check.
 */
export declare function genCSSMotion(config: CSSMotionConfig): React.ForwardRefExoticComponent<CSSMotionProps>;
declare const _default: React.ForwardRefExoticComponent<CSSMotionProps>;
export default _default;
