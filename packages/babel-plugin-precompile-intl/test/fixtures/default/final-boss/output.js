import { __interpolate, __plural, __select } from "@stalkerg/precompile-intl-runtime";
export var foot = (__ctx, __values) => `${__interpolate(__values["count"])} ${__plural(__ctx, __values["count"], {
  o: "foot",
  h: "feet"
})}`;
export default {
  nearby: "Find places near your location",
  kilometer: (__ctx, __values) => `This year ${__select(__values["gender"], {
    male: `he made ${__plural(__ctx, __values["count"], {
      0: "no kilometres",
      1: "one kilometre",
      h: `${__interpolate(__values["count"])} kilometres`
    })}`,
    female: `she made ${__plural(__ctx, __values["count"], {
      0: "no kilometres",
      1: "one kilometre",
      h: `${__interpolate(__values["count"])} kilometres`
    })}`,
    other: `they made ${__plural(__ctx, __values["count"], {
      0: "no kilometres",
      1: "one kilometre",
      h: `${__interpolate(__values["count"])} kilometres`
    })}`
  })}`,
  foot: foot
};