import { __interpolate, __select } from "@stalkerg/precompile-intl-runtime";
export default {
  nearby: "Find places near your location",
  kilometer: (__ctx, __values) => `This year ${__select(__values["gender"], {
    male: "he made many kilometers",
    female: "she made many kilometers",
    other: "they made many kilometers"
  })}`,
  good: (__ctx, __values) => __select(__values["gender"], {
    male: "He is a good boy",
    female: "She is a good girl",
    other: "They are good fellas"
  }),
  goodWithInterpolation: (__ctx, __values) => `${__select(__values["gender"], {
    male: "He is a good boy",
    female: "She is a good girl",
    other: "They are good fellas"
  })} and ${__interpolate(__values["value"])} interpolated`
};