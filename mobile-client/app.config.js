const base = require("./app.json");

const version = process.env.APP_VERSION ?? base.expo.version;
const versionCode = Number(
  process.env.ANDROID_VERSION_CODE ??
    version
      .split(".")
      .reduce(
        (code, part, index) => code + Number(part) * [10000, 100, 1][index],
        0,
      ),
);

if (!Number.isInteger(versionCode) || versionCode < 1) {
  throw new Error("ANDROID_VERSION_CODE must be a positive integer.");
}

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    name: "ImpactC",
    slug: "impactc",
    version,
    scheme: "impactc",
    android: {
      ...base.expo.android,
      package: "com.optimizesolux.impactc",
      versionCode,
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE ?? null,
      releaseChannel: process.env.IMPACTC_RELEASE_CHANNEL ?? "development",
    },
  },
};
