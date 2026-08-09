import { __offsetPlural } from "@stalkerg/precompile-intl-runtime";
export default {
  gym: (__ctx, __values) => __offsetPlural(__ctx, __values["trainers"], 1, {
    z: "The gym is empty",
    o: "You are alone here",
    t: `You and ${__values["trainers"] - 1} trainer`,
    h: `You and ${__values["trainers"] - 1} other trainers`
  }),
  gymAndBasket: (__ctx, __values) => __offsetPlural(__ctx, __values["trainers"], 1, {
    z: "The gym is empty",
    o: "You are alone here",
    t: `You and ${__values["trainers"] - 1} trainer`,
    h: `You and ${__values["trainers"] - 1} other trainers ${__offsetPlural(__ctx, __values["friends"], 4, {
      0: "and you need 4 more to form a basket team",
      1: "and you need 3 more to play a basket game",
      2: "and you need 2 more to play a basket game",
      3: "and you need 1 more to play a basket game",
      4: "and you have enough mates to play a basket game",
      h: `and you can play a basket game and have ${__values["friends"] - 4} players in the bench`
    })}`
  })
};