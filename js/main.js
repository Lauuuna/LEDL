import routes from './routes.js';

async function loadConfig() {
    try {
        const res = await fetch('/data/_config.json');
        return await res.json();
    } catch {
        return {};
    }
}

const config = await loadConfig();

// Apply colors from config
if (config.colors) {
    const style = document.createElement('style');
    let css = ':root {\n';
    for (const [key, value] of Object.entries(config.colors.light || {})) {
        css += `  --color-${key}: ${value};\n`;
    }
    css += '}\n';
    if (config.colors.dark) {
        css += 'main.dark, header.dark {\n';
        for (const [key, value] of Object.entries(config.colors.dark)) {
            css += `  --color-${key}: ${value};\n`;
        }
        css += '}\n';
    }
    style.textContent = css;
    document.head.appendChild(style);
}

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    config,
    mobileMenu: false,
    mobile: window.innerWidth <= 768,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
    toggleMobileMenu() {
        this.mobileMenu = !this.mobileMenu;
    },
    closeMobileMenu() {
        this.mobileMenu = false;
    },
});

window.addEventListener('resize', () => {
    store.mobile = window.innerWidth <= 768;
});

const app = Vue.createApp({
    data: () => ({ store }),
});
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);

app.mount('#app');
