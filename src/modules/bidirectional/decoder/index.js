export {
  decodeKemperAscii,
  hasReadableAscii,
  KEMPER_VALID_ASCII_BYTES
} from "./kemperCharset.js";

export {
  describeFunctionCode,
  isParameterFunction,
  isStringFunction,
  KEMPER_FUNCTION_LABELS
} from "./functionCodes.js";

export {
  decodeKemperSysEx,
  formatDecodedBlock
} from "./decodeSysEx.js";

export {
  EXTENDED_FUNCTION_CODES,
  formatByteHex,
  formatExtendedAddressHex,
  isExtendedFunction,
  parseExtendedSysEx,
  unpackKemperUint32
} from "./decodeExtended.js";

export {
  describeUnknownParameter,
  ensureParameter,
  formatParameterIdHex,
  hasParameter,
  listRegisteredParameters,
  lookupParameter,
  paramId,
  PARAMETER_TYPE,
  registerParameter,
  registerParameters
} from "./parameterRegistry.js";

export { KNOWN_PARAMETERS } from "./knownParameters.js";

export {
  applyScaleFunction,
  encodeBoolean,
  encodeGain,
  encodeScaledValue,
  encodeTempo,
  isBooleanOn,
  PARAMETER_ENCODE_FUNCTIONS,
  PARAMETER_SCALE_FUNCTIONS,
  scaleBoolean,
  scaleEnum,
  scaleGain,
  scalePercent,
  scaleRaw,
  scaleString,
  scaleTempo
} from "./parameterScales.js";

export { ParameterStateStore } from "./parameterState.js";

export {
  FUNCTION_REQUEST_SINGLE_PARAMETER,
  FUNCTION_SINGLE_PARAMETER_CHANGE,
  buildSingleParameterChange,
  buildSingleParameterRequest,
  clampRaw14,
  splitParameterId
} from "./protocolMessages.js";
