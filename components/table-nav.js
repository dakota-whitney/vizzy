class TableNav extends PageNav {
    static getDBInfo = () => new Promise((res, rej) => {
        const dbRequest = indexedDB.open('Vizzy');
        dbRequest.onerror = e => rej(e);

        dbRequest.onsuccess = async () => {
            const db = dbRequest.result;
            res({version: db.version, tables: [...db.objectStoreNames]});
        };
    });
    static #renderStorage(usage, quota){
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

        this.#renderStorage(dbInfo.usage, dbInfo.quota);

        const dbs = await indexedDB.databases();
        const dbExists = dbs.some(db => db.name === 'Vizzy');

        if(!dbExists) dbInfo = {...dbInfo, version: 1, tables: []};
        else dbInfo = {...dbInfo, ...await this.getDBInfo()};

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
        const existingNav = PageNav.sidebar.querySelector(`#${tableName}`);
        
        if(existingNav) existingNav.remove();
        const tableNav = this.create(tableName);

        PageNav.navs = tableNav;
        tableNav.render();

        const dbInfo = JSON.parse(sessionStorage.getItem('Vizzy'));
        this.#renderStorage(dbInfo.usage, dbInfo.quota);

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

        icon.onclick = () => this.#removeDBTable().then(() => this.remove());
    };
    async render() {
        PageNav.loading(true);
        this.data = await this.#getDBTable();
        await super.render('table-template');

        const options = this.options;
        this.table = new DataTable('table', options);

        const axisSelects = this.page.querySelectorAll('.axis-select');
        axisSelects.forEach(select => {
            options.columns
                .map(({name}) => new Option(name, name))
                .forEach(option => select.add(option))

            select.addEventListener('change', () => {
                const [ axis ] = select.id.split('-')
                this.axis[axis] = select.value;
            });
        });

        axisSelects[0].selectedIndex = 0;
        axisSelects[0].selectedIndex = 1;

        this.axis = {
            x: axisSelects[0].value,
            y: axisSelects[1].value
        };

        const plotSelect = this.page.querySelector('#plot-type');
        plotSelect.addEventListener('change', () => {
            this.plotType = plotSelect.value;
            this.page.querySelector('#y-axis').disabled = this.plotType === 'pie';
        });

        this.plotType = plotSelect.value;
        this.plotDiv = this.page.querySelector('#plot');

        this.page.querySelector('.btn').addEventListener('click', () => this.#renderPlot())
        PageNav.loading(false);
    };
    get options(){
        return {
            columns: Object.keys(this.data[0]).map(column => {
                return {
                    data: column, 
                    title: column, 
                    name: column,
                    defaultContent: ''
                };
            }),
            data: this.data,
            scroller: true,
            scrollY: '50vh', 
            ordering: {
                indicators: false,
                handler: false
            },
            columnControl: [
                'order',
                ['search', 'searchList']
            ]
        };
    };
    #getDBTable = () => new Promise((res, rej) => {
        const tableName = this.dataset.name;

        console.log('Requesting database');
        const dbRequest = indexedDB.open('Vizzy');

        dbRequest.onerror = error => {
            console.error(error);
            PageNav.showAlert(error.message);
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
                PageNav.showAlert(error.message);
                rej(error);
            };

            dataRequest.onsuccess = () => res(dataRequest.result);
        };
    });
    #removeDBTable = () => new Promise((res, rej) => {
        PageNav.loading(true);

        const tableName = this.dataset.name;
        const dbInfo = JSON.parse(sessionStorage.getItem('Vizzy'));

        console.log('Requesting database');
        const dbRequest = indexedDB.open('Vizzy', ++dbInfo.version);

        dbRequest.onerror = error => {
            console.error(error);
            PageNav.showAlert(error.message);
            rej(error);
        };

        dbRequest.onupgradeneeded = async () => {
            const db = dbRequest.result;
            console.log(`Deleting table ${tableName}`);
            db.deleteObjectStore(tableName);

            dbInfo.tables = dbInfo.tables.filter(table => table !== tableName);

            const storageInfo = await navigator.storage.estimate();
            dbInfo.usage = storageInfo.usageDetails.indexedDB || 0;
            dbInfo.quota = storageInfo.quota;

            sessionStorage.setItem('Vizzy', JSON.stringify(dbInfo));
            PageNav.default.render();

            PageNav.loading(false);
            res(dbInfo);
        };
    });
    async #renderPlot(){
        if(this.axis.x === this.axis.y) return this.plotDiv.replaceChildren();
        PageNav.loading(true);
        await new Promise(res => setTimeout(res, 0));

        try {
            let axisCols = [`${this.axis.x}:name`, `${this.axis.y}:name`];
            axisCols = this.table.columns(axisCols, {search: 'applied'}).data().toArray();

            const axisDf = new dfd.DataFrame({
                [this.axis.x]: axisCols[0],
                [this.axis.y]: axisCols[1]
            });


            const removeBlanks = axisDf[this.axis.x].ne('')
            axisDf.query(removeBlanks, {inplace: true});

            if(this.plotType === 'line') this.#renderLine(axisDf);
            else if(this.plotType === 'bar') this.#renderBar(axisDf);
            else if(this.plotType === 'pie') this.#renderPie(axisDf);
        } catch(error) {
            this.plotDiv.replaceChildren();
            console.error(error);
            PageNav.showAlert(error.message);
        };

        PageNav.loading(false);
    };
    #renderLine(df){
        const config = {x: this.axis.x, y: this.axis.y};
        const layout = {xaxis: {title: this.axis.x}, yaxis: {title: this.axis.y}};
        df.plot(this.plotDiv).line({ config, layout });
    };
    #renderBar(df){
        const config = {x: this.axis.x, y: this.axis.y};
        const layout = {xaxis: {title: this.axis.x}, yaxis: {title: this.axis.y}};
        df.plot(this.plotDiv).bar({ config, layout });
    };
    #renderPie(df){
        const series = df[this.axis.x];
        const [ nRow ] = series.shape;

        const allUnique = series.nUnique() === nRow;
        if(allUnique) return this.plotDiv.replaceChildren();

        const xCount = df.groupby([this.axis.x]).col([this.axis.x]).count();
        const config = {
            values: `${this.axis.x}_count`,
            labels: this.axis.x
        };

        xCount.plot(this.plotDiv).pie({ config });
    };
};

customElements.define('table-nav', TableNav);
TableNav.onLoad();
PageNav.wrapper.addEventListener('upload', event => TableNav.onUpload(event));