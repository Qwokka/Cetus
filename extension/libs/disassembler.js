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

const Instruction = class {
    constructor() {
        this.opcode = null;

        this.immediates = [];
    }
};

const InstructionReader = class extends BufferReader {
    readKeywords(nameArray) {
        const results = [];

        for (let i = 0; i < nameArray.length; i++) {
            const thisName = nameArray[i];

            if (typeof thisName !== "string") {
                throw new Error("Invalid keyword name in InstructionReader.readKeywords()");
            }

            const thisValue = this.readVarUint32();

            const thisString = `${thisName}=${thisValue}`;

            results.push(thisString);
        }

        return results;
    }

    readBlockType() {
        const blockType = this.readUint8();

        switch (blockType) {
            case VALUE_TYPE_I32:
                return "i32";
            case VALUE_TYPE_I64:
                return "i64";
            case VALUE_TYPE_F32:
                return "f32";
            case VALUE_TYPE_F64:
                return "f64";
            case VALUE_TYPE_ANYFUNC:
            case VALUE_TYPE_FUNC:
            case VALUE_TYPE_BLOCK:
                return "";
            default:
                throw new Error("Bad block type in InstructionReader.readBlockType()");
        }
    }
};

const Disassembler = class {
    constructor(bytes, symbols = {}) {
        this.reader = new InstructionReader(bytes);

        this.indentStr = "  ";

        this.symbols = symbols;
    }

    disassemble() {
        const instructions = [];
        const outputLines = [];

        let indentDepth = 0;
        let lineNumber = 0;

        const byteIndexToLineNum = {};

        while (this.reader.inPos < this.reader.inBuffer.length) {
            byteIndexToLineNum[this.reader.inPos] = lineNumber++;

            const instruction = this.disassembleInstruction();

            instructions.push(instruction);
        }

        for (let i = 0; i < instructions.length; i++) {
            const thisInstr = instructions[i];

            const immediateString = thisInstr.immediates.join(" ");
            const instrString = `${thisInstr.opstring} ${immediateString}`;

            if (thisInstr.opcode == OP_END) {
                indentDepth--;
            }

            if (indentDepth < 0) {
                indentDepth = 0;
            }

            const instrFullString = (this.indentStr.repeat(indentDepth) + instrString);

            switch (thisInstr.opcode) {
                case OP_BLOCK:
                case OP_LOOP:
                case OP_IF:
                case OP_ELSE:
                    indentDepth++;
                    break;
            }

            outputLines.push(instrFullString);
        }

        const resultObj = {};

        resultObj.text = outputLines.join("\n");
        resultObj.lineNums = byteIndexToLineNum;

        return resultObj;
    }

    disassembleInstruction() {
        const instruction = {};

        instruction.opcode = this.reader.readUint8();
        instruction.immediates = [];

        switch (instruction.opcode) {
            case OP_UNREACHABLE:
                instruction.opstring = "unreachable";
                break;
            case OP_NOP:
                instruction.opstring = "nop";
                break;
            case OP_BLOCK:
                instruction.opstring = "block";
                instruction.immediates.push(this.reader.readBlockType());
                break;
            case OP_LOOP:
                instruction.opstring = "loop";
                instruction.immediates.push(this.reader.readBlockType());
                break;
            case OP_IF:
                instruction.opstring = "if";
                instruction.immediates.push(this.reader.readBlockType());
                break;
            case OP_ELSE:
                instruction.opstring = "else";
                break;
            case OP_END:
                instruction.opstring = "end";
                break;
            case OP_BR:
                instruction.opstring = "br";
                instruction.immediates.push(this.reader.readVarUint32());
                break;
            case OP_BR_IF:
                instruction.opstring = "br_if";
                instruction.immediates.push(this.reader.readVarUint32());
                break;
            case OP_BR_TABLE:
                instruction.opstring = "br_table";
                let count = this.reader.readVarUint32();

                instruction.immediates.push(count);

                for (let i = 0; i < count; i++) {
                    instruction.immediates.push(this.reader.readVarUint32());
                }

                instruction.immediates.push(this.reader.readVarUint32());
                break;
            case OP_RETURN:
                instruction.opstring = "return";
                break;
            case OP_CALL:
                instruction.opstring = "call";
                const callTarget = this.reader.readVarUint32();

                if (typeof this.symbols[callTarget] !== "undefined") {
                    instruction.immediates.push(this.symbols[callTarget]);
                }
                else {
                    instruction.immediates.push(callTarget);
                }
                break;
            case OP_CALL_INDIRECT:
                instruction.opstring = "call_indirect";
                instruction.immediates.push(this.reader.readVarUint32());
                instruction.immediates.push(this.reader.readUint8());
                break;
            case OP_DROP:
                instruction.opstring = "drop";
                break;
            case OP_SELECT:
                instruction.opstring = "select";
                break;
            case OP_GET_LOCAL:
                instruction.opstring = "get_local";
                instruction.immediates.push(this.reader.readVarUint32());
                break;
            case OP_SET_LOCAL:
                instruction.opstring = "set_local";
                instruction.immediates.push(this.reader.readVarUint32());
                break;
            case OP_TEE_LOCAL:
                instruction.opstring = "tee_local";
                instruction.immediates.push(this.reader.readVarUint32());
                break;
            case OP_GET_GLOBAL:
                instruction.opstring = "get_global";
                instruction.immediates.push(this.reader.readVarUint32());
                break;
            case OP_SET_GLOBAL:
                instruction.opstring = "set_global";
                instruction.immediates.push(this.reader.readVarUint32());
                break;
            case OP_I32_LOAD:
                instruction.opstring = "i32.load";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I64_LOAD:
                instruction.opstring = "i64.load";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_F32_LOAD:
                instruction.opstring = "f32.load";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_F64_LOAD:
                instruction.opstring = "f64.load";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I32_LOAD8_S:
                instruction.opstring = "i32.load8_s";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I32_LOAD8_U:
                instruction.opstring = "i32.load8_u";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I32_LOAD16_S:
                instruction.opstring = "i32.load16_s";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I32_LOAD16_U:
                instruction.opstring = "i32.load16_u";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I64_LOAD8_S:
                instruction.opstring = "i64.load8_s";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I64_LOAD8_U:
                instruction.opstring = "i64.load8_u";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I64_LOAD16_S:
                instruction.opstring = "i64.load16_s";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I64_LOAD16_U:
                instruction.opstring = "i64.load16_u";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I64_LOAD32_S:
                instruction.opstring = "i64.load32_s";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I64_LOAD32_U:
                instruction.opstring = "i64.load32_u";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I32_STORE:
                instruction.opstring = "i32.store";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I64_STORE:
                instruction.opstring = "i64.store";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_F32_STORE:
                instruction.opstring = "f32.store";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_F64_STORE:
                instruction.opstring = "f64.store";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I32_STORE8:
                instruction.opstring = "i32.store8";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I32_STORE16:
                instruction.opstring = "i32.store16";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I64_STORE8:
                instruction.opstring = "i64.store8";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I64_STORE16:
                instruction.opstring = "i64.store16";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_I64_STORE32:
                instruction.opstring = "i64.store32";
                instruction.immediates = this.reader.readKeywords(["align", "offset"]);
                break;
            case OP_MEMORY_SIZE:
                instruction.opstring = "current_memory";
                instruction.immediates.push(this.reader.readUint8());
                break;
            case OP_MEMORY_GROW:
                instruction.opstring = "grow_memory";
                instruction.immediates.push(this.reader.readUint8());
                break;
            case OP_I32_CONST:
                instruction.opstring = "i32.const";
                instruction.immediates.push(this.reader.readVarUint32());
                break;
            // TODO Fix
            case OP_I64_CONST:
                instruction.opstring = "i64.const";
                instruction.immediates.push(this.reader.readVarUint32());
                break;
            case OP_F32_CONST:
                instruction.opstring = "f32.const";

                const f32Bytes = this.reader.readBytes(4);

                const f32ByteBuffer = new Uint8Array(f32Bytes);

                const f32Array = new Float32Array(f32ByteBuffer.buffer);

                instruction.immediates.push(f32Array[0]);
                break;
            case OP_F64_CONST:
                instruction.opstring = "f64.const";

                const f64Bytes = this.reader.readBytes(8);

                const f64ByteBuffer = new Uint8Array(f64Bytes);

                const f64Array = new Float64Array(f64ByteBuffer.buffer);

                instruction.immediates.push(f64Array[0]);
                break;
            case OP_I32_EQZ:
                instruction.opstring = "i32.eqz";
                break;
            case OP_I32_EQ:
                instruction.opstring = "i32.eq";
                break;
            case OP_I32_NE:
                instruction.opstring = "i32.ne";
                break;
            case OP_I32_LT_S:
                instruction.opstring = "i32.lt_s";
                break;
            case OP_I32_LT_U:
                instruction.opstring = "i32.lt_u";
                break;
            case OP_I32_GT_S:
                instruction.opstring = "i32.gt_s";
                break;
            case OP_I32_GT_U:
                instruction.opstring = "i32.gt_u";
                break;
            case OP_I32_LE_S:
                instruction.opstring = "i32.le_s";
                break;
            case OP_I32_LE_U:
                instruction.opstring = "i32.le_u";
                break;
            case OP_I32_GE_S:
                instruction.opstring = "i32.ge_s";
                break;
            case OP_I32_GE_U:
                instruction.opstring = "i32.ge_u";
                break;
            case OP_I64_EQZ:
                instruction.opstring = "i64.eqz";
                break;
            case OP_I64_EQ:
                instruction.opstring = "i64.eq";
                break;
            case OP_I64_NE:
                instruction.opstring = "i64.ne";
                break;
            case OP_I64_LT_S:
                instruction.opstring = "i64.lt_s";
                break;
            case OP_I64_LT_U:
                instruction.opstring = "i64.lt_u";
                break;
            case OP_I64_GT_S:
                instruction.opstring = "i64.gt_s";
                break;
            case OP_I64_GT_U:
                instruction.opstring = "i64.gt_u";
                break;
            case OP_I64_LE_S:
                instruction.opstring = "i64.le_s";
                break;
            case OP_I64_LE_U:
                instruction.opstring = "i64.le_u";
                break;
            case OP_I64_GE_S:
                instruction.opstring = "i64.ge_s";
                break;
            case OP_I64_GE_U:
                instruction.opstring = "i64.ge_u";
                break;
            case OP_F32_EQ:
                instruction.opstring = "f32.eq";
                break;
            case OP_F32_NE:
                instruction.opstring = "f32.ne";
                break;
            case OP_F32_LT:
                instruction.opstring = "f32.lt";
                break;
            case OP_F32_GT:
                instruction.opstring = "f32.gt";
                break;
            case OP_F32_LE:
                instruction.opstring = "f32.le";
                break;
            case OP_F32_GE:
                instruction.opstring = "f32.ge";
                break;
            case OP_F64_EQ:
                instruction.opstring = "f64.eq";
                break;
            case OP_F64_NE:
                instruction.opstring = "f64.ne";
                break;
            case OP_F64_LT:
                instruction.opstring = "f64.lt";
                break;
            case OP_F64_GT:
                instruction.opstring = "f64.gt";
                break;
            case OP_F64_LE:
                instruction.opstring = "f64.le";
                break;
            case OP_F64_GE:
                instruction.opstring = "f64.ge";
                break;
            case OP_I32_CLZ:
                instruction.opstring = "i32.clz";
                break;
            case OP_I32_CTZ:
                instruction.opstring = "i32.ctz";
                break;
            case OP_I32_POPCNT:
                instruction.opstring = "i32.popcnt";
                break;
            case OP_I32_ADD:
                instruction.opstring = "i32.add";
                break;
            case OP_I32_SUB:
                instruction.opstring = "i32.sub";
                break;
            case OP_I32_MUL:
                instruction.opstring = "i32.mul";
                break;
            case OP_I32_DIV_S:
                instruction.opstring = "i32.div_s";
                break;
            case OP_I32_DIV_U:
                instruction.opstring = "i32.div_u";
                break;
            case OP_I32_REM_S:
                instruction.opstring = "i32.rem_s";
                break;
            case OP_I32_REM_U:
                instruction.opstring = "i32.rem_u";
                break;
            case OP_I32_AND:
                instruction.opstring = "i32.and";
                break;
            case OP_I32_OR:
                instruction.opstring = "i32.or";
                break;
            case OP_I32_XOR:
                instruction.opstring = "i32.xor";
                break;
            case OP_I32_SHL:
                instruction.opstring = "i32.shl";
                break;
            case OP_I32_SHR_S:
                instruction.opstring = "i32.shr_s";
                break;
            case OP_I32_SHR_U:
                instruction.opstring = "i32.shr_u";
                break;
            case OP_I32_ROTL:
                instruction.opstring = "i32.rotl";
                break;
            case OP_I32_ROTR:
                instruction.opstring = "i32.rotr";
                break;
            case OP_I64_CLZ:
                instruction.opstring = "i64.clz";
                break;
            case OP_I64_CTZ:
                instruction.opstring = "i64.ctz";
                break;
            case OP_I64_POPCNT:
                instruction.opstring = "i64.popcnt";
                break;
            case OP_I64_ADD:
                instruction.opstring = "i64.add";
                break;
            case OP_I64_SUB:
                instruction.opstring = "i64.sub";
                break;
            case OP_I64_MUL:
                instruction.opstring = "i64.mul";
                break;
            case OP_I64_DIV_S:
                instruction.opstring = "i64.div_s";
                break;
            case OP_I64_DIV_U:
                instruction.opstring = "i64.div_u";
                break;
            case OP_I64_REM_S:
                instruction.opstring = "i64.rem_s";
                break;
            case OP_I64_REM_U:
                instruction.opstring = "i64.rem_u";
                break;
            case OP_I64_AND:
                instruction.opstring = "i64.and";
                break;
            case OP_I64_OR:
                instruction.opstring = "i64.or";
                break;
            case OP_I64_XOR:
                instruction.opstring = "i64.xor";
                break;
            case OP_I64_SHL:
                instruction.opstring = "i64.shl";
                break;
            case OP_I64_SHR_S:
                instruction.opstring = "i64.shr_s";
                break;
            case OP_I64_SHR_U:
                instruction.opstring = "i64.shr_u";
                break;
            case OP_I64_ROTL:
                instruction.opstring = "i64.rotl";
                break;
            case OP_I64_ROTR:
                instruction.opstring = "i64.rotr";
                break;
            case OP_F32_ABS:
                instruction.opstring = "f32.abs";
                break;
            case OP_F32_NEG:
                instruction.opstring = "f32.neg";
                break;
            case OP_F32_CEIL:
                instruction.opstring = "f32.ceil";
                break;
            case OP_F32_FLOOR:
                instruction.opstring = "f32.floor";
                break;
            case OP_F32_TRUNC:
                instruction.opstring = "f32.trunc";
                break;
            case OP_F32_NEAREST:
                instruction.opstring = "f32.nearest";
                break;
            case OP_F32_SQRT:
                instruction.opstring = "f32.sqrt";
                break;
            case OP_F32_ADD:
                instruction.opstring = "f32.add";
                break;
            case OP_F32_SUB:
                instruction.opstring = "f32.sub";
                break;
            case OP_F32_MUL:
                instruction.opstring = "f32.mul";
                break;
            case OP_F32_DIV:
                instruction.opstring = "f32.div";
                break;
            case OP_F32_MIN:
                instruction.opstring = "f32.min";
                break;
            case OP_F32_MAX:
                instruction.opstring = "f32.max";
                break;
            case OP_F32_COPYSIGN:
                instruction.opstring = "f32.copysign";
                break;
            case OP_F64_ABS:
                instruction.opstring = "f64.abs";
                break;
            case OP_F64_NEG:
                instruction.opstring = "f64.neg";
                break;
            case OP_F64_CEIL:
                instruction.opstring = "f64.ceil";
                break;
            case OP_F64_FLOOR:
                instruction.opstring = "f64.floor";
                break;
            case OP_F64_TRUNC:
                instruction.opstring = "f64.trunc";
                break;
            case OP_F64_NEAREST:
                instruction.opstring = "f64.nearest";
                break;
            case OP_F64_SQRT:
                instruction.opstring = "f64.sqrt";
                break;
            case OP_F64_ADD:
                instruction.opstring = "f64.add";
                break;
            case OP_F64_SUB:
                instruction.opstring = "f64.sub";
                break;
            case OP_F64_MUL:
                instruction.opstring = "f64.mul";
                break;
            case OP_F64_DIV:
                instruction.opstring = "f64.div";
                break;
            case OP_F64_MIN:
                instruction.opstring = "f64.min";
                break;
            case OP_F64_MAX:
                instruction.opstring = "f64.max";
                break;
            case OP_F64_COPYSIGN:
                instruction.opstring = "f64.copysign";
                break;
            case OP_I32_WRAP_I64:
                instruction.opstring = "i32.wrap/i64";
                break;
            case OP_I32_TRUNC_S_F32:
                instruction.opstring = "i32.trunc_s/f32";
                break;
            case OP_I32_TRUNC_U_F32:
                instruction.opstring = "i32.trunc_u/f32";
                break;
            case OP_I32_TRUNC_S_F64:
                instruction.opstring = "i32.trunc_s/f64";
                break;
            case OP_I32_TRUNC_U_F64:
                instruction.opstring = "i32.trunc_u/f64";
                break;
            case OP_I64_EXTEND_S_I32:
                instruction.opstring = "i64.extend_s/i32";
                break;
            case OP_I64_EXTEND_U_I32:
                instruction.opstring = "i64.extend_u/i32";
                break;
            case OP_I64_TRUNC_S_F32:
                instruction.opstring = "i64.trunc_s/f32";
                break;
            case OP_I64_TRUNC_U_F32:
                instruction.opstring = "i64.trunc_u/f32";
                break;
            case OP_I64_TRUNC_S_F64:
                instruction.opstring = "i64.trunc_s/f64";
                break;
            case OP_I64_TRUNC_U_F64:
                instruction.opstring = "i64.trunc_u/f64";
                break;
            case OP_F32_CONVERT_S_I32:
                instruction.opstring = "f32.convert_s/i32";
                break;
            case OP_F32_CONVERT_U_I32:
                instruction.opstring = "f32.convert_u/i32";
                break;
            case OP_F32_CONVERT_S_I64:
                instruction.opstring = "f32.convert_s/i64";
                break;
            case OP_F32_CONVERT_U_I64:
                instruction.opstring = "f32.convert_u/i64";
                break;
            case OP_F32_DEMOTE_F64:
                instruction.opstring = "f32.demote/f64";
                break;
            case OP_F64_CONVERT_S_I32:
                instruction.opstring = "f64.convert_s/i32";
                break;
            case OP_F64_CONVERT_U_I32:
                instruction.opstring = "f64.convert_u/i32";
                break;
            case OP_F64_CONVERT_S_I64:
                instruction.opstring = "f64.convert_s/i64";
                break;
            case OP_F64_CONVERT_U_I64:
                instruction.opstring = "f64.convert_u/i64";
                break;
            case OP_F64_PROMOTE_F32:
                instruction.opstring = "f64.promote/f32";
                break;
            case OP_I32_REINTERPRET_F32:
                instruction.opstring = "i32.reinterpret/f32";
                break;
            case OP_I64_REINTERPRET_F64:
                instruction.opstring = "i64.reinterpret/f64";
                break;
            case OP_F32_REINTERPRET_I32:
                instruction.opstring = "f32.reinterpret/i32";
                break;
            case OP_F64_REINTERPRET_I64:
                instruction.opstring = "f64.reinterpret/i64";
                break;
            default:
                throw "Invalid/unknown opcode " + instruction.opcode;
        }

        return instruction;
    }
};
