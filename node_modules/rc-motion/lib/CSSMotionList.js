"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.genCSSMotionList = genCSSMotionList;
exports.default = void 0;

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread2"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _createSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/createSuper"));

var React = _interopRequireWildcard(require("react"));

var _CSSMotion = _interopRequireDefault(require("./CSSMotion"));

var _motion = require("./util/motion");

var _diff = require("./util/diff");

/* eslint react/prop-types: 0 */
var MOTION_PROP_NAMES = ['eventProps', 'visible', 'children', 'motionName', 'motionAppear', 'motionEnter', 'motionLeave', 'motionLeaveImmediately', 'motionDeadline', 'removeOnLeave', 'leavedClassName', 'onAppearStart', 'onAppearActive', 'onAppearEnd', 'onEnterStart', 'onEnterActive', 'onEnterEnd', 'onLeaveStart', 'onLeaveActive', 'onLeaveEnd'];

function genCSSMotionList(transitionSupport) {
  var CSSMotion = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _CSSMotion.default;

  var CSSMotionList = /*#__PURE__*/function (_React$Component) {
    (0, _inherits2.default)(CSSMotionList, _React$Component);

    var _super = (0, _createSuper2.default)(CSSMotionList);

    function CSSMotionList() {
      var _this;

      (0, _classCallCheck2.default)(this, CSSMotionList);
      _this = _super.apply(this, arguments);
      _this.state = {
        keyEntities: []
      };

      _this.removeKey = function (removeKey) {
        _this.setState(function (_ref) {
          var keyEntities = _ref.keyEntities;
          return {
            keyEntities: keyEntities.map(function (entity) {
              if (entity.key !== removeKey) return entity;
              return (0, _objectSpread2.default)((0, _objectSpread2.default)({}, entity), {}, {
                status: _diff.STATUS_REMOVED
              });
            })
          };
        });
      };

      return _this;
    }

    (0, _createClass2.default)(CSSMotionList, [{
      key: "render",
      value: function render() {
        var _this2 = this;

        var keyEntities = this.state.keyEntities;
        var _this$props = this.props,
            component = _this$props.component,
            children = _this$props.children,
            restProps = (0, _objectWithoutProperties2.default)(_this$props, ["component", "children"]);
        var Component = component || React.Fragment;
        var motionProps = {};
        MOTION_PROP_NAMES.forEach(function (prop) {
          motionProps[prop] = restProps[prop];
          delete restProps[prop];
        });
        delete restProps.keys;
        return React.createElement(Component, Object.assign({}, restProps), keyEntities.map(function (_ref2) {
          var status = _ref2.status,
              eventProps = (0, _objectWithoutProperties2.default)(_ref2, ["status"]);
          var visible = status === _diff.STATUS_ADD || status === _diff.STATUS_KEEP;
          return React.createElement(CSSMotion, Object.assign({}, motionProps, {
            key: eventProps.key,
            visible: visible,
            eventProps: eventProps,
            onLeaveEnd: function onLeaveEnd() {
              if (motionProps.onLeaveEnd) {
                motionProps.onLeaveEnd.apply(motionProps, arguments);
              }

              _this2.removeKey(eventProps.key);
            }
          }), children);
        }));
      }
    }], [{
      key: "getDerivedStateFromProps",
      value: function getDerivedStateFromProps(_ref3, _ref4) {
        var keys = _ref3.keys;
        var keyEntities = _ref4.keyEntities;
        var parsedKeyObjects = (0, _diff.parseKeys)(keys); // Always as keep when motion not support

        if (!transitionSupport) {
          return {
            keyEntities: parsedKeyObjects.map(function (obj) {
              return (0, _objectSpread2.default)((0, _objectSpread2.default)({}, obj), {}, {
                status: _diff.STATUS_KEEP
              });
            })
          };
        }

        var mixedKeyEntities = (0, _diff.diffKeys)(keyEntities, parsedKeyObjects);
        var keyEntitiesLen = keyEntities.length;
        return {
          keyEntities: mixedKeyEntities.filter(function (entity) {
            // IE 9 not support Array.prototype.find
            var prevEntity = null;

            for (var i = 0; i < keyEntitiesLen; i += 1) {
              var currentEntity = keyEntities[i];

              if (currentEntity.key === entity.key) {
                prevEntity = currentEntity;
                break;
              }
            } // Remove if already mark as removed


            if (prevEntity && prevEntity.status === _diff.STATUS_REMOVED && entity.status === _diff.STATUS_REMOVE) {
              return false;
            }

            return true;
          })
        };
      }
    }]);
    return CSSMotionList;
  }(React.Component);

  CSSMotionList.defaultProps = {
    component: 'div'
  };
  return CSSMotionList;
}

var _default = genCSSMotionList(_motion.supportTransition);

exports.default = _default;