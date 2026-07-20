import { fetchLeaderboard } from '../content.js';
import { localize, countryToFlag } from '../util.js';
import { store } from '../main.js';

import Spinner from '../components/Spinner.js';

export default {
    components: {
        Spinner,
    },
    data: () => ({
        leaderboard: [],
        loading: true,
        selected: 0,
        err: [],
        mobileTab: 'board',
        store,
    }),
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard-container">
            <div class="mobile-tabs" v-if="store.mobile">
                <button :class="{ active: mobileTab === 'board' }" @click="mobileTab = 'board'">Leaderboard</button>
                <button :class="{ active: mobileTab === 'player' }" @click="mobileTab = 'player'">Player</button>
            </div>
            <div class="page-leaderboard">
                <div class="error-container">
                    <p class="error" v-if="err.length > 0">
                        Leaderboard may be incorrect, as the following levels could not be loaded: {{ err.join(', ') }}
                    </p>
                </div>
                <div class="board-container" v-show="!store.mobile || mobileTab === 'board'">
                    <table class="board">
                        <tr v-for="(ientry, i) in leaderboard">
                            <td class="rank">
                                <p class="type-label-lg">#{{ i + 1 }}</p>
                            </td>
                            <td class="total">
                                <p class="type-label-lg">{{ localize(ientry.total) }}</p>
                            </td>
                            <td class="user" :class="{ 'active': selected == i }">
                                <button @click="selected = i">
                                    <span class="type-label-lg">{{ ientry.user }} <template v-if="ientry.flag">({{ countryToFlag(ientry.flag) }})</template></span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="player-container" v-show="!store.mobile || mobileTab === 'player'">
                    <div class="player">
                        <h1>#{{ selected + 1 }} {{ entry.user }} <template v-if="entry.flag">({{ countryToFlag(entry.flag) }})</template></h1>
                        <h3>{{ entry.total }} points</h3>
                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length}})</h2>
                        <table class="table" v-if="entry.verified.length > 0">
                            <tr v-for="score in entry.verified" :class="{ hardest: score.isHardest }">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table" v-if="entry.completed.length > 0">
                            <tr v-for="score in entry.completed" :class="{ hardest: score.isHardest }">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.progressed.length > 0">Progressed ({{entry.progressed.length}})</h2>
                        <table class="table" v-if="entry.progressed.length > 0">
                            <tr v-for="score in entry.progressed">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.percent }}% {{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    `,
    computed: {
        entry() {
            return this.leaderboard[this.selected];
        },
    },
    async mounted() {
        const [leaderboard, err] = await fetchLeaderboard();
        this.leaderboard = leaderboard;
        this.err = err;

        const user = this.$route.query.user;
        if (user) {
            const idx = this.leaderboard.findIndex(
                (e) => e.user.toLowerCase() === user.toLowerCase(),
            );
            if (idx !== -1) this.selected = idx;
        }

        this.loading = false;
    },
    watch: {
        selected() {
            if (store.mobile) {
                this.mobileTab = 'player';
            }
        },
    },
    methods: {
        localize,
        countryToFlag,
    },
};
