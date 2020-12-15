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

let cetus = null;

// Inform the extension when we leave the page
window.onbeforeunload = function() {
    // Don't bother sending a reset message if Cetus didn't initialize.
    // This helps keep unrelated tabs from resetting the extension
    if (cetus !== null) {
        sendExtensionMessage("reset");
    }
};

// This function performs the main instrumentation logic of taking a
// a WebAssembly binary, making necessary additions/modifications, and
// returning the resulting binary
const instrumentBinary = function(bufferSource) {
    const wail = new WailParser();

    const funcTypeWatchCallback = wail.addTypeEntry({
        form: "func",
        params: [],
    });

    const funcTypeWriteWatchpoint = wail.addTypeEntry({
        form: "func",
        params: [],
    });

    const funcTypeReadWatchpoint = wail.addTypeEntry({
        form: "func",
        params: [ "i32", "i32", "i32" ],
        returnType: "i32",
    });

    // See the actual code entry for this function for a full explanation of why
    // we need to split value into upper and lower halves
    const funcTypeAddWatchpoint = wail.addTypeEntry({
        form: "func",
        // addr, value_lower, value_upper, size, flags
        params: [ "i32", "i32", "i32", "i32", "i32" ],
    });

    const funcEntryWriteWatchpoint = wail.addFunctionEntry({
        type: funcTypeWriteWatchpoint,
    });

    const funcEntryWriteWatchpoint8Bit = wail.addFunctionEntry({
        type: funcTypeWriteWatchpoint,
    });

    const funcEntryWriteWatchpoint16Bit = wail.addFunctionEntry({
        type: funcTypeWriteWatchpoint,
    });

    const funcEntryWriteWatchpoint32Bit = wail.addFunctionEntry({
        type: funcTypeWriteWatchpoint,
    });

    const funcEntryWriteWatchpoint64Bit = wail.addFunctionEntry({
        type: funcTypeWriteWatchpoint,
    });

    const funcEntryReadWatchpoint = wail.addFunctionEntry({
        type: funcTypeReadWatchpoint,
    });

    const funcEntryConfigureWatchpoint = wail.addFunctionEntry({
        type: funcTypeAddWatchpoint,
    });

    const importReadWatchFunc = wail.addImportEntry({
        moduleStr: "env",
        fieldStr: "readWatchCallback",
        kind: "func",
        type: funcTypeWatchCallback
    });

    const importWriteWatchFunc = wail.addImportEntry({
        moduleStr: "env",
        fieldStr: "writeWatchCallback",
        kind: "func",
        type: funcTypeWatchCallback
    });

    const globalWatchAddr = wail.addGlobalEntry({
        globalType: {
            contentType: "i32",
            mutability: true,
        },
        initExpr: [ OP_I32_CONST, VarUint32(0x00), OP_END ]
    });

    const globalWatchVal = wail.addGlobalEntry({
        globalType: {
            contentType: "i64",
            mutability: true,
        },
        initExpr: [ OP_I64_CONST, VarUint32(0x00), OP_END ]
    });

    const globalWatchSize = wail.addGlobalEntry({
        globalType: {
            contentType: "i32",
            mutability: true,
        },
        initExpr: [ OP_I32_CONST, VarUint32(0x00), OP_END ]
    });

    const globalWatchFlags = wail.addGlobalEntry({
        globalType: {
            contentType: "i32",
            mutability: true,
        },
        initExpr: [ OP_I32_CONST, VarUint32(0x00), OP_END ]
    });

    wail.addExportEntry(funcEntryConfigureWatchpoint, {
        fieldStr: "addWatch",
        kind: "func",
    });

    //
    // This function routes a watchpoint check to the correct handler depending on
    // the size of the configured watchpoint (1, 2, 4, or 8 bytes)
    //
    wail.addCodeEntry(funcEntryWriteWatchpoint, {
        locals: [ "i32" ],
        code: [
            OP_GET_GLOBAL, globalWatchSize.varUint32(),
            OP_TEE_LOCAL, VarUint32(0x00),
            OP_I32_CONST, VarUint32(0x01),
            OP_I32_EQ,
            OP_IF, 0x40,
                OP_CALL, funcEntryWriteWatchpoint8Bit.varUint32(),
                OP_RETURN,
            OP_END,
            OP_GET_LOCAL, VarUint32(0x00),
            OP_I32_CONST, VarUint32(0x02),
            OP_I32_EQ,
            OP_IF, 0x40,
                OP_CALL, funcEntryWriteWatchpoint16Bit.varUint32(),
                OP_RETURN,
            OP_END,
            OP_GET_LOCAL, VarUint32(0x00),
            OP_I32_CONST, VarUint32(0x04),
            OP_I32_EQ,
            OP_IF, 0x40,
                OP_CALL, funcEntryWriteWatchpoint32Bit.varUint32(),
                OP_RETURN,
            OP_END,
            OP_GET_LOCAL, VarUint32(0x00),
            OP_I32_CONST, VarUint32(0x08),
            OP_I32_EQ,
            OP_IF, 0x40,
                OP_CALL, funcEntryWriteWatchpoint64Bit.varUint32(),
                OP_RETURN,
            OP_END,
            OP_RETURN,
            OP_END,
        ]
    });

    wail.addCodeEntry(funcEntryWriteWatchpoint8Bit, {
        locals: [],
        code: [
            // We have already checked that globalWatchAddr != 0 (See
            // writeWatchpointInstrCallback) so we start by making sure the
            // value of our watched address has changed
            OP_GET_GLOBAL, globalWatchAddr.varUint32(),
            OP_I64_LOAD8_U, VarUint32(0x00), VarUint32(0x00),
            OP_GET_GLOBAL, globalWatchVal.varUint32(),
            OP_I64_NE,
            OP_IF, 0x40,
                // If our watched value has changed since we last looked,
                // we check which flags are set for our watchpoint
                OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                OP_I32_CONST, VarUint32(0x01),
                OP_I32_AND,
                OP_IF, 0x40,
                    // WRITE flag is set, trigger imported callback
                    OP_CALL, importWriteWatchFunc.varUint32(),
                    OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                    OP_I32_CONST, VarUint32(0x04),
                    OP_I32_AND,
                    OP_I32_CONST, VarUint32(0x00),
                    OP_I32_EQ,
                    OP_IF, 0x40,
                        OP_GET_GLOBAL, globalWatchAddr.varUint32(),
                        OP_I64_LOAD8_U, VarUint32(0x00), VarUint32(0x00),
                        OP_SET_GLOBAL, globalWatchVal.varUint32(),
                    OP_END,
                OP_END,
                OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                OP_I32_CONST, VarUint32(0x04),
                OP_I32_AND,
                OP_IF, 0x40,
                    // FREEZE flag is set, revert the value
                    OP_GET_GLOBAL, globalWatchAddr.varUint32(),
                    OP_GET_GLOBAL, globalWatchVal.varUint32(),
                    OP_I64_STORE8, VarUint32(0x00), VarUint32(0x00),
                OP_END,
            OP_END,
            OP_RETURN,
            OP_END,
        ]
    });

    wail.addCodeEntry(funcEntryWriteWatchpoint16Bit, {
        locals: [],
        code: [
            // We have already checked that globalWatchAddr != 0 (See
            // writeWatchpointInstrCallback) so we start by making sure the
            // value of our watched address has changed
            OP_GET_GLOBAL, globalWatchAddr.varUint32(),
            OP_I64_LOAD16_U, VarUint32(0x00), VarUint32(0x00),
            OP_GET_GLOBAL, globalWatchVal.varUint32(),
            OP_I64_NE,
            OP_IF, 0x40,
                // If our watched value has changed since we last looked,
                // we check which flags are set for our watchpoint
                OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                OP_I32_CONST, VarUint32(0x01),
                OP_I32_AND,
                OP_IF, 0x40,
                    // WRITE flag is set, trigger imported callback
                    OP_CALL, importWriteWatchFunc.varUint32(),
                    OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                    OP_I32_CONST, VarUint32(0x04),
                    OP_I32_AND,
                    OP_I32_CONST, VarUint32(0x00),
                    OP_I32_EQ,
                    OP_IF, 0x40,
                        OP_GET_GLOBAL, globalWatchAddr.varUint32(),
                        OP_I64_LOAD16_U, VarUint32(0x00), VarUint32(0x00),
                        OP_SET_GLOBAL, globalWatchVal.varUint32(),
                    OP_END,
                OP_END,
                OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                OP_I32_CONST, VarUint32(0x04),
                OP_I32_AND,
                OP_IF, 0x40,
                    // FREEZE flag is set, revert the value
                    OP_GET_GLOBAL, globalWatchAddr.varUint32(),
                    OP_GET_GLOBAL, globalWatchVal.varUint32(),
                    OP_I64_STORE16, VarUint32(0x00), VarUint32(0x00),
                OP_END,
            OP_END,
            OP_RETURN,
            OP_END,
        ]
    });
    wail.addCodeEntry(funcEntryWriteWatchpoint32Bit, {
        locals: [],
        code: [
            // We have already checked that globalWatchAddr != 0 (See
            // writeWatchpointInstrCallback) so we start by making sure the
            // value of our watched address has changed
            OP_GET_GLOBAL, globalWatchAddr.varUint32(),
            OP_I64_LOAD32_U, VarUint32(0x01), VarUint32(0x00),
            OP_GET_GLOBAL, globalWatchVal.varUint32(),
            OP_I64_NE,
            OP_IF, 0x40,
                // If our watched value has changed since we last looked,
                // we check which flags are set for our watchpoint
                OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                OP_I32_CONST, VarUint32(0x01),
                OP_I32_AND,
                OP_IF, 0x40,
                    // WRITE flag is set, trigger imported callback
                    OP_CALL, importWriteWatchFunc.varUint32(),
                    OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                    OP_I32_CONST, VarUint32(0x04),
                    OP_I32_AND,
                    OP_I32_CONST, VarUint32(0x00),
                    OP_I32_EQ,
                    OP_IF, 0x40,
                        OP_GET_GLOBAL, globalWatchAddr.varUint32(),
                        OP_I64_LOAD32_U, VarUint32(0x01), VarUint32(0x00),
                        OP_SET_GLOBAL, globalWatchVal.varUint32(),
                    OP_END,
                OP_END,
                OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                OP_I32_CONST, VarUint32(0x04),
                OP_I32_AND,
                OP_IF, 0x40,
                    // FREEZE flag is set, revert the value
                    OP_GET_GLOBAL, globalWatchAddr.varUint32(),
                    OP_GET_GLOBAL, globalWatchVal.varUint32(),
                    OP_I64_STORE32, VarUint32(0x01), VarUint32(0x00),
                OP_END,
            OP_END,
            OP_RETURN,
            OP_END,
        ]
    });

    wail.addCodeEntry(funcEntryWriteWatchpoint64Bit, {
        locals: [],
        code: [
            // We have already checked that globalWatchAddr != 0 (See
            // writeWatchpointInstrCallback) so we start by making sure the
            // value of our watched address has changed
            OP_GET_GLOBAL, globalWatchAddr.varUint32(),
            OP_I64_LOAD, VarUint32(0x01), VarUint32(0x00),
            OP_GET_GLOBAL, globalWatchVal.varUint32(),
            OP_I64_NE,
            OP_IF, 0x40,
                // If our watched value has changed since we last looked,
                // we check which flags are set for our watchpoint
                OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                OP_I32_CONST, VarUint32(0x01),
                OP_I32_AND,
                OP_IF, 0x40,
                    // WRITE flag is set, trigger imported callback
                    OP_CALL, importWriteWatchFunc.varUint32(),
                    OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                    OP_I32_CONST, VarUint32(0x04),
                    OP_I32_AND,
                    OP_I32_CONST, VarUint32(0x00),
                    OP_I32_EQ,
                    OP_IF, 0x40,
                        OP_GET_GLOBAL, globalWatchAddr.varUint32(),
                        OP_I64_LOAD, VarUint32(0x01), VarUint32(0x00),
                        OP_SET_GLOBAL, globalWatchVal.varUint32(),
                    OP_END,
                OP_END,
                OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                OP_I32_CONST, VarUint32(0x04),
                OP_I32_AND,
                OP_IF, 0x40,
                    // FREEZE flag is set, revert the value
                    OP_GET_GLOBAL, globalWatchAddr.varUint32(),
                    OP_GET_GLOBAL, globalWatchVal.varUint32(),
                    OP_I64_STORE, VarUint32(0x01), VarUint32(0x00),
                OP_END,
            OP_END,
            OP_RETURN,
            OP_END,
        ]
    });

    //
    // This function is the primary logic for read watch points. It takes an
    // address, offset, and size of an attempted memory load and calculates
    // whether that load will read from a watchpoint address. If so, it calls
    // the registered watchpoint callback
    //
    // Arguments:
    //  local_0 = base pointer
    //  local_1 = load offset
    //  local_2 = load size
    //
    wail.addCodeEntry(funcEntryReadWatchpoint, {
        locals: [],
        code: [
            OP_BLOCK, 0x40,
                OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                OP_IF, 0x40,
                    OP_GET_GLOBAL, globalWatchFlags.varUint32(),
                    OP_I32_CONST, VarUint32(0x02),
                    OP_I32_AND,
                    OP_IF, 0x40,
                        OP_GET_GLOBAL, globalWatchAddr.varUint32(),
                        OP_GET_GLOBAL, globalWatchSize.varUint32(),
                        OP_I32_ADD,
                        OP_GET_LOCAL, VarUint32(0x00),
                        OP_GET_LOCAL, VarUint32(0x01),
                        OP_I32_ADD,
                        OP_I32_LT_U,
                        OP_BR_IF, VarUint32(0x02),
                        OP_GET_GLOBAL, globalWatchAddr.varUint32(),
                        OP_GET_LOCAL, VarUint32(0x00),
                        OP_GET_LOCAL, VarUint32(0x01),
                        OP_I32_ADD,
                        OP_GET_LOCAL, VarUint32(0x02),
                        OP_I32_ADD,
                        OP_I32_GT_U,
                        OP_BR_IF, VarUint32(0x02),
                        OP_CALL, importReadWatchFunc.varUint32(),
                    OP_END,
                OP_END,
            OP_END,
            OP_GET_LOCAL, VarUint32(0x00),
            OP_RETURN,
            OP_END,
        ]
    });

    //
    // This function is called to configure a watchpoint by setting the associated
    // global variables.
    // Once mutable external global variables are widely supported by browsers, this
    // can be done from Javascript and this function can be removed
    //
    // Exported functions cannot have i64/f64 as arguments at time of writing. So in
    // order to support 64-bit watchpoint values, we need to pass the upper/lower
    // 32-bits as separate arguments. We then recombine them and set globalWatchVal
    //
    // Arguments:
    //  arg_0 = watch address
    //  arg_1 = watch value lower
    //  arg_2 = watch value upper
    //  arg_3 = watch size
    //  arg_4 = watch flags
    //
    wail.addCodeEntry(funcEntryConfigureWatchpoint, {
        locals: [],
        code: [
            // globalWatchAddr = arg_0
            OP_GET_LOCAL, VarUint32(0x00),
            OP_SET_GLOBAL, globalWatchAddr.varUint32(),

            // globalWatchVal = (arg_1 | (arg_2 << 32))
            OP_GET_LOCAL, VarUint32(0x01),
            OP_I64_EXTEND_U_I32,
            OP_GET_LOCAL, VarUint32(0x02),
            OP_I64_EXTEND_U_I32,
            OP_I64_CONST, VarUint32(0x20),
            OP_I64_SHL,
            OP_I64_OR,
            OP_SET_GLOBAL, globalWatchVal.varUint32(),

            // globalWatchSize = arg_3
            OP_GET_LOCAL, VarUint32(0x03),
            OP_SET_GLOBAL, globalWatchSize.varUint32(),

            // globalWatchFlags = arg_4
            OP_GET_LOCAL, VarUint32(0x04),
            OP_SET_GLOBAL, globalWatchFlags.varUint32(),
            OP_RETURN,
            OP_END,
        ]
    });

    // TODO Comment description
    const readWatchpointInstrCallback = function(instrBytes) {
        const reader = new BufferReader(instrBytes);

        const opcode = reader.readUint8();

        const flags = reader.readVarUint32();
        const offset = reader.readVarUint32();

        const pushSizeOpcode = [ OP_I32_CONST ];

        let pushSizeImmediate;

        switch (opcode) {
            case OP_I32_LOAD8_S:
            case OP_I32_LOAD8_U:
            case OP_I64_LOAD8_S:
            case OP_I64_LOAD8_U:
                pushSizeImmediate = VarUint32(1);
                break;
            case OP_I32_LOAD16_S:
            case OP_I32_LOAD16_U:
            case OP_I64_LOAD16_S:
            case OP_I64_LOAD16_U:
                pushSizeImmediate = VarUint32(2);
                break;
            case OP_I32_LOAD:
            case OP_F32_LOAD:
            case OP_I64_LOAD32_S:
            case OP_I64_LOAD32_U:
                pushSizeImmediate = VarUint32(4);
                break;
            case OP_I64_LOAD:
            case OP_F64_LOAD:
                pushSizeImmediate = VarUint32(8);
                break;
            case OP_ATOMIC:
                const arg = instrBytes[1];
                switch(arg) {
                    case ARG_I32_ATOMIC_LOAD:
                    case ARG_I64_ATOMIC_LOAD_32U:
                        pushSizeImmediate = VarUint32(4);
                        break;
                    case ARG_I64_ATOMIC_LOAD:
                        pushSizeImmediate = VarUint32(8);
                        break;
                    case ARG_I32_ATOMIC_LOAD_8U:
                    case ARG_I64_ATOMIC_LOAD_8U:
                        pushSizeImmediate = VarUint32(1);
                        break;
                    case ARG_I32_ATOMIC_LOAD_16U:
                    case ARG_I64_ATOMIC_LOAD_16U:
                        pushSizeImmediate = VarUint32(2);
                        break;
                    default:
                        throw new Error("Bad atomic argument in readWatchpointInstrCallback()");
                }
                break;
            default:
                throw new Error("Bad opcode in readWatchpointInstrCallback()");
        }

        // This would be cleaner using the spread operator, however it would
        // also be ludicrously slow
        const pushOffsetOpcode = [ OP_I32_CONST ];
        const pushOffsetImmediate = VarUint32(offset);

        const callOpcode = [ OP_CALL ];
        const callDest = funcEntryReadWatchpoint.varUint32();

        reader.copyBuffer(pushSizeOpcode);
        reader.copyBuffer(pushSizeImmediate);
        reader.copyBuffer(pushOffsetOpcode);
        reader.copyBuffer(pushOffsetImmediate);
        reader.copyBuffer(callOpcode);
        reader.copyBuffer(callDest);
        reader.copyBuffer(instrBytes);

        return reader.write();
    };

    //
    // Each store instruction is followed by a check to see if that instruction modified
    // a "watchpoint" address. The actual "watchpoint" function will not be called
    // unless the flag is nonzero. This is just a quick, preliminary check to help ensure
    // that the least extra instructions possible are executed when watchpoints are disabled.
    // The real watchpoint logic exists in the CODE entry for funcEntryWriteWatchpoint above.
    //
    // Injected instructions:
    //
    // get_global <globalWatchFlags>
    // if
    //     call <funcEntryWriteWatchpoint>
    // end 
    //
    const writeWatchpointInstrCallback = function(instrBytes) {
        const reader = new BufferReader();

        // As mentioned above, we avoid using the spread operator here solely
        // for performance reasons
        const getGlobalOpcode = [ OP_GET_GLOBAL ];
        const getGlobalImmediate = globalWatchFlags.varUint32();

        const ifOpcode = [ OP_IF, 0x40 ];

        const callOpcode = [ OP_CALL ];
        const callDest = funcEntryWriteWatchpoint.varUint32();

        const endOpcode = [ OP_END ];

        reader.copyBuffer(instrBytes);
        reader.copyBuffer(getGlobalOpcode);
        reader.copyBuffer(getGlobalImmediate);
        reader.copyBuffer(ifOpcode);
        reader.copyBuffer(callOpcode);
        reader.copyBuffer(callDest);
        reader.copyBuffer(endOpcode);

        return reader.write();
    };

    // All atomic instructions start with the same opcode (0xFE) so they need
    // their own parser
    // This parser just ensures that the instruction is actually an atomic load/store
    // then routes the instruction to the proper callback
    const atomicInstrCallback = function(instrBytes) {
        const arg = instrBytes[1];

        if (arg >= ARG_I32_ATOMIC_LOAD && arg <= ARG_I64_ATOMIC_LOAD_32U) {
            return readWatchpointInstrCallback(instrBytes);
        }
        else if (arg >= ARG_I32_ATOMIC_STORE && arg <= ARG_I64_ATOMIC_RMW_CMPXCHG_32U) {
            return writeWatchpointInstrCallback(instrBytes);

        }

        return instrBytes;
    };

    wail.addInstructionParser(OP_I32_LOAD,     readWatchpointInstrCallback);
    wail.addInstructionParser(OP_I64_LOAD,     readWatchpointInstrCallback);
    wail.addInstructionParser(OP_F32_LOAD,     readWatchpointInstrCallback);
    wail.addInstructionParser(OP_F64_LOAD,     readWatchpointInstrCallback);
    wail.addInstructionParser(OP_I32_LOAD8_S,  readWatchpointInstrCallback);
    wail.addInstructionParser(OP_I32_LOAD8_U,  readWatchpointInstrCallback);
    wail.addInstructionParser(OP_I32_LOAD16_S, readWatchpointInstrCallback);
    wail.addInstructionParser(OP_I32_LOAD16_U, readWatchpointInstrCallback);
    wail.addInstructionParser(OP_I64_LOAD8_S,  readWatchpointInstrCallback);
    wail.addInstructionParser(OP_I64_LOAD8_U,  readWatchpointInstrCallback);
    wail.addInstructionParser(OP_I64_LOAD16_S, readWatchpointInstrCallback);
    wail.addInstructionParser(OP_I64_LOAD16_U, readWatchpointInstrCallback);
    wail.addInstructionParser(OP_I64_LOAD32_S, readWatchpointInstrCallback);
    wail.addInstructionParser(OP_I64_LOAD32_U, readWatchpointInstrCallback);

    wail.addInstructionParser(OP_I32_STORE,   writeWatchpointInstrCallback);
    wail.addInstructionParser(OP_I64_STORE,   writeWatchpointInstrCallback);
    wail.addInstructionParser(OP_F32_STORE,   writeWatchpointInstrCallback);
    wail.addInstructionParser(OP_F64_STORE,   writeWatchpointInstrCallback);
    wail.addInstructionParser(OP_I32_STORE8,  writeWatchpointInstrCallback);
    wail.addInstructionParser(OP_I32_STORE16, writeWatchpointInstrCallback);
    wail.addInstructionParser(OP_I64_STORE8,  writeWatchpointInstrCallback);
    wail.addInstructionParser(OP_I64_STORE16, writeWatchpointInstrCallback);
    wail.addInstructionParser(OP_I64_STORE32, writeWatchpointInstrCallback);

    wail.addInstructionParser(OP_ATOMIC, atomicInstrCallback);

    let memoryInstancePath = {};

    // We use this callback to retrieve the path to the memory object
    // If multiple memory objects are supported in the future, this will need to change
    const importInstrCallback = function(parameters) {
        if (parameters.kind == KIND_MEMORY) {
            const decoder = new TextDecoder();

            memoryInstancePath.module = decoder.decode(parameters.module);
            memoryInstancePath.field = decoder.decode(parameters.field);
        }
    }

    wail.addImportElementParser(null, importInstrCallback);

    // cetusPatches will be set early on in page load if there are any configured patches
    // for this binary
    if (typeof cetusPatches === "object") {
        for (let i = 0; i < cetusPatches.length; i++) {
            const funcIndex = parseInt(cetusPatches[i].index);
            const funcBytes = cetusPatches[i].bytes;

            const parserCallback = function(parameters) {
                return funcBytes;
            };

            wail.addCodeElementParser(funcIndex, parserCallback);
        }
    }

    wail.load(bufferSource);

    wail.parse();

    const symObj = {};

    const writeWpIndex = wail.getFunctionIndex(funcEntryWriteWatchpoint);
    const readWpIndex =  wail.getFunctionIndex(funcEntryReadWatchpoint);
    const configWpIndex = wail.getFunctionIndex(funcEntryConfigureWatchpoint);

    const resultObj = {};

    resultObj.buffer = wail.write();

    symObj[writeWpIndex.i32()] = "_wp_write";
    symObj[readWpIndex.i32()] = "_wp_read";
    symObj[configWpIndex.i32()] = "_wp_config";

    resultObj.symbols = symObj;
    resultObj.memory = memoryInstancePath;

    return resultObj;
};

