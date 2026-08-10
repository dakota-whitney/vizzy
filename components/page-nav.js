class PageNav extends HTMLElement {
    static {
        this.spinner = document.querySelector('.spinner-border');
        this.wrapper = document.querySelector('.app-wrapper');
        this.navbar = document.querySelector('.topnav-menu');
        this.sidebar = document.querySelector('.sidebar-menu');
        this.header = document.querySelector('.app-content-header');
        this.alert = document.getElementById('alert-template');
        this.content = document.getElementById('page-content');
    };
    static #navs = {};
    static get navs(){
        return this.#navs;
    };
    static set navs(pageNav){
        this.#navs[pageNav.slugify()] = this.sidebar.appendChild(pageNav);
    };
    static async onLoad(){
        const topNavs = [...this.navbar.querySelectorAll('*')];
        const sideNavs = [...this.sidebar.querySelectorAll('*')];
        const navs = [...topNavs, ...sideNavs].filter(nav => nav.localName.includes('page'));

        for await (const { id } of navs){
            try { await import(`../pages/${id}/${id}.js`) } 
            catch(e) { console.warn(`No custom element for ${id}`) };
        };

        this.default = navs[navs.length - 1];
        this.#navs = Object.fromEntries(navs.map(nav => [nav.slugify(), nav]));

        const slug = location.hash.split('/').pop();
        this.#navs[slug]?.render() || this.default.render();
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
    static showAlert(alertText){
        const alert = this.alert.content.cloneNode(true);
        alert.querySelector('.alert').prepend(alertText);
        this.header.querySelector('.container-fluid').prepend(alert);
    };
    constructor() {
        super();
        this.template = null;
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
    async #getTemplate(templateId){
        const template = document.getElementById(templateId);
        if(template) return this.template = template;
        this.template = document.createElement('template');
        const page = await fetch(templateId || `pages/${this.id}/${this.id}.html`);
        this.template.innerHTML = await page.text();
        return this.template;
    };
    async render(templateId = ''){
        const active = document.querySelector('.nav-link.active');
        if(active) active.classList.remove('active');
        this.querySelector('a').classList.add('active');
        if(!this.template) await this.#getTemplate(templateId)
        if(this.dataset.header) this.#showHeader();
        else PageNav.header.classList.add('d-none');
        const page = this.template.content.cloneNode(true);
        PageNav.content.replaceChildren(page);
        const slug = this.slugify();
        history.pushState({page: slug}, "");
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
PageNav.onLoad().then(() => window.addEventListener('popstate', e => PageNav.onNavigate(e)));