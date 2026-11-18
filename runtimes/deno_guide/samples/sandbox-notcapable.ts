```ts
try {
  await Deno.readTextFile("/etc/hosts");
} catch (err) {
  if (err instanceof Deno.errors.NotCapable) {
    console.error("Missing read permission, run again with --allow-read");
  }
}
```
