import { CompletionSource } from "@codemirror/autocomplete";

const myCompletionSource: CompletionSource = (context) => {
  const arrayMethods = [
    "concat",
    "copyWithin",
    "entries",
    "every",
    "fill",
    "filter",
    "find",
    "findIndex",
    "flat",
    "flatMap",
    "forEach",
    "includes",
    "indexOf",
    "join",
    "keys",
    "lastIndexOf",
    "map",
    "pop",
    "push",
    "reduce",
    "reduceRight",
    "reverse",
    "shift",
    "slice",
    "some",
    "sort",
    "splice",
    "toLocaleString",
    "toString",
    "unshift",
    "values",
  ];

  const objectMethods = [
    "assign",
    "create",
    "defineProperties",
    "defineProperty",
    "entries",
    "freeze",
    "getOwnPropertyDescriptor",
    "getOwnPropertyDescriptors",
    "getOwnPropertyNames",
    "getOwnPropertySymbols",
    "getPrototypeOf",
    "hasOwnProperty",
    "is",
    "isExtensible",
    "isFrozen",
    "isPrototypeOf",
    "isSealed",
    "keys",
    "preventExtensions",
    "seal",
    "setPrototypeOf",
    "values",
    "toString",
    "toLocaleString",
  ];

  const combinedOptions = [
    ...arrayMethods.map((method) => ({ label: method })),
    ...objectMethods.map((method) => ({ label: method })),
  ];

  return {
    from: context.pos,
    options: combinedOptions,
  };
};
export default myCompletionSource;
