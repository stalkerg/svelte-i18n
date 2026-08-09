import { __interpolate, __plural } from "@stalkerg/precompile-intl-runtime";
export default {
  nearby: "Find places near your location",
  kilometer: (__ctx, __values) => `${__interpolate(__values["count"])} ${__plural(__ctx, __values["count"], {
    1: "kilometer",
    h: "kilometers"
  })}`,
  kilometerWithTrailingInterpolation: (__ctx, __values) => `${__plural(__ctx, __values["count"], {
    1: "one kilometer",
    h: `${__values["count"]} kilometers`
  })} to go`,
  twoDigits: (__ctx, __values) => `Your have ${__plural(__ctx, __values["numCats"], {
    0: "no cats at all",
    1: "one single cat",
    2: "a couple cats",
    3: "a trio of cats",
    12: "a dozen cats",
    h: `exactly ${__values["numCats"]} cats`
  })}`,
  duration: (__ctx, __values) => `${__plural(__ctx, __values["years"], {
    0: "",
    o: "next year",
    h: `${__values["years"]} years from now`
  })}${__plural(__ctx, __values["months"], {
    0: "",
    o: "and one month",
    h: `and ${__values["months"]} months`
  })}`
};