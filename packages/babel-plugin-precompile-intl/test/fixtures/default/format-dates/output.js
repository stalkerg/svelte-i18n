import { __date } from "@stalkerg/precompile-intl-runtime";
export default {
  nearby: "Find places near your location",
  default: (__ctx, __values) => `Sale begins ${__date(__ctx, __values["start"])}`,
  custom: (__ctx, __values) => `Sale begins ${__date(__ctx, __values["start"], "medium")}`,
  onlyDate: (__ctx, __values) => __date(__ctx, __values["start"], "short")
};