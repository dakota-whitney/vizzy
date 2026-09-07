import { PageNav } from "../components/page-nav.js";
import { TableNav } from "../components/table-nav.js";
import { insertDBTable } from "../db.js";

// Define UploadPage nav
// This controls what HTML is shown in the content area
export class UploadPage extends PageNav {
  // Define constructor
  // Ensure instances inherit PageNav/DOM APIs
  constructor() {
    super();
  }

  // Get the upload page's html from the defined path and render it
  // Add an upload listener to the upload input
  async render(addHistory = true) {
    this.setActive();
    PageNav.showHeader(this.dataset.name);

    if (!this.template) await this.getTemplate(`${this.id}/${this.id}.html`);
    this.renderTemplate(addHistory);

    const fileInput = PageNav.content.querySelector("input");
    fileInput.addEventListener("change", (event) => this.uploadFile(event));
  }

  // Read an uploaded .csv or .xlsx and insert it into the Vizzy IDB
  // Create a new tableNav and append it to the sidebar
  async uploadFile(event) {
    PageNav.loading(true);

    const [file] = event.target.files;
    let fileName = file.name.split(".");
    const extension = fileName[fileName.length - 1];

    try {
      const fileDf =
        extension === "csv"
          ? await dfd.readCSV(file)
          : await dfd.readExcel(file);
      const fileData = dfd.toJSON(fileDf);
      fileName = fileName[0];

      await insertDBTable(fileName, fileData);

      const existingNav = PageNav.sidebar.querySelector(
        `[data-name="${fileName}"]`,
      );
      if (existingNav) existingNav.remove();

      const tableNav = TableNav.create(fileName);

      PageNav.sidebar.append(tableNav);
      await tableNav.render(true);
      await TableNav.renderStorage();
    } catch (error) {
      console.error(error);
      PageNav.showAlert(error.message);
    }

    PageNav.loading(false);
  }
}

// Define the Upload page as a custom element
customElements.define("upload-page", UploadPage);
