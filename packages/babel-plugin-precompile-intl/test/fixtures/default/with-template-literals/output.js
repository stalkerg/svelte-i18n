import { __interpolate, __plural, __select } from "@stalkerg/precompile-intl-runtime";
export default {
  plain: `string`,
  multiline: `
    string
  `,
  with_interpolation: (__ctx, __values) => `city ${__interpolate(__values["city"])}`,
  with_plural: (__ctx, __values) => __plural(__ctx, __values["cats"], {
    o: "cat",
    h: `${__values["cats"]} cats`
  }),
  with_select: (__ctx, __values) => __select(__values["gender"], {
    male: "he",
    female: "she",
    other: "they"
  }),
  with_backticks: `add \`code\``,
  with_backticks_and_interpolation: (__ctx, __values) => `\`type\` is ${__interpolate(__values["type"])}`
};