// Callback that is executed when a read watchpoint is hit
const readWatchCallback = function() {
    const stackTrace = StackTrace.get().then(stacktraceCallback);
};

// Callback that is executed when a write watchpoint is hit
const writeWatchCallback = function() {
    const stackTrace = StackTrace.get().then(stacktraceCallback);
};

const stacktraceCallback = function(stackFrames) {
    const trimmedStackFrame = [];

    let watchPointsFound = 0;

    // We want to provide the user with a clean stack trace that doesn't include
    // functions that we've injected. To do that, we remove all "chrome-extension://"
    // entries and the most recent "wasm-function" (Since that is our watchpoint function)
    for (let i = 0; i < stackFrames.length; i++) {
        const thisFrame = stackFrames[i];

        let fileName = thisFrame.fileName;

        const substrIndex = fileName.indexOf("wasm-function");

        if (substrIndex === -1) {
            continue;
        }

        fileName = fileName.substring(substrIndex);

        let lineNumber = thisFrame.lineNumber;

        if (typeof lineNumber === "undefined") {
            const colonIndex = fileName.indexOf(":");

            if (colonIndex !== "-1") {
                lineNumber = parseInt(fileName.substring(colonIndex + 1));
                fileName = fileName.substring(0, colonIndex);
            }
        }

        const newFrame = {};

        newFrame.fileName = fileName;
        newFrame.lineNumber = lineNumber;

        if (watchPointsFound < 2) {
            watchPointsFound++;
            continue;
        }

        trimmedStackFrame.push(newFrame);
    }

    const msgBody = {
        stackTrace: trimmedStackFrame
    };

    sendExtensionMessage("watchPointHit", msgBody);
};

