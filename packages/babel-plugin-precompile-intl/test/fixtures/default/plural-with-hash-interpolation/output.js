import { __plural } from "@stalkerg/precompile-intl-runtime";
export default {
  nearby: "Find places near your location",
  kilometer: (__ctx, __values) => __plural(__ctx, __values["count"], {
    o: "just one kilometer",
    f: `just ${__values["count"]} kilometres`,
    h: `${__values["count"]} kilometers easily`
  })
};