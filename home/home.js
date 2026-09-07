import { PageNav } from "../components/page-nav.js";

// Initialize home page links to insert into the about content
const links = [
  "https://adminlte.io/themes/v4/docs/introduction.html",
  "https://developer.mozilla.org/en-US/docs/Web/API/Web_components",
  "https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API",
  "https://datatables.net/",
  "https://danfo.jsdata.org/",
];

// Define HomePage nav
// This controls what HTML is shown in the content area
export class HomePage extends PageNav {
  // Define constructor
  // Ensure instances inherit PageNav/DOM APIs
  constructor() {
    super();
  }

  // Get the upload page's html from the defined path and render it
  // Add the links to the about content
  async render(addHistory = true) {
    this.setActive();
    PageNav.showHeader(this.dataset.name);

    await this.getTemplate(`${this.id}/${this.id}.html`);
    this.renderTemplate(addHistory);

    PageNav.content
      .querySelectorAll("a")
      .forEach((a, i) => (a.href = links[i]));
  }
}

// Define the Upload page as a custom element
customElements.define("home-page", HomePage);
