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
                            <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                            <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                            <p v-else>{{ editor.name }}</p>
                        </li>
                    </ol>
                </template>
                <h3>Submission Requirements</h3>
                <p>
                    Achieved the record without using hacks (however, FPS bypass is allowed, up to 360fps)
                </p>
                <p>
                    Achieved the record on the level that is listed on the site - please check the level ID before you submit a record
                </p>
                <p>
                    Have either source audio or clicks/taps in the video. Edited audio only does not count
                </p>
                <p>
                    The recording must have a previous attempt and entire death animation shown before the completion, unless the completion is on the first attempt. Everyplay records are exempt from this
                </p>
                <p>
                    The recording must also show the player hit the endwall, or the completion will be invalidated.
                </p>
                <p>
                    Do not use secret routes or bug routes
                </p>
                <p>
                    Do not use easy modes, only a record of the unmodified level qualifies
                </p>
                <p>
                    Once a level falls onto the Legacy List, we accept records for it for 24 hours after it falls off, then afterwards we never accept records for said level
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
