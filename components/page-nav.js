// Define the base PageNav custom element class
// Each top nav bar link will inherit from this class
export class PageNav extends HTMLElement {
  // Get static references to DOM elements
  static {
    this.spinner = document.querySelector(".spinner-border");
    this.wrapper = document.querySelector(".app-wrapper");
    this.navbar = document.querySelector(".topnav-menu");
    this.sidebar = document.querySelector(".sidebar-menu");
    this.header = document.querySelector(".app-content-header");
    this.alert = document.getElementById("alert-template");
    this.content = document.getElementById("page-content");
  }

  // Define static onLoad method
  // This is called when the app first loads
  static async onLoad() {
    this.default = this.navbar.querySelector("[data-name]:last-child");
    let initialPage = decodeURIComponent(location.hash.substring(1));
    initialPage =
      this.wrapper.querySelector(`[data-name="${initialPage}"]`) ||
      this.default;
    console.log(initialPage);
    await initialPage.render(false);
    const initialURI = encodeURIComponent(initialPage.dataset.name);
    history.replaceState(
      { page: initialPage.dataset.name },
      "",
      `#${initialURI}`,
    );
  }

  // Define static onNavigate method that responds to the popstate history event
  // This runs whenever the user clicks a navbar link
  static async onNavigate(event) {
    if (!event.state) return;
    console.log(event.state);
    const nav = this.wrapper.querySelector(`[data-name="${event.state.page}"]`);
    if (nav) await nav.render(false);
  }

  // Show or hide a page spinner for various operations
  static loading(show = true) {
    if (show) {
      this.spinner.classList.remove("d-none");
      this.wrapper.classList.add("opacity-50");
    } else {
      this.spinner.classList.add("d-none");
      this.wrapper.classList.remove("opacity-50");
    }
  }

  // Show an alert when there is an application error
  static showAlert(alertText) {
    const alert = this.alert.content.cloneNode(true);
    alert.querySelector(".alert").prepend(alertText);
    this.header.querySelector(".container-fluid").prepend(alert);
  }

  // Define a static method that will show a page header in the content area, if desired
  static showHeader(header) {
    this.header.classList.remove("d-none");
    this.header.querySelector("#page-header").textContent = header;
  }

  // Define constructor
  // Ensure instances can access DOM APIs
  constructor() {
    super();
  }

  // Define custom element connected lifecycle method
  // This builds the innerHTML of the link when it is added to the DOM
  connectedCallback() {
    const linkText = document.createElement("span");
    linkText.textContent = this.dataset.name;

    const a = document.createElement("a");
    a.classList.add("nav-link");

    const icon = document.createElement("i");
    icon.classList.add("nav-icon", "bi", `bi-${this.dataset.icon}`, "me-1");
    delete this.dataset.icon;

    a.append(icon);
    a.append(linkText);

    const link = document.createElement("li");
    link.classList.add("nav-item");
    link.style.cursor = "pointer";

    link.append(a);
    link.onclick = async () => await this.render(true);

    this.append(link);
  }

  // Set current nav link to active when clicked
  setActive() {
    const active = PageNav.navbar.querySelector(".nav-link.active");
    if (active) active.classList.remove("active");
    this.querySelector("a").classList.add("active");
  }

  // Fetch page HTML from path parameter and insert it into a new template element
  // This will cache the HTML to prevent multiple requests on re-renders
  async getTemplate(htmlPath) {
    this.template = document.createElement("template");
    const html = await fetch(htmlPath, { mode: "same-origin" });
    this.template.innerHTML = await html.text();
  }

  // Replace the content area with the page's HTML
  // Conditionally add history state unless the same page was clicked
  renderTemplate(addHistory = true) {
    const page = this.template.content.cloneNode(true);
    PageNav.content.replaceChildren(page);
    if (addHistory && this.dataset.name !== history.state?.page) {
      const navURI = encodeURIComponent(this.dataset.name);
      history.pushState({ page: this.dataset.name }, "", `#${navURI}`);
    }
  }
}

// Add the onNavigate method to the popstate event
window.addEventListener("popstate", (e) => PageNav.onNavigate(e));
