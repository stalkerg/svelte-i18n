import { __number } from "@stalkerg/precompile-intl-runtime";
export default {
  nearby: "Find places near your location",
  regular: (__ctx, __values) => `I have ${__number(__ctx, __values["count"])} cats`,
  customFormat: (__ctx, __values) => `Almost ${__number(__ctx, __values["blackCount"], "custom")} of them are black.`,
  percentage: (__ctx, __values) => `Almost ${__number(__ctx, __values["blackCount"], {
    style: "percent"
  })} of them are black.`,
  percentageWithTwoDecimals: (__ctx, __values) => `Almost ${__number(__ctx, __values["blackCount"], {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} of them are black.`,
  percentageWithScale: (__ctx, __values) => `Almost ${__number(__ctx, __values["blackCount"] / 0.01, {
    style: "percent",
    maximumFractionDigits: 2
  })} of them are black.`,
  rounded: (__ctx, __values) => `The dress I liked was ${__number(__ctx, __values["price"], {
    roundingMode: "ceil"
  })}`,
  noDecimals: (__ctx, __values) => `The dress I liked was ${__number(__ctx, __values["price"], {
    maximumFractionDigits: 0
  })}`,
  currency: (__ctx, __values) => `Account balance ${__number(__ctx, __values["balance"], {
    style: "currency",
    currency: "EUR"
  })}`,
  scientific: (__ctx, __values) => `Distance to star ${__number(__ctx, __values["distance"], {
    notation: "scientific"
  })}`,
  scientificSigned: (__ctx, __values) => `Distance to star ${__number(__ctx, __values["distance"], {
    notation: "scientific",
    signDisplay: "always"
  })}`,
  engineeringSigned: (__ctx, __values) => `Distance to star ${__number(__ctx, __values["distance"], {
    notation: "engineering",
    signDisplay: "always"
  })}`,
  complexMeasurementUnit: (__ctx, __values) => `Distance to destination: ${__number(__ctx, __values["distance"], {
    style: "unit",
    unit: "km"
  })}`,
  bossLevel: (__ctx, __values) => `${__number(__ctx, __values["initialFee"], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    trailingZeroDisplay: "stripIfInteger",
    style: "currency",
    currency: "GBP"
  })} annual fee`
};