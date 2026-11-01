import assert from "node:assert/strict";
import { test } from "node:test";
import { ESLint } from "eslint";
import next from "@next/eslint-plugin-next";
import hooks from "eslint-plugin-react-hooks";

const eslint = new ESLint();
const filePath = "src/app/page.tsx";
const checks = [
  [
    "Next.js rejects async client components",
    "@next/next/no-async-client-component",
    '"use client"; export default async function Page() { return <main />; }',
  ],
  [
    "React lists require stable keys",
    "@eslint-react/no-missing-key",
    "export function List() { return [1, 2].map(value => <span>{value}</span>); }",
  ],
  [
    "React children cannot coexist with raw HTML",
    "@eslint-react/dom-no-dangerously-set-innerhtml-with-children",
    'export function Html() { return <div dangerouslySetInnerHTML={{ __html: "" }}>Child</div>; }',
  ],
  [
    "Hooks cannot run conditionally",
    "react-hooks/rules-of-hooks",
    'import { useState } from "react"; export function Example({ enabled }: { enabled: boolean }) { if (enabled) useState(0); return null; }',
  ],
  [
    "Effect dependencies remain checked",
    "react-hooks/exhaustive-deps",
    'import { useEffect } from "react"; export function Example({ value }: { value: string }) { useEffect(() => console.log(value), []); return null; }',
  ],
  [
    "Image alternatives remain required",
    "jsx-a11y-x/alt-text",
    'export function Image() { return <img src="/example.png" />; }',
  ],
  [
    "Unknown ARIA properties remain rejected",
    "jsx-a11y-x/aria-props",
    'export function Example() { return <button type="button" aria-boop="true">Open</button>; }',
  ],
  [
    "ARIA value types remain checked",
    "jsx-a11y-x/aria-proptypes",
    'export function Example() { return <div aria-hidden="maybe" />; }',
  ],
  [
    "Required ARIA state remains checked",
    "jsx-a11y-x/role-has-required-aria-props",
    'export function Example() { return <div role="checkbox" tabIndex={0} />; }',
  ],
  ["TypeScript explicit any remains rejected", "@typescript-eslint/no-explicit-any", "export const value: any = 1;"],
  [
    "Unused variables remain detected",
    "@typescript-eslint/no-unused-vars",
    "const unused = 1; export const value = 2;",
  ],
];

for (const [name, ruleId, code] of checks) {
  test(name, async () => {
    const [result] = await eslint.lintText(code, { filePath });
    assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
    assert.ok(
      result.messages.some((message) => message.ruleId === ruleId),
      `${ruleId} did not report the regression: ${JSON.stringify(result.messages)}`,
    );
  });
}

test("anonymous default exports remain checked", async () => {
  const [result] = await eslint.lintText("export default {};", { filePath: "postcss.config.mjs" });
  assert.ok(result.messages.some((message) => message.ruleId === "import-x/no-anonymous-default-export"));
});

test("all Next.js and official Hooks checks stay enabled", async () => {
  const config = await eslint.calculateConfigForFile(filePath);
  const severity = (value) => (typeof value === "number" ? value : { off: 0, warn: 1, error: 2 }[value]);
  const rules = {
    ...next.configs.recommended.rules,
    ...next.configs["core-web-vitals"].rules,
    ...hooks.configs.flat.recommended.rules,
  };
  for (const [name, setting] of Object.entries(rules)) {
    const minimum = severity(Array.isArray(setting) ? setting[0] : setting);
    assert.ok((config.rules[name]?.[0] ?? 0) >= minimum, `${name} was weakened or removed`);
  }
});

test("a valid typed component passes the complete configuration", async () => {
  const [result] = await eslint.lintText(
    'export default function Page({ label }: { label: string }) { return <button type="button">{label}</button>; }',
    { filePath },
  );
  assert.deepEqual(result.messages, []);
});
