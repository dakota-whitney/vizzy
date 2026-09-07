import { PageNav } from "./page-nav.js";
import { getDBInfo, getDBTable, deleteDBTable } from "../db.js";

// Get data usage information from navigator
// For displaying IDB usage
async function getStorageInfo() {
  const storageInfo = await navigator.storage.estimate();
  return {
    usage: storageInfo.usageDetails.indexedDB || 0,
    quota: storageInfo.quota,
  };
}

// Get references to DOM elements
const template = document.getElementById("table-template");
const storageDisplay = PageNav.navbar.querySelector("#storage a");

// Define TableNav base custom element class
// All sidebar links will be an instance of this element
export class TableNav extends HTMLElement {
  // Define static onLoad method
  // This is called when the app first loads
  static async onLoad() {
    const dbs = await indexedDB.databases();
    const exists = dbs.some(({ name }) => name === "Vizzy");
    const dbInfo = exists
      ? await getDBInfo()
      : {
          version: 0,
          tables: [],
        };
    dbInfo.tables.forEach((tableName) =>
      PageNav.sidebar.append(this.create(tableName)),
    );
    this.renderStorage();
    sessionStorage.setItem("Vizzy", JSON.stringify(dbInfo));
  }

  // Display IDB usage information
  static async renderStorage() {
    let { usage, quota } = await getStorageInfo();

    usage = Math.round(usage / 1024 / 1024);
    usage = usage + "MB";

    quota = Math.round(quota / 1024 / 1024);
    quota = quota + "MB";

    storageDisplay.innerHTML = `<span>${usage} / ${quota}</span>`;
  }

  // Static method for creating TableNav elements
  static create(tableName) {
    const tableNav = document.createElement("table-nav");
    tableNav.dataset.name = tableName;
    return tableNav;
  }

  // Define constructor
  // Ensure instances can access DOM APIs
  constructor() {
    super();
  }

  // Define custom element connected lifecycle method
  // This builds the innerHTML of the link when it is added to the DOM
  connectedCallback() {
    const linkText = document.createElement("p");
    linkText.textContent = this.dataset.name;
    linkText.style.cursor = "pointer";
    linkText.onclick = async () => await this.render(true);

    const a = document.createElement("a");
    a.classList.add("nav-link");

    const icon = document.createElement("i");
    icon.classList.add("nav-icon", "bi", "bi-trash");
    icon.style.cursor = "pointer";

    icon.onmouseenter = () => icon.classList.add("opacity-50");
    icon.onmouseleave = () => icon.classList.remove("opacity-50");
    icon.onclick = async () => await this.delete();

    a.append(icon);
    a.append(linkText);

    const link = document.createElement("li");
    link.classList.add("nav-item");
    link.append(a);

    this.append(link);
  }

  // Define render method called by each instance
  // This builds its HTML and replaces the content area with it
  async render(addHistory = true) {
    PageNav.loading(true);

    const active = PageNav.sidebar.querySelector(".nav-link.active");
    if (active) active.classList.remove("active");
    this.querySelector("a").classList.add("active");

    this.data = await getDBTable(this.dataset.name);
    PageNav.showHeader(this.dataset.name);

    const page = template.content.cloneNode(true);
    PageNav.content.replaceChildren(page);

    const options = this.options;
    this.table = new DataTable("table", options);

    const axisSelects = PageNav.content.querySelectorAll(".axis-select");

    axisSelects.forEach((select) => {
      options.columns
        .map(({ name }) => new Option(name, name))
        .forEach((option) => select.add(option));

      select.addEventListener("change", () => {
        const [axis] = select.id.split("-");
        this.axis[axis] = select.value;
      });
    });

    axisSelects[0].selectedIndex = 0;
    axisSelects[0].selectedIndex = 1;

    this.axis = {
      x: axisSelects[0].value,
      y: axisSelects[1].value,
    };

    const plotSelect = PageNav.content.querySelector("#plot-type");

    plotSelect.addEventListener("change", () => {
      this.plotType = plotSelect.value;
      PageNav.content.querySelector("#y-axis").disabled =
        this.plotType === "pie";
    });

    this.plotType = plotSelect.value;
    this.plotDiv = PageNav.content.querySelector("#plot");

    PageNav.content
      .querySelector(".btn")
      .addEventListener("click", () => this.#renderPlot());

    if (addHistory && this.dataset.name !== history.state?.page) {
      const navURI = encodeURIComponent(this.dataset.name);
      history.pushState({ page: this.dataset.name }, "", `#${navURI}`);
    }

    PageNav.loading(false);
  }

  // Create DataTables options object
  // Use IDB object store for columns and data
  get options() {
    return {
      columns: Object.keys(this.data[0]).map((column) => {
        return {
          data: column,
          title: column,
          name: column,
          defaultContent: "",
        };
      }),
      data: this.data,
      scroller: true,
      scrollY: "50vh",
      ordering: {
        indicators: false,
        handler: false,
      },
      columnControl: ["order", ["search", "searchList"]],
    };
  }

  // Method for deleting an instance's object store and associated link
  // Called when the trash icon is clicked
  async delete() {
    PageNav.loading(true);
    await deleteDBTable(this.dataset.name);
    await TableNav.renderStorage();
    history.back();
    this.remove();
    PageNav.loading(false);
  }

  // Get the DataTable's columns and rows from the axis inputs
  // Render the plot selected by the user
  async #renderPlot() {
    if (this.axis.x === this.axis.y) return this.plotDiv.replaceChildren();
    PageNav.loading(true);
    await new Promise((res) => setTimeout(res, 0));

    try {
      let axisCols = [`${this.axis.x}:name`, `${this.axis.y}:name`];
      axisCols = this.table
        .columns(axisCols, { search: "applied" })
        .data()
        .toArray();

      const axisDf = new dfd.DataFrame({
        [this.axis.x]: axisCols[0],
        [this.axis.y]: axisCols[1],
      });

      const removeBlanks = axisDf[this.axis.x].ne("");
      axisDf.query(removeBlanks, { inplace: true });

      if (this.plotType === "line") this.#renderLine(axisDf);
      else if (this.plotType === "bar") this.#renderBar(axisDf);
      else if (this.plotType === "pie") this.#renderPie(axisDf);
    } catch (error) {
      this.plotDiv.replaceChildren();
      console.error(error);
      PageNav.showAlert(error.message);
    }

    PageNav.loading(false);
  }

  // Render a line plot
  #renderLine(df) {
    const config = { x: this.axis.x, y: this.axis.y };
    const layout = {
      xaxis: { title: this.axis.x },
      yaxis: { title: this.axis.y },
    };
    df.plot(this.plotDiv).line({ config, layout });
  }

  // Render a bar plot
  #renderBar(df) {
    const config = { x: this.axis.x, y: this.axis.y };
    const layout = {
      xaxis: { title: this.axis.x },
      yaxis: { title: this.axis.y },
    };
    df.plot(this.plotDiv).bar({ config, layout });
  }

  // Render a pie plot
  #renderPie(df) {
    const series = df[this.axis.x];
    const [nRow] = series.shape;

    const allUnique = series.nUnique() === nRow;
    if (allUnique) return this.plotDiv.replaceChildren();

    const xCount = df.groupby([this.axis.x]).col([this.axis.x]).count();
    const config = {
      values: `${this.axis.x}_count`,
      labels: this.axis.x,
    };

    xCount.plot(this.plotDiv).pie({ config });
  }
}

// Define TableNav as a custom element
customElements.define("table-nav", TableNav);
