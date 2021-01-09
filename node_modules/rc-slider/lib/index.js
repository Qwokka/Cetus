"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "Range", {
  enumerable: true,
  get: function get() {
    return _Range.default;
  }
});
Object.defineProperty(exports, "Handle", {
  enumerable: true,
  get: function get() {
    return _Handle.default;
  }
});
Object.defineProperty(exports, "createSliderWithTooltip", {
  enumerable: true,
  get: function get() {
    return _createSliderWithTooltip.default;
  }
});
exports.default = void 0;

var _Slider = _interopRequireDefault(require("./Slider"));

var _Range = _interopRequireDefault(require("./Range"));

var _Handle = _interopRequireDefault(require("./Handle"));

var _createSliderWithTooltip = _interopRequireDefault(require("./createSliderWithTooltip"));

_Slider.default.Range = _Range.default;
_Slider.default.Handle = _Handle.default;
_Slider.default.createSliderWithTooltip = _createSliderWithTooltip.default;
var _default = _Slider.default;
exports.default = _default;