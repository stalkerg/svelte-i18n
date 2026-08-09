import { __interpolate } from "@stalkerg/precompile-intl-runtime";
export default {
  br: "Line with <br> line break",
  br2: (__ctx, __values) => `Line with <br> and interpolation ${__interpolate(__values["val"])}`
};