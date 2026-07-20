import { store } from "../main.js";
import { embed, countryToFlag } from "../util.js";
import { fetchList, fetchFlags, fetchEditors } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="mobile-tabs" v-if="store.mobile">
                <button :class="{ active: mobileTab === 'list' }" @click="mobileTab = 'list'">List</button>
                <button :class="{ active: mobileTab === 'level' }" @click="mobileTab = 'level'">Level</button>
            </div>
            <div class="list-container" v-show="!store.mobile || mobileTab === 'list'">
                <div class="errors" v-show="errors.length > 0">
                    <p class="error" v-for="error of errors">{{ error }}</p>
                </div>
                <input class="search" type="text" v-model="search" placeholder="Search levels..." />
                <table class="list" v-if="list">
                    <tr v-for="([level, err], i) in list" v-show="!search || (level && level.name.toLowerCase().includes(search.toLowerCase()))">
                        <td class="rank">
                            <p class="type-label-lg">#{{ i + 1 }}</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == i, 'error': !level }">
                            <button @click="selected = i">
                                <span class="type-label-lg">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="level-container" v-show="!store.mobile || mobileTab === 'level'">
                <div class="level" v-if="level">
                    <h1>{{ level.name }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier" :verifierFlag="flags[level.verifier] ? countryToFlag(flags[level.verifier]) : null"></LevelAuthors>
                    <div v-if="level.tags && level.tags.length" class="tags">
                        <span v-for="tag in level.tags" class="tag">{{ tag }}</span>
                    </div>
                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points</div>
                            <p>{{ level.points }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Verified</div>
                            <p>{{ level.verifiedDate }}</p>
                        </li>
                    </ul>
                    <h2>Records</h2>
                    <p><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <table class="records">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent">
                                <p>{{ record.percent }}%</p>
                            </td>
                            <td class="user">
                                <span class="type-label-lg username" @click="goToPlayer(record.user)">{{ record.user }} <template v-if="flags[record.user]">({{ countryToFlag(flags[record.user]) }})</template></span>
                            </td>
                            <td class="mobile">
                                <img v-if="record.mobile" :src="\`assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                            </td>
                            <td class="date">
                                <p>{{ record.date }}</p>
                            </td>
                            <td class="video-link">
                                <a :href="record.link" target="_blank">
                                    <img :src="\`assets/youtube\${store.dark ? '-dark' : ''}.svg\`" alt="Video">
                                </a>
                            </td>
                        </tr>
                    </table>
                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>
            <div class="meta-container" v-show="!store.mobile">
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
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        flags: {},
        loading: true,
        selected: 0,
        errors: [],
        search: '',
        mobileTab: 'list',
        roleIconMap,
        store
    }),
    watch: {
        selected() {
            if (store.mobile) {
                this.mobileTab = 'level';
            }
        },
    },
    computed: {
        level() {
            return this.list[this.selected][0];
        },
        video() {
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }

            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification
            );
        },
    },
    async mounted() {
        this.list = await fetchList();
        this.editors = await fetchEditors();
        this.flags = await fetchFlags();

        if (!this.list) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => {
                        return `Failed to load level. (${err}.json)`;
                    })
            );
            if (!this.editors) {
                this.errors.push("Failed to load list editors.");
            }
        }

        this.loading = false;
    },
    methods: {
        embed,
        countryToFlag,
        goToPlayer(user) {
            this.$router.push({ path: '/leaderboard', query: { user } });
        },
    },
};
