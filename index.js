import { html, render } from "lit-html";

function r() {
  render(html`<h1>Hello World</h1>`, document.body);
  window.requestAnimationFrame(r);
}

function init() {
  r();
}

document.addEventListener("DOMContentLoaded", init);
