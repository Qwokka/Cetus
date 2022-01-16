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

const TextReader = class {
    constructor(text, symbols = {}) {
        this._text = text;
        this.pos = 0;
        this.eof = false;

        const symObj = {};

        const symbolIndexes = Object.keys(symbols);

        for (let i = 0; i < symbolIndexes.length; i++) {
            const symbolIndex = symbolIndexes[i];
            const symbolName = symbols[symbolIndex];

            symObj[symbolName] = symbolIndexes[i];
        }

        this.symbols = symObj;
    }

    matchLineSeparator(chr) {
        switch (chr) {
            case "\r":
            case "\n":
                return true;
        }

        return false;
    }

    matchStringSeparator(chr) {
        switch (chr) {
            case " ":
            case "\t":
                return true;
        }

        return false;
    }

    readChar() {
        const newChar = this._text[this.pos++];

        if (this.pos > this._text.length) {
            throw new RangeError();
        }

        return newChar;
    }

    peakChar() {
        const newChar = this._text[this.pos];

        if (this.pos > this._text.length) {
            throw new RangeError();
        }

        return newChar;
    }

    readLine() {
        let result = "";

        while (1) {
            let newChar;

            while (1) {
                try {
                    newChar = this.readChar();
                }
                catch(err) {
                    this.eof = true;
                    break;
                }

                if (this.matchLineSeparator(newChar)) {
                    break;
                }

                result += newChar;
            }

            result = result.trim();

            if (!result.startsWith("//")) {
                break;
            }

            result = "";
        }

        return result;
    }

    readString() {
        let result = "";

        let newChar;

        while (1) {
            try {
                newChar = this.readChar();
            }
            catch(err) {
                this.eof = true;
                break;
            }

            if (this.matchStringSeparator(newChar) || this.matchLineSeparator(newChar)) {
                break;
            }

            result += newChar;
        }

        return result;
    }

    readStringLower() {
        return this.readString().toLowerCase();
    }

    readInteger() {
        const numStr = this.readString();

        if (isNaN(numStr)) {
            throw new Error(`Invalid integer "${numStr}"`);
        }

        const numVal = parseInt(numStr);

        return numVal;
    }

    // Reads the next string as a float (Represented by Javascript "number" type)
    // May return NaN if the string "NaN" (case insensitive) is encountered
    readFloat() {
        const numStr = this.readStringLower();

        if ((numStr.length == 0) || (numStr !== "nan" && isNaN(numStr))) {
            throw new Error(`Invalid float "${numStr}"`);
        }

        const numVal = parseFloat(numStr);

        return numVal;
    }

    readCallTarget() {
        const callTarget = this.readString();

        let realCallTarget;

        if (typeof this.symbols[callTarget] !== "undefined") {
            realCallTarget = parseInt(this.symbols[callTarget]);
        }
        else {
            if (isNaN(callTarget)) {
                throw new Error(`Invalid call target "${callTarget}"`);
            }

            realCallTarget = parseInt(callTarget);
        }

        return realCallTarget;
    }

    readBlockType() {
        const blockTypeStr = this.readString();

        switch (blockTypeStr) {
            case "i32":
                return VALUE_TYPE_I32;
            case "i64":
                return VALUE_TYPE_I64;
            case "f32":
                return VALUE_TYPE_F32;
            case "f64":
                return VALUE_TYPE_F64;
            case "":
                return VALUE_TYPE_BLOCK;
            default:
                throw new Error("Invalid block type "+blockTypeStr);
        }
    }

    readUint1() {
        const numVal = this.readInteger();

        if (numVal < 0 || numVal > 1) {
            throw new Error(`Value must be between 0 - 1, got ${numVal}`);
        }

        return numVal;
    }

    readUint8() {
        const numVal = this.readInteger();

        if (numVal < 0 || numVal > 0xFF) {
            throw new Error(`Value must be between 0 - 0xFF, got ${numVal}`);
        }

        return numVal;
    }

    readKeywords(nameArray) {
        const results = [];

        const matched = {};

        for (let i = 0; i < nameArray.length; i++) {
            const thisString = this.readString();

            if (thisString === "") {
                throw new Error("Missing a required keyword argument");
            }

            const parsedKeyword = this._splitKeywordImmediate(thisString);

            matched[parsedKeyword.keyword] = parsedKeyword.value;
        }

        for (let i = 0; i < nameArray.length; i++) {
            const thisName = nameArray[i];

            if (typeof thisName !== "string") {
                throw new Error(`Invalid keyword "${i}" in disassembler.readKeywords()`);
            }

            if (typeof matched[thisName] === "undefined") {
                throw new Error(`Unmatched keyword "${thisName}"`);
            }

            results.push(matched[thisName]);
        }

        return results;
    }

    _splitKeywordImmediate(keywordString) {
        const results = {};

        const parts = keywordString.split("=");

        if (parts.length !== 2) {
            throw new Error();
        }

        results.keyword = parts[0];
        results.value = parts[1];

        if (results.value === "" || isNaN(results.value)) {
            throw new Error();
        }

        return results;
    }
};

