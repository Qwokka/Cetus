"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.genCSSMotion = genCSSMotion;
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread2"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _createSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/createSuper"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var React = _interopRequireWildcard(require("react"));

var _findDOMNode = _interopRequireDefault(require("rc-util/lib/Dom/findDOMNode"));

var _ref2 = require("rc-util/lib/ref");

var _classnames = _interopRequireDefault(require("classnames"));

var _raf = _interopRequireDefault(require("raf"));

var _motion = require("./util/motion");

var _interface = require("./interface");

/* eslint-disable react/default-props-match-prop-types, react/no-multi-comp, react/prop-types */

/**
 * `transitionSupport` is used for none transition test case.
 * Default we use browser transition event support check.
 */
function genCSSMotion(config) {
  var transitionSupport = config;
  var forwardRef = !!React.forwardRef;

  if ((0, _typeof2.default)(config) === 'object') {
    transitionSupport = config.transitionSupport;
    forwardRef = 'forwardRef' in config ? config.forwardRef : forwardRef;
  }

  function isSupportTransition(props) {
    return !!(props.motionName && transitionSupport);
  }

  var CSSMotion = /*#__PURE__*/function (_React$Component) {
    (0, _inherits2.default)(CSSMotion, _React$Component);

    var _super = (0, _createSuper2.default)(CSSMotion);

    function CSSMotion() {
      var _this;

      (0, _classCallCheck2.default)(this, CSSMotion);
      _this = _super.apply(this, arguments);
      _this.$cacheEle = null;
      _this.node = null;
      _this.raf = null;
      _this.destroyed = false;
      _this.deadlineId = null;
      _this.state = {
        status: _interface.STATUS_NONE,
        statusActive: false,
        newStatus: false,
        statusStyle: null
      };

      _this.onDomUpdate = function () {
        var _this$state = _this.state,
            status = _this$state.status,
            newStatus = _this$state.newStatus;
        var _this$props = _this.props,
            onAppearStart = _this$props.onAppearStart,
            onEnterStart = _this$props.onEnterStart,
            onLeaveStart = _this$props.onLeaveStart,
            onAppearActive = _this$props.onAppearActive,
            onEnterActive = _this$props.onEnterActive,
            onLeaveActive = _this$props.onLeaveActive,
            motionAppear = _this$props.motionAppear,
            motionEnter = _this$props.motionEnter,
            motionLeave = _this$props.motionLeave;

        if (!isSupportTransition(_this.props)) {
          return;
        } // Event injection


        var $ele = _this.getElement();

        if (_this.$cacheEle !== $ele) {
          _this.removeEventListener(_this.$cacheEle);

          _this.addEventListener($ele);

          _this.$cacheEle = $ele;
        } // Init status


        if (newStatus && status === _interface.STATUS_APPEAR && motionAppear) {
          _this.updateStatus(onAppearStart, null, null, function () {
            _this.updateActiveStatus(onAppearActive, _interface.STATUS_APPEAR);
          });
        } else if (newStatus && status === _interface.STATUS_ENTER && motionEnter) {
          _this.updateStatus(onEnterStart, null, null, function () {
            _this.updateActiveStatus(onEnterActive, _interface.STATUS_ENTER);
          });
        } else if (newStatus && status === _interface.STATUS_LEAVE && motionLeave) {
          _this.updateStatus(onLeaveStart, null, null, function () {
            _this.updateActiveStatus(onLeaveActive, _interface.STATUS_LEAVE);
          });
        }
      };

      _this.onMotionEnd = function (event) {
        if (event && !event.deadline && event.target !== _this.getElement()) {
          // event exists
          // not initiated by deadline
          // transitionend not fired by inner elements
          return;
        }

        var _this$state2 = _this.state,
            status = _this$state2.status,
            statusActive = _this$state2.statusActive;
        var _this$props2 = _this.props,
            onAppearEnd = _this$props2.onAppearEnd,
            onEnterEnd = _this$props2.onEnterEnd,
            onLeaveEnd = _this$props2.onLeaveEnd;

        if (status === _interface.STATUS_APPEAR && statusActive) {
          _this.updateStatus(onAppearEnd, {
            status: _interface.STATUS_NONE
          }, event);
        } else if (status === _interface.STATUS_ENTER && statusActive) {
          _this.updateStatus(onEnterEnd, {
            status: _interface.STATUS_NONE
          }, event);
        } else if (status === _interface.STATUS_LEAVE && statusActive) {
          _this.updateStatus(onLeaveEnd, {
            status: _interface.STATUS_NONE
          }, event);
        }
      };

      _this.setNodeRef = function (node) {
        var internalRef = _this.props.internalRef;
        _this.node = node;
        (0, _ref2.fillRef)(internalRef, node);
      };

      _this.getElement = function () {
        try {
          return (0, _findDOMNode.default)(_this.node || (0, _assertThisInitialized2.default)(_this));
        } catch (e) {
          /**
           * Fallback to cache element.
           * This is only happen when `motionDeadline` trigger but element removed.
           */
          return _this.$cacheEle;
        }
      };

      _this.addEventListener = function ($ele) {
        if (!$ele) return;
        $ele.addEventListener(_motion.transitionEndName, _this.onMotionEnd);
        $ele.addEventListener(_motion.animationEndName, _this.onMotionEnd);
      };

      _this.removeEventListener = function ($ele) {
        if (!$ele) return;
        $ele.removeEventListener(_motion.transitionEndName, _this.onMotionEnd);
        $ele.removeEventListener(_motion.animationEndName, _this.onMotionEnd);
      };

      _this.updateStatus = function (styleFunc, additionalState, event, callback) {
        var statusStyle = styleFunc ? styleFunc(_this.getElement(), event) : null;
        if (statusStyle === false || _this.destroyed) return;
        var nextStep;

        if (callback) {
          nextStep = function nextStep() {
            _this.nextFrame(callback);
          };
        }

        _this.setState((0, _objectSpread2.default)({
          statusStyle: (0, _typeof2.default)(statusStyle) === 'object' ? statusStyle : null,
          newStatus: false
        }, additionalState), nextStep); // Trigger before next frame & after `componentDidMount`

      };

      _this.updateActiveStatus = function (styleFunc, currentStatus) {
        // `setState` use `postMessage` to trigger at the end of frame.
        // Let's use requestAnimationFrame to update new state in next frame.
        _this.nextFrame(function () {
          var status = _this.state.status;
          if (status !== currentStatus) return;
          var motionDeadline = _this.props.motionDeadline;

          _this.updateStatus(styleFunc, {
            statusActive: true
          });

          if (motionDeadline > 0) {
            _this.deadlineId = setTimeout(function () {
              _this.onMotionEnd({
                deadline: true
              });
            }, motionDeadline);
          }
        });
      };

      _this.nextFrame = function (func) {
        _this.cancelNextFrame();

        _this.raf = (0, _raf.default)(func);
      };

      _this.cancelNextFrame = function () {
        if (_this.raf) {
          _raf.default.cancel(_this.raf);

          _this.raf = null;
        }
      };

      return _this;
    }

    (0, _createClass2.default)(CSSMotion, [{
      key: "componentDidMount",
      value: function componentDidMount() {
        this.onDomUpdate();
      }
    }, {
      key: "componentDidUpdate",
      value: function componentDidUpdate() {
        this.onDomUpdate();
      }
    }, {
      key: "componentWillUnmount",
      value: function componentWillUnmount() {
        this.destroyed = true;
        this.removeEventListener(this.$cacheEle);
        this.cancelNextFrame();
        clearTimeout(this.deadlineId);
      }
    }, {
      key: "render",
      value: function render() {
        var _classNames;

        var _this$state3 = this.state,
            status = _this$state3.status,
            statusActive = _this$state3.statusActive,
            statusStyle = _this$state3.statusStyle;
        var _this$props3 = this.props,
            children = _this$props3.children,
            motionName = _this$props3.motionName,
            visible = _this$props3.visible,
            removeOnLeave = _this$props3.removeOnLeave,
            leavedClassName = _this$props3.leavedClassName,
            eventProps = _this$props3.eventProps;
        if (!children) return null;

        if (status === _interface.STATUS_NONE || !isSupportTransition(this.props)) {
          if (visible) {
            return children((0, _objectSpread2.default)({}, eventProps), this.setNodeRef);
          }

          if (!removeOnLeave) {
            return children((0, _objectSpread2.default)((0, _objectSpread2.default)({}, eventProps), {}, {
              className: leavedClassName
            }), this.setNodeRef);
          }

          return null;
        }

        return children((0, _objectSpread2.default)((0, _objectSpread2.default)({}, eventProps), {}, {
          className: (0, _classnames.default)((0, _motion.getTransitionName)(motionName, status), (_classNames = {}, (0, _defineProperty2.default)(_classNames, (0, _motion.getTransitionName)(motionName, "".concat(status, "-active")), statusActive), (0, _defineProperty2.default)(_classNames, motionName, typeof motionName === 'string'), _classNames)),
          style: statusStyle
        }), this.setNodeRef);
      }
    }], [{
      key: "getDerivedStateFromProps",
      value: function getDerivedStateFromProps(props, _ref) {
        var prevProps = _ref.prevProps,
            prevStatus = _ref.status;
        if (!isSupportTransition(props)) return {};
        var visible = props.visible,
            motionAppear = props.motionAppear,
            motionEnter = props.motionEnter,
            motionLeave = props.motionLeave,
            motionLeaveImmediately = props.motionLeaveImmediately;
        var newState = {
          prevProps: props
        }; // Clean up status if prop set to false

        if (prevStatus === _interface.STATUS_APPEAR && !motionAppear || prevStatus === _interface.STATUS_ENTER && !motionEnter || prevStatus === _interface.STATUS_LEAVE && !motionLeave) {
          newState.status = _interface.STATUS_NONE;
          newState.statusActive = false;
          newState.newStatus = false;
        } // Appear


        if (!prevProps && visible && motionAppear) {
          newState.status = _interface.STATUS_APPEAR;
          newState.statusActive = false;
          newState.newStatus = true;
        } // Enter


        if (prevProps && !prevProps.visible && visible && motionEnter) {
          newState.status = _interface.STATUS_ENTER;
          newState.statusActive = false;
          newState.newStatus = true;
        } // Leave


        if (prevProps && prevProps.visible && !visible && motionLeave || !prevProps && motionLeaveImmediately && !visible && motionLeave) {
          newState.status = _interface.STATUS_LEAVE;
          newState.statusActive = false;
          newState.newStatus = true;
        }

        return newState;
      }
    }]);
    return CSSMotion;
  }(React.Component);

  CSSMotion.defaultProps = {
    visible: true,
    motionEnter: true,
    motionAppear: true,
    motionLeave: true,
    removeOnLeave: true
  };

  if (!forwardRef) {
    return CSSMotion;
  }

  return React.forwardRef(function (props, ref) {
    return React.createElement(CSSMotion, Object.assign({
      internalRef: ref
    }, props));
  });
}

var _default = genCSSMotion(_motion.supportTransition);

exports.default = _default;