class PageNav extends HTMLElement {
    static {
        this.spinner = document.querySelector('.spinner-border');
        this.wrapper = document.querySelector('.app-wrapper');
        this.navbar = document.querySelector('.topnav-menu');
        this.sidebar = document.querySelector('.sidebar-menu');
        this.header = document.querySelector('.app-content-header');
        this.content = document.getElementById('page-content');
        this._navs = {};
    };
    static get navs(){
        return this._navs;
    };
    static set navs(pageNav){
        this._navs[pageNav.slugify()] = this.sidebar.appendChild(pageNav);
    };
    static async defineAll(){
        const topNavs = [...this.navbar.querySelectorAll('*')];
        const sideNavs = [...this.sidebar.querySelectorAll('*')];
        const navs = [...topNavs, ...sideNavs].filter(nav => nav.localName.includes('page'));

        for await (const { id } of navs){
            try { await import(`../pages/${id}/${id}.js`) } 
            catch(e) { console.warn(`No custom element for ${id}`) };
        };

        this.default = navs[navs.length - 1];
        this._navs = Object.fromEntries(navs.map(nav => [nav.slugify(), nav]));

        const slug = location.hash.split('/').pop();
        this._navs[slug]?.render() || this.default.render();
    };
    static onNavigate(event){
        if(event.state) this.navs[event.state.page]?.render();
    };
    static loading(show = true){
        if(show) {
            this.spinner.classList.remove('d-none');
            this.wrapper.style.opacity = '50%';
        } else {
            this.spinner.classList.add('d-none');
            this.wrapper.style.opacity = 'initial';
        };
    };
    constructor() {
        super();
        this.page = PageNav.content;
    };
    connectedCallback(){
        const topNav = this.parentElement.classList.contains('topnav-menu');

        const link = document.createElement(topNav ? 'span' : 'p');
        link.textContent = this.dataset.name || this.id;
        if(topNav) link.style.marginRight = '5px';
        link.onclick = () => this.render();

        const a = document.createElement('a');
        a.classList.add('nav-link');
        a.style.cursor = 'pointer';
        a.href = '#/' + this.slugify();
        a.append(link);

        if(this.dataset.icon) a.insertAdjacentHTML(
            topNav ? 'beforeend' : 'afterbegin',
            `<i class='nav-icon bi bi-${this.dataset.icon}'></i>`
        );
        delete this.dataset.icon;

        const li = document.createElement('li');
        li.classList.add('nav-item');

        li.append(a);
        this.append(li);
    };
    async getTemplate(){
        this.template = document.createElement('template');
        const page = await fetch(`pages/${this.id}/${this.id}.html`);
        this.template.innerHTML = await page.text();
        return this.template;
    };
    async render(templateId = ''){

        const active = document.querySelector('.nav-link.active');
        if(active) active.classList.remove('active');
        this.querySelector('a').classList.add('active');

        if(!this.template) this.template = templateId ? 
            document.getElementById(templateId) : 
            await this.getTemplate();
        
        if(this.dataset.header) this.#showHeader();
        else PageNav.header.classList.add('d-none');

        const page = this.template.content.cloneNode(true);
        PageNav.content.replaceChildren(page);

        const slug = this.slugify();
        history.pushState({page: slug}, "", `#/${slug}`);
    };
    #showHeader(){
        PageNav.header.classList.remove('d-none');
        PageNav.header.querySelector('#page-header').textContent = this.dataset.header;
    };
    slugify(){
        const slug = this.dataset.name.toLowerCase();
        return slug.replaceAll(/\s+/g, '-');
    };
};

customElements.define('page-nav', PageNav);
PageNav.defineAll().then(() => window.addEventListener('popstate', e => PageNav.onNavigate(e)));