import { Config } from "@remotion/cli/config";
Config.overrideWebpackConfig((c) => {
  const walk = (rules: any[] | undefined) => rules?.forEach((r: any) => {
    if (r && typeof r === "object") {
      const uses = Array.isArray(r.use) ? r.use : r.use ? [r.use] : [];
      uses.forEach((u: any) => { if (u && typeof u === "object" && String(u.loader).includes("esbuild")) u.options = { ...u.options, tsconfigRaw: {} }; });
      if (r.loader && String(r.loader).includes("esbuild")) r.options = { ...r.options, tsconfigRaw: {} };
      walk(r.oneOf); walk(r.rules);
    }
  });
  walk(c.module?.rules as any[]);
  return c;
});