const oldWebAssemblyInstantiate = WebAssembly.instantiate;

const webAssemblyInstantiateHook = function(bufferSource, importObject) {
    colorLog("WebAssembly.instantiate() intercepted");

    const instrumentResults = instrumentBinary(bufferSource);

    const instrumentedBuffer = instrumentResults.buffer;
    const instrumentedSymbols = instrumentResults.symbols;

    const memoryModule = instrumentResults.memory.module;
    const memoryField = instrumentResults.memory.field;
    const memoryInstance = importObject[memoryModule][memoryField];

    // Emscripten by default stores most of the environment in importObject.env
    // If it doesn't exist already let's create it so we have a place to put 
    // our imported functions
    if (typeof importObject.env !== "object") {
        importObject.env = {};
    }

    importObject.env.readWatchCallback = readWatchCallback;
    importObject.env.writeWatchCallback = writeWatchCallback;

    return new Promise(function(resolve, reject) {
        oldWebAssemblyInstantiate(instrumentedBuffer, importObject).then(function(instanceObject) {
            cetus = new Cetus({
                memory: memoryInstance,
                watchpointExports: [instanceObject.instance.exports.addWatch],
                buffer: instrumentedBuffer,
                symbols: instrumentedSymbols
            });

            resolve(instanceObject);
        });
    });
};

