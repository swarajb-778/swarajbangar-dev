import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import content from "../src/content.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const html = read("index.html");
const attr = (pattern) => html.match(pattern)?.[1];
const canonical = attr(/<link rel="canonical" href="([^"]+)"/);
const graph = JSON.parse(attr(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/))["@graph"];
const person = graph.find((node) => node["@type"] === "Person");
const socialUrl = (label) => content.socials.find((s) => s.label === label).url;

test("the page title and h1 lead with the owner's name", () => {
  assert.match(attr(/<title>([^<]+)<\/title>/), new RegExp(`^${content.profile.name}`));
  assert.match(html, new RegExp(`<h1 class="md-h1">${content.profile.name}</h1>`));
});

test("canonical, og:url, structured data, robots and sitemap all name the same URL", () => {
  assert.match(canonical, /^https:\/\/.+\/$/);
  assert.equal(attr(/<meta property="og:url" content="([^"]+)"/), canonical);
  assert.equal(person.url, canonical);
  assert.match(read("robots.txt"), new RegExp(`Sitemap: ${canonical}sitemap.xml`));
  assert.match(read("sitemap.xml"), new RegExp(`<loc>${canonical}</loc>`));
});

test("structured data matches content.js and links the LinkedIn and GitHub profiles", () => {
  assert.equal(person.name, content.profile.name);
  assert.equal(person.email, `mailto:${content.profile.email}`);
  assert.equal(person.image, content.profile.avatarUrl);
  for (const label of ["LinkedIn", "GitHub"]) {
    assert.ok(person.sameAs.includes(socialUrl(label)), `${label} missing from sameAs`);
    assert.ok(html.includes(`<a href="${socialUrl(label)}" rel="me">`), `${label} missing from the crawlable profile`);
  }
  assert.ok(person.worksFor.name.startsWith(content.experience.find((e) => !e.end).company.split(" ")[0]));
});

test("the social preview image is served from the site", () => {
  const image = attr(/<meta property="og:image" content="([^"]+)"/);
  assert.ok(image.startsWith(canonical));
  assert.ok(readFileSync(new URL(`../${image.slice(canonical.length)}`, import.meta.url)).length > 10_000);
});
