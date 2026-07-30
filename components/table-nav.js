class TableNav extends PageNav {
    static getDBInfo = () => new Promise((res, rej) => {
        const dbRequest = indexedDB.open('Vizzy');
        dbRequest.onerror = e => rej(e);
        dbRequest.onsuccess = async () => {
            const db = dbRequest.result;
            res({version: db.version, tables: [...db.objectStoreNames]});
        };
    });
    static renderStorage(usage, quota){
        const storage = PageNav.navbar.querySelector('#storage a');
        usage = Math.round(usage / 1024 / 1024);
        usage = usage + 'MB';
        quota = Math.round(quota / 1024 / 1024);
        quota = quota + 'MB';
        storage.innerHTML = `<span>${usage} / ${quota}</span>`;
    };
    static async onLoad(){
        const storageInfo = await navigator.storage.estimate();
        let dbInfo = {
            usage: storageInfo.usageDetails.indexedDB || 0,
            quota: storageInfo.quota
        };
        this.renderStorage(dbInfo.usage, dbInfo.quota);
        const dbs = await indexedDB.databases();
        const dbExists = dbs.some(db => db.name === 'Vizzy');
        if(!dbExists) dbInfo = {...dbInfo, version: 1, tables: []};
        else dbInfo = {...dbInfo, ...await this.getDBInfo()}
        sessionStorage.setItem('Vizzy', JSON.stringify(dbInfo));
        if(!dbExists) return;
        dbInfo.tables.forEach(tableName => PageNav.navs = this.create(tableName));
    };
    static create(tableName){
        const tableNav = document.createElement('table-nav');
        tableNav.id = tableName;
        tableNav.dataset.icon = 'trash';
        tableNav.dataset.header = tableName;
        tableNav.dataset.name = tableName;
        return tableNav;
    };
    static onUpload(event){
        const { name: tableName, replace } = event.detail;
        let tableNav = this.create(tableName);
        const selector = `table-nav[data-name='${tableName}']`;
        if(replace) PageNav.sidebar.querySelector(selector).replaceWith(tableNav);
        else PageNav.sidebar.append(tableNav);
        tableNav = PageNav.sidebar.querySelector(selector);
        PageNav.navs[tableNav.slugify()] = tableNav;
        tableNav.render();
        const dbInfo = JSON.parse(sessionStorage.getItem('Vizzy'));
        this.renderStorage(dbInfo.usage, dbInfo.quota);
        PageNav.loading(false);
    };
    constructor() {
        super();
    };
    connectedCallback(){
        super.connectedCallback();
        const icon = this.querySelector('i');
        icon.onmouseenter = () => icon.style.opacity = '50%';
        icon.onmouseleave = () => icon.style.opacity = 'initial';
        icon.onclick = () => this.removeTable().then(() => this.remove());
    };
    async render() {
        PageNav.loading(true);
        await super.render('table-template');
        const options = await this.getOptions();
        new DataTable('table', options);
        PageNav.loading(false);
    };
    async getOptions(){
        const data = await this.getData();
        const columns = Object.keys(data[0]).map(column => {
            return {
                data: column, 
                title: column, 
                defaultContent: 'N/A'
            };
        });

        const columnControl = {
            target: 0,
            content: ['order', ['orderAsc', 'orderDesc', 'search']]
        };

        return { columns, data, columnControl };
    };
    getData = () => new Promise((res, rej) => {
        const tableName = this.dataset.name;
        console.log('Requesting database');
        const dbRequest = indexedDB.open('Vizzy');
        dbRequest.onerror = error => {
            console.error(error);
            rej(error);
        };
        dbRequest.onsuccess = () => {
            const db = dbRequest.result;
            const transaction = db.transaction(tableName);
            const table = transaction.objectStore(tableName);
            console.log(`Retrieving data for ${tableName}`);
            const dataRequest = table.getAll();
            dataRequest.onerror = error => {
                console.error(error);
                rej(error);
            };
            dataRequest.onsuccess = () => res(dataRequest.result);
        };
    });
    removeTable = () => new Promise((res, rej) => {
        PageNav.loading(true);
        const tableName = this.dataset.name;
        const dbInfo = JSON.parse(sessionStorage.getItem('Vizzy'));
        console.log('Requesting database');
        const dbRequest = indexedDB.open('Vizzy', ++dbInfo.version);
        dbRequest.onerror = error => {
            console.error(error);
            rej(error);
        };
        dbRequest.onupgradeneeded = async () => {
            const db = dbRequest.result;
            console.log(`Deleting table ${tableName}`);
            db.deleteObjectStore(tableName);
            dbInfo.tables = dbInfo.tables.filter(table => table === tableName);
            const storageInfo = await navigator.storage.estimate();
            dbInfo.usage = storageInfo.usageDetails.indexedDB || 0;
            dbInfo.quota = storageInfo.quota;
            sessionStorage.setItem('Vizzy', JSON.stringify(dbInfo));
            PageNav.default.render();
            PageNav.loading(false);
            res(dbInfo);
        };
    });
};

customElements.define('table-nav', TableNav);
TableNav.onLoad();
PageNav.wrapper.addEventListener('upload', event => TableNav.onUpload(event));