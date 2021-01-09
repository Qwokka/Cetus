'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var createSagaMiddleware = require('@redux-saga/core');
var createSagaMiddleware__default = _interopDefault(createSagaMiddleware);



Object.keys(createSagaMiddleware).forEach(function (k) {
	if (k !== 'default') Object.defineProperty(exports, k, {
		enumerable: true,
		get: function () {
			return createSagaMiddleware[k];
		}
	});
});
exports.default = createSagaMiddleware__default;
