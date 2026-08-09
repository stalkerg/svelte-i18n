import { __select } from "@stalkerg/precompile-intl-runtime";
let tmp = 'other';
let tmp2 = 'yellow';
export default {
  nearby: "Find places near your location",
  "quoted": "Hello",
  "kilometer.a": (__ctx, __values) => `This year ${__select(__values["gender"], {
    male: "he made many kilometers",
    female: "she made many kilometers",
    other: "they made many kilometers"
  })}`,
  "kilometer.b": tmp,
  "kilometer.c": "qux",
  "good.great.excellent": (__ctx, __values) => __select(__values["gender"], {
    male: "He is a good boy",
    female: "She is a good girl",
    other: "They are good fellas"
  }),
  "good.great.tmp2": tmp2
};