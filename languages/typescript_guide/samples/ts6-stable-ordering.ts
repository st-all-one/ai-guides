// Input: some-file.ts
export function foo(condition: boolean) {
return condition ? 100 : 500;
}
// Output: some-file.d.ts
export declare function foo(condition: boolean): 100 | 500;
// ^^^^^^^^^
// Note the order of this union: 100, then 500.
