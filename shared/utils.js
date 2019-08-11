/**
Copyright 2019 Jack Baker

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const toHex = function(i) {
	return '0x' + parseInt(i).toString(16).padStart(8, '0');
};

// This function controls how values are displayed to the user
// This could be improved, but as is all integers > 0x1000 are
// displayed as hex
const formatValue = function(value, memType) {
    switch (memType) {
        case "i8":
        case "i16":
        case "i32":
        case "i64":
            return formatInteger(value);
        case "f32":
        case "f64":
            return value;
        default:
            throw new Error("Invalid memory type " + type + " in formatValue()");
    }
};

const formatInteger = function(value) {
    if (value > 0x1000) {
        return toHex(value);
    }

    return value;
};

// TODO Move to extension class
const sendContentMessage = function(type, msgBody) {
    const msg = {
        type: type,
        body: msgBody
    };

	chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
		const activeTab = tabs[0];
        try {
            chrome.tabs.sendMessage(activeTab.id, msg);
        }
        catch (e) {
            // TODO Handle tab closed
            return;
        }
	});
};

const storageSet = function(valueObj) {
    chrome.storage.local.set(valueObj);
};

const storageGet = function(key, callback) {
    chrome.storage.local.get(key, callback);
};

const isValidMemType = function(memType) {
    switch (memType) {
        case "i8":
        case "i16":
        case "i32":
        case "f32":
        case "i64":
        case "f64":
            return true;
        default:
            return false;
    }
};

const getElementSize = function(type) {
    let indexSize;
    
    switch (type) {
        case "i8":
            indexSize = 1;
            break;
        case "i16":
            indexSize = 2;
            break;
        case "i32":
            indexSize = 4;
            break;
        case "i64":
            indexSize = 8;
            break;
        case "f32":
            indexSize = 4;
            break;
        case "f64":
            indexSize = 8;
            break;
        default:
            throw new Error("Invalid memory type " + type + " in getElementSize()");
    }
    
    return indexSize;
};

// Converts the index into a TypedArray into the "real" memory address
// For example, index 0x1000 into the Int32Array translates to address 0x4000
// (0x1000 * sizeof(Int32))
const indexToRealAddress = function(memIndex, memType) {
    const memSize = getElementSize(memType);

    return memIndex * memSize;
};

const realAddressToIndex = function(memAddr, memType) {
    const memSize = getElementSize(memType);

    return Math.floor(memAddr / memSize);
};

// Converts a value to its float32 representation so it can more easily
// be handled from within WASM.
const convertToI32 = function(value, type) {
    switch (type) {
        case "i8":
        case "i16":
        case "i32":
            return value;
        case "f32":
            const floatArray = new Float32Array([value]);
            const i32Array = new Uint32Array(floatArray.buffer);

            return i32Array[0];
        case "i64":
        case "f64":
        default:
            throw new Error("Conversion " + type + " not implemented in convertToI32()");
    }
};

// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
const downloadText = function(filename, text) {
      const anchorElement = document.createElement('a');
      anchorElement.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      anchorElement.setAttribute('download', filename);

      anchorElement.style.display = 'none';
      document.body.appendChild(anchorElement);

      anchorElement.click();

      document.body.removeChild(anchorElement);
};