window.WebAssembly.instantiate = webAssemblyInstantiateHook;

let instrumentedBuffer;
let instrumentedSymbols;

const oldWebAssemblyModule = WebAssembly.Module;

const webAssemblyModuleHook = function(bufferSource) {
    colorLog("WebAssembly.Module() intercepted");

    const instrumentResults = instrumentBinary(bufferSource);

    const instrumentedBuffer = instrumentResults.buffer;
    const instrumentedSymbols = instrumentResults.symbols;

    const memoryModule = instrumentResults.memory.module;
    const memoryField = instrumentResults.memory.field;
    const memoryInstance = importObject[memoryModule][memoryField];

    // Emscripten by default stores most of the environment in importObject.env
    // If it doesn't exist already let's create it so we have a place to put 
    // our imported functions
    if (typeof importObject.env !== "object") {
        importObject.env = {};
    }

    cetus = new Cetus({
        memory: memoryInstance,
        watchpointExports: [instanceObject.instance.exports.addWatch],
        buffer: instrumentedBuffer,
        symbols: instrumentedSymbols
    });

    return oldWebAssemblyModule(instrumentedBuffer);
};

window.WebAssembly.Module = webAssemblyModuleHook;

const oldWebAssemblyInstance = WebAssembly.Instance;

const webAssemblyInstanceHook = function(module, importObject) {
    colorLog("WebAssembly.Instance() intercepted");

    const instrumentResults = instrumentBinary(bufferSource);

    const instrumentedBuffer = instrumentResults.buffer;
    const instrumentedSymbols = instrumentResults.symbols;

    const memoryModule = instrumentResults.memory.module;
    const memoryField = instrumentResults.memory.field;
    const memoryInstance = importObject[memoryModule][memoryField];

    // Emscripten by default stores most of the environment in importObject.env
    // If it doesn't exist already let's create it so we have a place to put 
    // our imported functions
    if (typeof importObject.env !== "object") {
        importObject.env = {};
    }

    importObject.env.readWatchCallback = readWatchCallback;
    importObject.env.writeWatchCallback = writeWatchCallback;

    cetus = new Cetus({
        memory: memoryInstance,
        watchpointExports: [instanceObject.instance.exports.addWatch],
        buffer: instrumentedBuffer,
        symbols: instrumentedSymbols
    });

    return oldWebAssemblyInstance(instrumentedBuffer, importObject);
};

