import { __interpolate } from "@stalkerg/precompile-intl-runtime";
export default {
  nearby: "Find places near your location",
  kilometer: (__ctx, __values) => `${__interpolate(__values["count"])} kilometers`,
  exactDistance: (__ctx, __values) => `${__interpolate(__values["km"])}km, ${__interpolate(__values["m"])} meters and ${__interpolate(__values["cm"])} centimeters`
};