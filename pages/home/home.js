export class HomePage extends PageNav {
  constructor() {
    super();
    this.links = [
      "https://adminlte.io/themes/v4/docs/introduction.html",
      "https://developer.mozilla.org/en-US/docs/Web/API/Web_components",
      "https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API",
      "https://datatables.net/",
      "https://danfo.jsdata.org/",
    ];
  }
  async render({ addHistory = true }) {
    await super.render({ addHistory: addHistory });
    this.page.querySelectorAll("a").forEach((a, i) => (a.href = this.links[i]));
  }
}

customElements.define("home-page", HomePage);
