/**
Copyright 2020 Jack Baker

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

const toHexByte = function(i) {
	return parseInt(i).toString(16).padStart(2, '0');
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
        case "ascii":
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

    // We do not query currentWindow because a detached dev tools panel may break
    // this assumtion. See issue #16
	chrome.tabs.query({ active: true }, function(tabs) {
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
        case "ascii":
        case "utf-8":
        case "bytes":
            return true;
        default:
            return false;
    }
};

const getElementSize = function(type) {
    let indexSize;
    
    switch (type) {
        case "i8":
        case "ascii":
        case "bytes":
            indexSize = 1;
            break;
        case "utf-8":
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

const getMemoryType = function(memType) {
    switch (memType) {
        case "i8":
        case "ascii":
        case "bytes":
            return Uint8Array;
        case "i16":
        case "utf-8":
            return Uint16Array;
        case "i32":
            return Uint32Array;
        case "i64":
            return BigInt64Array;
        case "f32":
            return Float32Array;
        case "f64":
            return Float64Array;
        default:
            throw new Error("Invalid memory type " + memType + " in getMemoryType()");
    }
}

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

// Converts a value to its i64 representation so it can more easily
// be handled from within WASM
const convertToI64 = function(value, type) {
    let i32Array;

    const result = {
        lower: 0,
        upper: 0
    };

    switch (type) {
        case "i8":
        case "i16":
        case "i32":
            result.lower = value;

            break;
        case "f32":
            const floatArray = new Float32Array([value]);
            i32Array = new Uint32Array(floatArray.buffer);

            result.lower = i32Array[0];

            break;
        case "i64":
        case "f64":
            const float64Array = new Float64Array([value]);
            i32Array = new Uint32Array(float64Array.buffer);

            result.lower = i32Array[0];
            result.upper = i32Array[1];

            break;
        default:
            throw new Error("Conversion " + type + " not implemented in convertToI64()");
    }

    return result;
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


// BigInt capable JSON handlers from
// https://golb.hplar.ch/2018/09/javascript-bigint.html
const bigintJsonParse = function(jsonString) {
    return JSON.parse(jsonString, (key, value) => {
        if (typeof value === 'string' && /^\d+n$/.test(value)) {
            return BigInt(value.slice(0, -1));
        }
        return value;
    });
}

const bigintJsonStringify = function(jsonObject) {
    return JSON.stringify(jsonObject, (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString() + 'n';
        } else {
            return value;
        }
    });
}

const bigintIsNaN = function(value) {
    if (typeof value === "bigint") {
        return false;
    }

    return isNaN(value);
}
