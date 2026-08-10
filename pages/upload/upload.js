export class UploadPage extends PageNav {
    constructor() {
        super();
    };
    async render() {
        await super.render();
        const fileInput = this.page.querySelector('input');
        fileInput.addEventListener('change', event => this.uploadFile(event));
    };
    async uploadFile(event){
        PageNav.loading(true);
        const [ file ] = event.target.files;
        let fileName = file.name.split('.');
        const ext = fileName[fileName.length - 1];
        const fileDf = ext === 'csv' ? await dfd.readCSV(file) : await dfd.readExcel(file);
        const fileData = dfd.toJSON(fileDf);
        let dbInfo = JSON.parse(sessionStorage.getItem('Vizzy'));
        fileName = fileName[0];
        const exists = dbInfo.tables.includes(fileName);
        if(exists) await this.replaceTable(fileName, fileData);
        else dbInfo = await this.createTable(fileName, fileData, dbInfo);
        const storageInfo = await navigator.storage.estimate();
        dbInfo.usage = storageInfo.usageDetails.indexedDB || 0;
        dbInfo.quota = storageInfo.quota;
        sessionStorage.setItem('Vizzy', JSON.stringify(dbInfo));
        const uploadEvent = new CustomEvent('upload', {
            bubbles: true,
            detail: {name: fileName, replace: exists}
        });
        this.dispatchEvent(uploadEvent);
    };
    replaceTable = (fileName, fileData) => new Promise((res, rej) => {
        console.log('Requesting database');
        const dbRequest = indexedDB.open('Vizzy');
        dbRequest.onerror = error => {
            console.error(error);
            PageNav.showAlert(error.message);
            rej(error);
        };
        dbRequest.onsuccess = () => {
            const db = dbRequest.result;
            const transaction = db.transaction(fileName, 'readwrite');
            const table = transaction.objectStore(fileName);
            console.log(`Replacing table ${fileName}`);
            const clearRequest = table.clear();
            clearRequest.onerror = error => {
                console.error(error);
                PageNav.showAlert(error.message);
                rej(error);
            };
            clearRequest.onsuccess = () => {
                fileData.forEach(row => table.add(row));
                res();
            };
        };
    });
    createTable = (fileName, fileData, dbInfo) => new Promise((res, rej) => {
        console.log('Requesting database');
        const dbRequest = indexedDB.open('Vizzy', ++dbInfo.version);
        dbRequest.onerror = error => {
            console.error(error);
            PageNav.showAlert(error.message);
            rej(error);
        };
        dbRequest.onupgradeneeded = () => {
            const db = dbRequest.result;
            const table = db.createObjectStore(fileName, {autoIncrement: true});
            console.log(`Inserting table ${fileName}`);
            fileData.forEach(row => table.add(row));
            dbInfo.tables = [...dbInfo.tables, fileName];
            res(dbInfo);
        };
    });
};

customElements.define('upload-page', UploadPage);