window.WebAssembly.Instance = webAssemblyInstanceHook;

const oldWebAssemblyInstantiateStreaming = WebAssembly.instantiateStreaming;

const webAssemblyInstantiateStreamingHook = function(sourceObj, importObject) {
    colorLog("WebAssembly.instantiateStreaming() intercepted");

    // TODO In the future we should retrieve the memory object by parsing the IMPORT/EXPORT
    // sections of the binary. But for now this is pretty reliable
    let memoryObj = null;

    // Some older versions of emscripten use importObject.a instead of importObject.env.
    // Simply link importObject.a to importObject.env if importObject.a exists
    if (typeof importObject.a !== "undefined" && typeof importObject.env === "undefined") {
        importObject.env = importObject.a;
    }

    // Emscripten by default stores most of the environment in importObject.env
    // If it doesn't exist already let's create it so we have a place to put 
    // our imported functions
    if (typeof importObject.env === "undefined") {
        importObject.env = {};
    }
    else {
        if (importObject.env.memory instanceof WebAssembly.Memory) {
            memoryObj = importObject.env.memory;
        }
    }

    importObject.env.readWatchCallback = readWatchCallback;
    importObject.env.writeWatchCallback = writeWatchCallback;

    const wail = new WailParser();

    return new Promise(function(resolve, reject) {
        const handleBuffer = function(bufferSource) {
            const instrumentResults = instrumentBinary(bufferSource);

            const instrumentedBuffer = instrumentResults.buffer;
            const instrumentedSymbols = instrumentResults.symbols;

            oldWebAssemblyInstantiate(instrumentedBuffer, importObject).then(function(instanceObject) {
                if (memoryObj == null) {
                    memoryObj = instanceObject.instance.exports.memory;
                }

                cetus = new Cetus({
                    memory: memoryObj,
                    watchpointExports: [instanceObject.instance.exports.addWatch],
                    buffer: instrumentedBuffer,
                    symbols: instrumentedSymbols
                });

                resolve(instanceObject);
            });
        }

        if (sourceObj instanceof Promise) {
            sourceObj.then((res) => res.arrayBuffer()).then((bufferSource) => {
                handleBuffer(bufferSource);
            });
        }
        else if (sourceObj instanceof Response) {
            sourceObj.arrayBuffer().then((bufferSource) => {
                handleBuffer(bufferSource);
            });
        }
        else {
            colorError("Got unexpected object type as first argument to WebAssembly.instantiateStreaming");
        }
    });
};

window.WebAssembly.instantiateStreaming = webAssemblyInstantiateStreamingHook;
