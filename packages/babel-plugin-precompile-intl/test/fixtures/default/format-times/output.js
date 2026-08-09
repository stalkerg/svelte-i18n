import { __time } from "@stalkerg/precompile-intl-runtime";
export default {
  nearby: "Find places near your location",
  default: (__ctx, __values) => `Coupon expires at ${__time(__ctx, __values["expires"])}`,
  custom: (__ctx, __values) => `Coupon expires at ${__time(__ctx, __values["expires"], "medium")}`,
  onlyTime: (__ctx, __values) => __time(__ctx, __values["expires"], "short")
};