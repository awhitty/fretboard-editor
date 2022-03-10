import {
  sand,
  blue,
  red,
  green,
  tomato,
  orange,
  sandDark,
  blueDark,
  redDark,
  greenDark,
  tomatoDark,
} from "@radix-ui/colors";

import { createStitches, PropertyValue } from "@stitches/react";

export const {
  styled,
  createTheme,
  globalCss,
  theme: { colors },
  config,
} = createStitches({
  theme: {
    colors: {
      ...sand,
      ...blue,
      ...red,
      ...green,
      ...orange,
      ...tomato,
    },
  },
  utils: {
    vStack: (value: PropertyValue<"gap">) => ({
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: value,
    }),
    hStack: (value: PropertyValue<"gap">) => ({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: value,
    }),
  },
});

export const darkTheme = createTheme({
  colors: {
    ...sandDark,
    ...blueDark,
    ...redDark,
    ...greenDark,
    ...tomatoDark,
  },
});
