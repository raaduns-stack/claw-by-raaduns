import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const scriptStart = html.indexOf("<script>") + "<script>".length;
const scriptEnd = html.lastIndexOf("</script>");
const script = html.slice(scriptStart, scriptEnd);

test("UI script remains syntactically valid", () => {
  assert.ok(script.length > 0);
  assert.doesNotThrow(() => new Function(script));
});

test("business context selector is populated and synchronized", () => {
  assert.match(script, /const options=xs\.map\(b=>/);
  assert.match(script, /businessContext.*innerHTML=options/);
  assert.match(script, /businessContext.*value=id/);
});

test("tender source required-field contract is preserved", () => {
  assert.ok(html.includes("<label class=req>Platform username</label>"));
  assert.ok(html.includes("<label class=req>Platform password</label>"));
  assert.match(html, /id="newSourceId"[^>]*required/);
  assert.match(html, /id="newSourceName"[^>]*required/);
  assert.match(html, /id="newSourceUrl"[^>]*required/);
  assert.match(html, /id="newAdapterType"[^>]*required/);
});

test("platform controls target the visible page instance", () => {
  assert.match(script, /data-platform-user/);
  assert.match(script, /data-platform-pass/);
  assert.match(script, /data-platform-status/);
  assert.match(script, /main>section:not\(\.hidden\)/);
  assert.doesNotMatch(script, /\$\("user-"\+id\)\.value/);
  assert.doesNotMatch(script, /\$\("pass-"\+id\)\.value/);
  assert.doesNotMatch(script, /\$\("status-"\+id\)\.textContent/);
});
