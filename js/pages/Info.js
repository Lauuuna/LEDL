import { store } from "../main.js";
import { fetchEditors } from "../content.js";

import Spinner from "../components/Spinner.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { Spinner },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-info">
            <div class="meta">
                <div class="og">
                    <p class="type-label-md">Website layout made by <a href="https://tsl.pages.dev/" target="_blank">TheShittyList</a></p>
                </div>
                <template v-if="editors">
                    <h3>List Editors</h3>
                    <ol class="editors">
                        <li v-for="editor in editors">
                            <img :src="\`assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                            <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                            <p v-else>{{ editor.name }}</p>
                        </li>
                    </ol>
                </template>
                <h3>Submission Requirements</h3>
                <p>
                    Using modifications that make levels easier is prohibited. This includes Noclip, Speed Hack, and similar cheats.
                </p>
                <p>
                    Using nerfed versions of a level is prohibited.
                </p>
                <p>
                    Using secret routes or bug routes is prohibited.
                </p>
                <p>
                    To submit a record, you must provide a completion video featuring a cheat indicator, audible clicks, and the end screen.
                </p>
                <p>
                    Your completion video must be either publicly available or accessible via a link.
                </p>
            </div>
        </main>
    `,
    data: () => ({
        editors: [],
        loading: true,
        roleIconMap,
        store,
    }),
    async mounted() {
        this.editors = await fetchEditors();
        this.loading = false;
    },
};