const Assembler = class {
    constructor(text, symbols = {}) {
        this.reader = new TextReader(text, symbols);
        this._output = new BufferReader();
        this.symbols = symbols;
    }

    assemble() {
        while (!this.reader.eof) {
            const opLine = this.reader.readLine();

            if (opLine === "") {
                continue;
            }

            this.assembleInstruction(opLine);
        }

        return this._output.write();
    }

    // TODO Some of these cases need error checks for premature end of line
    assembleInstruction(opLine) {
        const lineReader = new TextReader(opLine, this.symbols);

        const opText = lineReader.readStringLower();

        let immediate1;
        let immediate2;

        let keywordImmediates;

        switch (opText) {
            case "unreachable":
                this._output.copyBuffer([ OP_UNREACHABLE ]);
                break;
            case "nop":
                this._output.copyBuffer([ OP_NOP ]);
                break;
            case "block":
                this._output.copyBuffer([ OP_BLOCK ]);

                immediate1 = lineReader.readBlockType();

                this._output.copyBuffer([ immediate1 ]);
                break;
            case "loop":
                this._output.copyBuffer([ OP_LOOP ]);

                immediate1 = lineReader.readBlockType();

                this._output.copyBuffer([ immediate1 ]);
                break;
            case "if":
                this._output.copyBuffer([ OP_IF ]);

                immediate1 = lineReader.readBlockType();

                this._output.copyBuffer([ immediate1 ]);
                break;
            case "else":
                this._output.copyBuffer([ OP_ELSE ]);
                break;
            case "end":
                this._output.copyBuffer([ OP_END ]);
                break;
            case "br":
                this._output.copyBuffer([ OP_BR ]);

                immediate1 = lineReader.readInteger();

                this._output.copyBuffer(VarUint32ToArray(immediate1));
                break;
            case "br_if":
                this._output.copyBuffer([ OP_BR_IF ]);

                immediate1 = lineReader.readInteger();

                this._output.copyBuffer(VarUint32ToArray(immediate1));
                break;
            case "br_table":
                this._output.copyBuffer([ OP_BR_TABLE ]);

                let targetCount = lineReader.readInteger();

                this._output.copyBuffer(VarUint32ToArray(targetCount));

                for (let i = 0; i < targetCount; i++) {
                    let tableEntry = lineReader.readInteger();
                    this._output.copyBuffer(VarUint32ToArray(tableEntry));
                }

                let defaultTarget = lineReader.readInteger();
                this._output.copyBuffer(VarUint32ToArray(defaultTarget));
                break;
            case "return":
                this._output.copyBuffer([ OP_RETURN ]);
                break;
            case "call":
                this._output.copyBuffer([ OP_CALL ]);

                immediate1 = lineReader.readCallTarget();

                this._output.copyBuffer(VarUint32ToArray(immediate1));
                break;
            case "call_indirect":
                this._output.copyBuffer([ OP_CALL_INDIRECT ]);

                immediate1 = lineReader.readInteger();
                immediate2 = lineReader.readUint8();

                this._output.copyBuffer(VarUint32ToArray(immediate1));
                this._output.copyBuffer([ immediate2 ]);
                break;
            case "drop":
                this._output.copyBuffer([ OP_DROP ]);
                break;
            case "select":
                this._output.copyBuffer([ OP_SELECT ]);
                break;
            case "get_local":
                this._output.copyBuffer([ OP_GET_LOCAL ]);

                immediate1 = lineReader.readInteger();

                this._output.copyBuffer(VarUint32ToArray(immediate1));
                break;
            case "set_local":
                this._output.copyBuffer([ OP_SET_LOCAL ]);

                immediate1 = lineReader.readInteger();

                this._output.copyBuffer(VarUint32ToArray(immediate1));
                break;
            case "tee_local":
                this._output.copyBuffer([ OP_TEE_LOCAL ]);

                immediate1 = lineReader.readInteger();

                this._output.copyBuffer(VarUint32ToArray(immediate1));
                break;
            case "get_global":
                this._output.copyBuffer([ OP_GET_GLOBAL ]);

                immediate1 = lineReader.readInteger();

                this._output.copyBuffer(VarUint32ToArray(immediate1));
                break;
            case "set_global":
                this._output.copyBuffer([ OP_SET_GLOBAL ]);

                immediate1 = lineReader.readInteger();

                this._output.copyBuffer(VarUint32ToArray(immediate1));
                break;
            case "i32.load":
                this._output.copyBuffer([ OP_I32_LOAD ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i64.load":
                this._output.copyBuffer([ OP_I64_LOAD ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "f32.load":
                this._output.copyBuffer([ OP_F32_LOAD ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "f64.load":
                this._output.copyBuffer([ OP_F64_LOAD ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i32.load8_s":
                this._output.copyBuffer([ OP_I32_LOAD8_S ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i32.load8_u":
                this._output.copyBuffer([ OP_I32_LOAD8_U ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i32.load16_s":
                this._output.copyBuffer([ OP_I32_LOAD16_S ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i32.load16_u":
                this._output.copyBuffer([ OP_I32_LOAD16_U ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i64.load8_s":
                this._output.copyBuffer([ OP_I64_LOAD8_S ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i64.load8_u":
                this._output.copyBuffer([ OP_I64_LOAD8_U ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i64.load16_s":
                this._output.copyBuffer([ OP_I64_LOAD16_S ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i64.load16_u":
                this._output.copyBuffer([ OP_I64_LOAD16_U ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i64.load32_s":
                this._output.copyBuffer([ OP_I64_LOAD32_S ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i64.load32_u":
                this._output.copyBuffer([ OP_I64_LOAD32_U ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i32.store":
                this._output.copyBuffer([ OP_I32_STORE ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i64.store":
                this._output.copyBuffer([ OP_I64_STORE ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "f32.store":
                this._output.copyBuffer([ OP_F32_STORE ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "f64.store":
                this._output.copyBuffer([ OP_F64_STORE ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i32.store8":
                this._output.copyBuffer([ OP_I32_STORE8 ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i32.store16":
                this._output.copyBuffer([ OP_I32_STORE16 ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i64.store8":
                this._output.copyBuffer([ OP_I64_STORE8 ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i64.store16":
                this._output.copyBuffer([ OP_I64_STORE16 ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "i64.store32":
                this._output.copyBuffer([ OP_I64_STORE32 ]);

                keywordImmediates = lineReader.readKeywords(["align", "offset"]);

                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[0]));
                this._output.copyBuffer(VarUint32ToArray(keywordImmediates[1]));
                break;
            case "memory_size":
            case "current_memory":
                this._output.copyBuffer([ OP_MEMORY_SIZE ]);

                immediate1 = lineReader.readUint1();

                this._output.copyBuffer([ immediate1 ]);
                break;
            case "memory_grow":
            case "grow_memory":
                this._output.copyBuffer([ OP_MEMORY_GROW ]);

                immediate1 = lineReader.readUint1();

                this._output.copyBuffer([ immediate1 ]);
                break;
            case "i32.const":
                this._output.copyBuffer([ OP_I32_CONST ]);

                immediate1 = lineReader.readInteger();

                this._output.copyBuffer(VarSint32ToArray(immediate1));
                break;
            case "i64.const":
                this._output.copyBuffer([ OP_I64_CONST ]);

                immediate1 = lineReader.readInteger();

                this._output.copyBuffer(VarSint32ToArray(immediate1));
                break;
            case "f32.const":
                this._output.copyBuffer([ OP_F32_CONST ]);

                immediate1 = lineReader.readFloat();

                const f32Array = new Float32Array([immediate1]);

                const f32Bytes = new Uint8Array(f32Array.buffer);

                this._output.copyBuffer(f32Bytes);
                break;
            case "f64.const":
                this._output.copyBuffer([ OP_F64_CONST ]);

                immediate1 = lineReader.readFloat();

                const f64Array = new Float64Array([immediate1]);

                const f64Bytes = new Uint8Array(f64Array.buffer);

                this._output.copyBuffer(f64Bytes);
                break;
            case "i32.eqz":
                this._output.copyBuffer([ OP_I32_EQZ ]);
                break;
            case "i32.eq":
                this._output.copyBuffer([ OP_I32_EQ ]);
                break;
            case "i32.ne":
                this._output.copyBuffer([ OP_I32_NE ]);
                break;
            case "i32.lt_s":
                this._output.copyBuffer([ OP_I32_LT_S ]);
                break;
            case "i32.lt_u":
                this._output.copyBuffer([ OP_I32_LT_U ]);
                break;
            case "i32.gt_s":
                this._output.copyBuffer([ OP_I32_GT_S ]);
                break;
            case "i32.gt_u":
                this._output.copyBuffer([ OP_I32_GT_U ]);
                break;
            case "i32.le_s":
                this._output.copyBuffer([ OP_I32_LE_S ]);
                break;
            case "i32.le_u":
                this._output.copyBuffer([ OP_I32_LE_U ]);
                break;
            case "i32.ge_s":
                this._output.copyBuffer([ OP_I32_GE_S ]);
                break;
            case "i32.ge_u":
                this._output.copyBuffer([ OP_I32_GE_U ]);
                break;
            case "i64.eqz":
                this._output.copyBuffer([ OP_I64_EQZ ]);
                break;
            case "i64.eq":
                this._output.copyBuffer([ OP_I64_EQ ]);
                break;
            case "i64.ne":
                this._output.copyBuffer([ OP_I64_NE ]);
                break;
            case "i64.lt_s":
                this._output.copyBuffer([ OP_I64_LT_S ]);
                break;
            case "i64.lt_u":
                this._output.copyBuffer([ OP_I64_LT_U ]);
                break;
            case "i64.gt_s":
                this._output.copyBuffer([ OP_I64_GT_S ]);
                break;
            case "i64.gt_u":
                this._output.copyBuffer([ OP_I64_GT_U ]);
                break;
            case "i64.le_s":
                this._output.copyBuffer([ OP_I64_LE_S ]);
                break;
            case "i64.le_u":
                this._output.copyBuffer([ OP_I64_LE_U ]);
                break;
            case "i64.ge_s":
                this._output.copyBuffer([ OP_I64_GE_S ]);
                break;
            case "i64.ge_u":
                this._output.copyBuffer([ OP_I64_GE_U ]);
                break;
            case "f32.eq":
                this._output.copyBuffer([ OP_F32_EQ ]);
                break;
            case "f32.ne":
                this._output.copyBuffer([ OP_F32_NE ]);
                break;
            case "f32.lt":
                this._output.copyBuffer([ OP_F32_LT ]);
                break;
            case "f32.gt":
                this._output.copyBuffer([ OP_F32_GT ]);
                break;
            case "f32.le":
                this._output.copyBuffer([ OP_F32_LE ]);
                break;
            case "f32.ge":
                this._output.copyBuffer([ OP_F32_GE ]);
                break;
            case "f64.eq":
                this._output.copyBuffer([ OP_F64_EQ ]);
                break;
            case "f64.ne":
                this._output.copyBuffer([ OP_F64_NE ]);
                break;
            case "f64.lt":
                this._output.copyBuffer([ OP_F64_LT ]);
                break;
            case "f64.gt":
                this._output.copyBuffer([ OP_F64_GT ]);
                break;
            case "f64.le":
                this._output.copyBuffer([ OP_F64_LE ]);
                break;
            case "f64.ge":
                this._output.copyBuffer([ OP_F64_GE ]);
                break;
            case "i32.clz":
                this._output.copyBuffer([ OP_I32_CLZ ]);
                break;
            case "i32.ctz":
                this._output.copyBuffer([ OP_I32_CTZ ]);
                break;
            case "i32.popcnt":
                this._output.copyBuffer([ OP_I32_POPCNT ]);
                break;
            case "i32.add":
                this._output.copyBuffer([ OP_I32_ADD ]);
                break;
            case "i32.sub":
                this._output.copyBuffer([ OP_I32_SUB ]);
                break;
            case "i32.mul":
                this._output.copyBuffer([ OP_I32_MUL ]);
                break;
            case "i32.div_s":
                this._output.copyBuffer([ OP_I32_DIV_S ]);
                break;
            case "i32.div_u":
                this._output.copyBuffer([ OP_I32_DIV_U ]);
                break;
            case "i32.rem_s":
                this._output.copyBuffer([ OP_I32_REM_S ]);
                break;
            case "i32.rem_u":
                this._output.copyBuffer([ OP_I32_REM_U ]);
                break;
            case "i32.and":
                this._output.copyBuffer([ OP_I32_AND ]);
                break;
            case "i32.or":
                this._output.copyBuffer([ OP_I32_OR ]);
                break;
            case "i32.xor":
                this._output.copyBuffer([ OP_I32_XOR ]);
                break;
            case "i32.shl":
                this._output.copyBuffer([ OP_I32_SHL ]);
                break;
            case "i32.shr_s":
                this._output.copyBuffer([ OP_I32_SHR_S ]);
                break;
            case "i32.shr_u":
                this._output.copyBuffer([ OP_I32_SHR_U ]);
                break;
            case "i32.rotl":
                this._output.copyBuffer([ OP_I32_ROTL ]);
                break;
            case "i32.rotr":
                this._output.copyBuffer([ OP_I32_ROTR ]);
                break;
            case "i64.clz":
                this._output.copyBuffer([ OP_I64_CLZ ]);
                break;
            case "i64.ctz":
                this._output.copyBuffer([ OP_I64_CTZ ]);
                break;
            case "i64.popcnt":
                this._output.copyBuffer([ OP_I64_POPCNT ]);
                break;
            case "i64.add":
                this._output.copyBuffer([ OP_I64_ADD ]);
                break;
            case "i64.sub":
                this._output.copyBuffer([ OP_I64_SUB ]);
                break;
            case "i64.mul":
                this._output.copyBuffer([ OP_I64_MUL ]);
                break;
            case "i64.div_s":
                this._output.copyBuffer([ OP_I64_DIV_S ]);
                break;
            case "i64.div_u":
                this._output.copyBuffer([ OP_I64_DIV_U ]);
                break;
            case "i64.rem_s":
                this._output.copyBuffer([ OP_I64_REM_S ]);
                break;
            case "i64.rem_u":
                this._output.copyBuffer([ OP_I64_REM_U ]);
                break;
            case "i64.and":
                this._output.copyBuffer([ OP_I64_AND ]);
                break;
            case "i64.or":
                this._output.copyBuffer([ OP_I64_OR ]);
                break;
            case "i64.xor":
                this._output.copyBuffer([ OP_I64_XOR ]);
                break;
            case "i64.shl":
                this._output.copyBuffer([ OP_I64_SHL ]);
                break;
            case "i64.shr_s":
                this._output.copyBuffer([ OP_I64_SHR_S ]);
                break;
            case "i64.shr_u":
                this._output.copyBuffer([ OP_I64_SHR_U ]);
                break;
            case "i64.rotl":
                this._output.copyBuffer([ OP_I64_ROTL ]);
                break;
            case "i64.rotr":
                this._output.copyBuffer([ OP_I64_ROTR ]);
                break;
            case "f32.abs":
                this._output.copyBuffer([ OP_F32_ABS ]);
                break;
            case "f32.neg":
                this._output.copyBuffer([ OP_F32_NEG ]);
                break;
            case "f32.ceil":
                this._output.copyBuffer([ OP_F32_CEIL ]);
                break;
            case "f32.floor":
                this._output.copyBuffer([ OP_F32_FLOOR ]);
                break;
            case "f32.trunc":
                this._output.copyBuffer([ OP_F32_TRUNC ]);
                break;
            case "f32.nearest":
                this._output.copyBuffer([ OP_F32_NEAREST ]);
                break;
            case "f32.sqrt":
                this._output.copyBuffer([ OP_F32_SQRT ]);
                break;
            case "f32.add":
                this._output.copyBuffer([ OP_F32_ADD ]);
                break;
            case "f32.sub":
                this._output.copyBuffer([ OP_F32_SUB ]);
                break;
            case "f32.mul":
                this._output.copyBuffer([ OP_F32_MUL ]);
                break;
            case "f32.div":
                this._output.copyBuffer([ OP_F32_DIV ]);
                break;
            case "f32.min":
                this._output.copyBuffer([ OP_F32_MIN ]);
                break;
            case "f32.max":
                this._output.copyBuffer([ OP_F32_MAX ]);
                break;
            case "f32.copysign":
                this._output.copyBuffer([ OP_F32_COPYSIGN ]);
                break;
            case "f64.abs":
                this._output.copyBuffer([ OP_F64_ABS ]);
                break;
            case "f64.neg":
                this._output.copyBuffer([ OP_F64_NEG ]);
                break;
            case "f64.ceil":
                this._output.copyBuffer([ OP_F64_CEIL ]);
                break;
            case "f64.floor":
                this._output.copyBuffer([ OP_F64_FLOOR ]);
                break;
            case "f64.trunc":
                this._output.copyBuffer([ OP_F64_TRUNC ]);
                break;
            case "f64.nearest":
                this._output.copyBuffer([ OP_F64_NEAREST ]);
                break;
            case "f64.sqrt":
                this._output.copyBuffer([ OP_F64_SQRT ]);
                break;
            case "f64.add":
                this._output.copyBuffer([ OP_F64_ADD ]);
                break;
            case "f64.sub":
                this._output.copyBuffer([ OP_F64_SUB ]);
                break;
            case "f64.mul":
                this._output.copyBuffer([ OP_F64_MUL ]);
                break;
            case "f64.div":
                this._output.copyBuffer([ OP_F64_DIV ]);
                break;
            case "f64.min":
                this._output.copyBuffer([ OP_F64_MIN ]);
                break;
            case "f64.max":
                this._output.copyBuffer([ OP_F64_MAX ]);
                break;
            case "f64.copysign":
                this._output.copyBuffer([ OP_F64_COPYSIGN ]);
                break;
            case "i32.wrap/i64":
                this._output.copyBuffer([ OP_I32_WRAP_I64 ]);
                break;
            case "i32.trunc_s/f32":
                this._output.copyBuffer([ OP_I32_TRUNC_S_F32 ]);
                break;
            case "i32.trunc_u/f32":
                this._output.copyBuffer([ OP_I32_TRUNC_U_F32 ]);
                break;
            case "i32.trunc_s/f64":
                this._output.copyBuffer([ OP_I32_TRUNC_S_F64 ]);
                break;
            case "i32.trunc_u/f64":
                this._output.copyBuffer([ OP_I32_TRUNC_U_F64 ]);
                break;
            case "i64.extend_s/i32":
                this._output.copyBuffer([ OP_I64_EXTEND_S_I32 ]);
                break;
            case "i64.extend_u/i32":
                this._output.copyBuffer([ OP_I64_EXTEND_U_I32 ]);
                break;
            case "i64.trunc_s/f32":
                this._output.copyBuffer([ OP_I64_TRUNC_S_F32 ]);
                break;
            case "i64.trunc_u/f32":
                this._output.copyBuffer([ OP_I64_TRUNC_U_F32 ]);
                break;
            case "i64.trunc_s/f64":
                this._output.copyBuffer([ OP_I64_TRUNC_S_F64 ]);
                break;
            case "i64.trunc_u/f64":
                this._output.copyBuffer([ OP_I64_TRUNC_U_F64 ]);
                break;
            case "f32.convert_s/i32":
                this._output.copyBuffer([ OP_F32_CONVERT_S_I32 ]);
                break;
            case "f32.convert_u/i32":
                this._output.copyBuffer([ OP_F32_CONVERT_U_I32 ]);
                break;
            case "f32.convert_s/i64":
                this._output.copyBuffer([ OP_F32_CONVERT_S_I64 ]);
                break;
            case "f32.convert_u/i64":
                this._output.copyBuffer([ OP_F32_CONVERT_U_I64 ]);
                break;
            case "f32.demote/f64":
                this._output.copyBuffer([ OP_F32_DEMOTE_F64 ]);
                break;
            case "f64.convert_s/i32":
                this._output.copyBuffer([ OP_F64_CONVERT_S_I32 ]);
                break;
            case "f64.convert_u/i32":
                this._output.copyBuffer([ OP_F64_CONVERT_U_I32 ]);
                break;
            case "f64.convert_s/i64":
                this._output.copyBuffer([ OP_F64_CONVERT_S_I64 ]);
                break;
            case "f64.convert_u/i64":
                this._output.copyBuffer([ OP_F64_CONVERT_U_I64 ]);
                break;
            case "f64.promote/f32":
                this._output.copyBuffer([ OP_F64_PROMOTE_F32 ]);
                break;
            case "i32.reinterpret/f32":
                this._output.copyBuffer([ OP_I32_REINTERPRET_F32 ]);
                break;
            case "i64.reinterpret/f64":
                this._output.copyBuffer([ OP_I64_REINTERPRET_F64 ]);
                break;
            case "f32.reinterpret/i32":
                this._output.copyBuffer([ OP_F32_REINTERPRET_I32 ]);
                break;
            case "f64.reinterpret/i64":
                this._output.copyBuffer([ OP_F64_REINTERPRET_I64 ]);
                break;
            default:
                throw new Error(`Bad instruction "${opText}"`);
        }

        return true;
    }
};
