import { types as t } from "mobx-state-tree";

export const optionalLiteral = <T extends string | number | boolean | Date>(
  v: T
) => t.optional(t.literal(v), v);
