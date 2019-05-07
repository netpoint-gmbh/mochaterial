import { MDCSwitch } from '@material/switch/index';
import { MDCTopAppBar } from "@material/top-app-bar/index";
import { MDCDrawer } from "@material/drawer/index";
import 'https://unpkg.com/stacktrace-js@2.0.0/dist/stacktrace.min.js';
Mocha.prototype.reporterOptions = function (reporterOptions) {
    this.options.reporterOptions = reporterOptions;
};
const DefaultOptions = {
    title: "document.title",
    titlePath: "window.location",
    showHooksDefault: true,
    rootSuiteTitle: "Isolated Tests",
    indentSuites: "tablet-up",
    codeBackground: "surface",
    codeDefaultText: "on-surface",
    diffFormat: "side-by-side",
    hljsStylesUrl: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/googlecode.min.css"
};
export class Mochaterial extends Mocha.reporters.Base {
    constructor(runner, options) {
        super(runner, options);
        this.highlighter = new Worker('./workers/worker.hljs.js');
        this.comparer = new Worker('./workers/worker.diff2Html.js');
        this.stats = this.stats;
        this.suiteCount = 0;
        this.currentFilter = "passed";
        this.setOverflowItemsThrottled = this.throttle(this.setOverflowItems, 200);
        this.cycleThrottled = this.throttle(this.cycle, 500);
        this.closeDialListener = (e) => this.closeDial(e);
        this.overflowListener = (e) => this.toggleOverflow(e);
        this.expandableListener = (e) => this.toggleExpandable(e);
        this.resizeListener = () => this.setOverflowItemsThrottled();
        this.cycleListener = () => this.cycleThrottled();
        this.cycleTypeListener = (e) => this.toggleSpeedDial(e);
        this.cycleFailedListener = () => this.setCycleType("failed");
        this.cyclePendingListener = () => this.setCycleType("pending");
        this.cycleBlockedListener = () => this.setCycleType("blocked");
        this.cyclePassedListener = () => this.setCycleType("passed");
        this.togglePassedListener = () => this.toggleBody("hide-passed");
        this.toggleFailedListener = () => this.toggleBody("hide-failed");
        this.togglePendingListener = () => this.toggleBody("hide-pending");
        this.toggleBlockedListener = () => this.toggleBody("hide-blocked");
        this.toggleDurationListener = () => this.toggleBody("hide-duration");
        this.toggleHooksListener = () => this.toggleBody("hide-hooks");
        this.toggleSuitesListener = () => this.toggleBody("hide-suites");
        this.toggleTestsListener = () => this.toggleExpandables();
        this.options = Object.assign({}, DefaultOptions, (options && options.reporterOptions));
        document.body.classList.add("mochaterial");
        if (!this.options.showHooksDefault) {
            document.body.classList.add("hide-hooks");
        }
        this.makeNav();
        this.makeHeader();
        this.makeMain();
        this.makeFooter();
        runner.on('suite', (suite) => this.runSuite(suite));
        runner.on('suite end', (suite) => this.runSuiteEnd(suite));
        runner.on('pending', (test) => this.runPending(test));
        runner.on('pass', (test) => this.runPass(test));
        runner.on('hook end', (hook) => this.runHook(hook));
        runner.on('fail', (item) => this.runFail(item));
        runner.on('start', () => this.start());
        runner.on('end', () => this.finish());
        this.stats.blocked = 0;
        this.stats.hookFailures = 0;
        let hljsCss = document.createElement("link");
        hljsCss.type = "text/css";
        hljsCss.rel = "stylesheet";
        hljsCss.href = this.options.hljsStylesUrl;
        document.head.appendChild(hljsCss);
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('grep')) {
            this.grep = new RegExp(urlParams.get('grep'));
        }
        this.codeStyle = (this.options.codeBackground == "surface") ? "surface " : "";
        this.codeStyle += (this.options.codeDefaultText == "on-surface") ? "on-surface" : "";
        this.highlighter.onmessage = function (event) {
            document.getElementById(event.data.elementId).innerHTML = event.data.content;
        };
        this.comparer.onmessage = function (event) {
            const diff = document.getElementById(event.data.elementId);
            diff.innerHTML = event.data.content;
            const sides = diff.querySelectorAll(".d2h-side-by-side");
            sides.forEach((scrolling) => {
                scrolling.addEventListener('scroll', () => {
                    sides.forEach((side) => { side.scrollLeft = scrolling.scrollLeft; });
                });
            });
        };
    }
    get(elementId) {
        return document.getElementById(elementId);
    }
    idOfSuiteElement(item) {
        switch (item) {
            case "container":
                return (this.root || this.parent.root) ? "report" : this.parent.id;
            case "suite":
                return this.id;
            case "item":
                return this.id + "-item" + this.items;
            case "code":
            case "diff":
            case "stack":
                return this.id + "-item" + this.items + "-" + item;
            default:
                return this.id + "-" + item;
        }
    }
    getSuiteElement(item) {
        return document.getElementById(this.idOf(item));
    }
    toggleBody(token) {
        document.body.classList.toggle(token);
    }
    toggleSpeedDial(e) {
        e.stopPropagation();
        const dial = e.currentTarget.parentElement;
        this.swapStyle(dial, "mdc-speed-dial--open", "mdc-speed-dial--closed") ||
            this.swapStyle(dial, "mdc-speed-dial--closed", "mdc-speed-dial--open") ||
            dial.classList.add("mdc-speed-dial--open");
        if (dial.classList.contains("mdc-speed-dial--open")) {
            window.addEventListener('click', this.closeDialListener, false);
        }
    }
    closeDial(e) {
        const items = document.querySelector(".mdc-speed-dial-items");
        if (!items.contains(e.target)) {
            const dial = document.querySelector(".mdc-speed-dial");
            this.swapStyle(dial, "mdc-speed-dial--open", "mdc-speed-dial--closed");
            window.removeEventListener('click', this.closeDialListener, false);
        }
    }
    toggleOverflow(e) {
        const overflow = e.currentTarget.parentElement;
        this.swapStyle(overflow, "mdc-top-app-bar__action-overflow--open", "mdc-top-app-bar__action-overflow--closed") ||
            this.swapStyle(overflow, "mdc-top-app-bar__action-overflow--closed", "mdc-top-app-bar__action-overflow--open") ||
            overflow.classList.add("mdc-top-app-bar__action-overflow--open");
    }
    setCycleType(state) {
        const button = this.get("cycle");
        const icon = button.querySelector(".mdc-fab__icon");
        button.classList.remove(...["passed", "failed", "pending", "blocked"].filter(remove => remove != state));
        button.classList.add(state);
        icon.classList.remove(...["passed", "failed", "pending", "blocked"].filter(remove => remove != state));
        icon.classList.add(state);
        this.currentFilter = state;
    }
    toggleExpandables() {
        const expandables = [...this.get("report").querySelectorAll(".item")];
        if (expandables.length > 0) {
            if (expandables[0].classList.contains("collapsed")) {
                expandables.forEach((expandable) => { this.expandIfCollapsed(expandable, false, false); });
            }
            else {
                expandables.forEach((expandable) => { this.collapseIfExpanded(expandable, false); });
            }
        }
    }
    toggleExpandable(e) {
        const expandable = e.currentTarget.parentElement;
        if (this.expandIfCollapsed(expandable)) {
            this.currentItem = expandable;
        }
        else {
            this.collapseIfExpanded(expandable);
        }
    }
    collapseIfExpanded(item, animate = true) {
        const to = (animate) ? "collapsing" : "collapsed";
        return this.swapStyle(item, "expanded", to);
    }
    expandIfCollapsed(item, animate = true, thenCenter = true) {
        const to = (animate) ? "expanding" : "expanded";
        return this.swapStyle(item, "collapsed", to, thenCenter);
    }
    swapStyle(item, from, to, thenCenter = false) {
        if (item.classList.contains(from)) {
            item.classList.remove(from);
            item.classList.add(to);
            if (thenCenter) {
                this.toCenter(item);
            }
            return true;
        }
        return false;
    }
    toCenter(item) {
        item.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    clearHidden(filter) {
        const hidden = "hide-" + filter;
        document.body.classList.remove(hidden);
    }
    cycle() {
        const expandables = [...this.get("report").querySelectorAll(".item")];
        const filtered = (this.currentFilter) ? expandables.filter(e => e.classList.contains(this.currentFilter)) : expandables;
        if (filtered.length > 0) {
            this.clearHidden(this.currentFilter);
            if (!this.currentItem) {
                this.currentItem = filtered[0];
                this.toCenter(this.currentItem);
                this.expandIfCollapsed(this.currentItem);
            }
            else {
                this.collapseIfExpanded(this.currentItem, false);
                const i = expandables.indexOf(this.currentItem);
                const next = expandables.findIndex((next, index) => (next.classList.contains(this.currentFilter) && index > i));
                this.currentItem = (next != -1) ? expandables[next] : filtered[0];
                this.toCenter(this.currentItem);
                this.expandIfCollapsed(this.currentItem);
            }
        }
    }
    throttle(func, wait, immediate = true) {
        let timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate)
                    func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            if (!timeout)
                timeout = setTimeout(later, wait);
            if (callNow)
                func.apply(context, args);
        };
    }
    afterAnimation(e) {
        const expandable = e.currentTarget.parentElement;
        const anim = e.animationName;
        if (anim == "collapse") {
            expandable.classList.add("collapsed");
            expandable.classList.remove("collapsing");
        }
        else if (anim == "expand") {
            expandable.classList.add("expanded");
            expandable.classList.remove("expanding");
        }
    }
    start() {
        this.runner.suite.title = this.options.rootSuiteTitle;
    }
    finish() {
        const bufferBar = this.get("bar-buffer");
        setTimeout(function () {
            bufferBar.classList.add("done");
        }, 1000);
    }
    makeHeader() {
        if (this.options.title == "document.title") {
            this.options.title = (document.title) ? document.title : "Mochaterial";
        }
        if (this.options.titlePath == "window.location") {
            this.options.titlePath = window.location.href.split('?')[0].split('#')[0];
        }
        const markup = `<header id="${"mocha-header"}" class="mdc-top-app-bar mdc-top-app-bar--fixed">
  <div class="mdc-top-app-bar__row">
    <section class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start">
      <a href="#" class="material-icons mdc-top-app-bar__navigation-icon">menu</a>
      <a class="mdc-top-app-bar__title" href="${this.options.titlePath}">${this.options.title}</a>
    </section>
    <section id="${"toolbar"}" class="mdc-top-app-bar__section mdc-top-app-bar__section--align-end" role="toolbar">
      <div id="${"overflow-container"}" class="mdc-top-app-bar__action-overflow">
        <button id="${"overflow-button"}" class="mdc-top-app-bar__action-item">
          <i class="material-icons">more_vert</i>
        </button>
        <div id="${"overflow-items"}" class="mdc-top-app-bar__action-overflow-items">
          <button id="${"toggle-suites"}" class="mdc-top-app-bar__action-item">
            <span id="${"suites"}" class="mocha-stat suites icon">0</span>
          </button>
          <button id="${"toggle-tests"}" class="mdc-top-app-bar__action-item">
            <span id="${"tests"}" class="mocha-stat tests icon">0</span>
          </button>
          <button id="${"toggle-passed"}" class="mdc-top-app-bar__action-item">
            <span id="${"passed"}" class="mocha-stat passed icon">0</span>
          </button>
          <button id="${"toggle-failed"}" class="mdc-top-app-bar__action-item">
            <span id="${"failed"}" class="mocha-stat failed icon">0</span>
          </button>
          <button id="${"toggle-pending"}" class="mdc-top-app-bar__action-item">
            <span id="${"pending"}" class="mocha-stat pending icon">0</span>
          </button>
          <button id="${"toggle-blocked"}" class="mdc-top-app-bar__action-item">
            <span id="${"blocked"}" class="mocha-stat blocked icon">0</span>
          </button>
        </div>
      </div>
    </section>
  </div>
  <div class="mdc-linear-progress mdc-linear-progress--reversed" role="progressbar">
    <div id="${"bar-buffer"}" class="mdc-linear-progress__buffering-dots"></div>
    <div id="${"bar-passed"}" class="mdc-linear-progress__bar passed"><span class="mdc-linear-progress__bar-inner"></span></div>
    <div id="${"bar-pending"}" class="mdc-linear-progress__bar pending"><span class="mdc-linear-progress__bar-inner"></span></div>
    <div id="${"bar-blocked"}" class="mdc-linear-progress__bar blocked"><span class="mdc-linear-progress__bar-inner"></span></div>
    <div id="${"bar-failed"}" class="mdc-linear-progress__bar failed"><span class="mdc-linear-progress__bar-inner"></span></div>
  </div>
</header>`;
        this.after(this.get("scrim"), markup);
        this.setOverflowItems();
        this.get("overflow-button").addEventListener('click', this.overflowListener, false);
        this.get("toggle-passed").addEventListener('click', this.togglePassedListener, false);
        this.get("toggle-failed").addEventListener('click', this.toggleFailedListener, false);
        this.get("toggle-pending").addEventListener('click', this.togglePendingListener, false);
        this.get("toggle-blocked").addEventListener('click', this.toggleBlockedListener, false);
        this.get("toggle-suites").addEventListener('click', this.toggleSuitesListener, false);
        this.get("toggle-tests").addEventListener('click', this.toggleTestsListener, false);
        window.addEventListener('resize', this.resizeListener, false);
    }
    makeMain() {
        const markup = `<main id="${"mocha-main"}" class="mdc-drawer-app-content mdc-top-app-bar--fixed-adjust mdc-bottom-app-bar--fixed-adjust scrollbar" role="main">
  <article id="${"report"}" class="${this.options.indentSuites}"></article>
</main>`;
        this.after(this.get("mocha-header"), markup);
        const drawer = MDCDrawer.attachTo(this.get("mocha-nav"));
        const topAppBar = MDCTopAppBar.attachTo(this.get("mocha-header"));
        topAppBar.setScrollTarget(this.get("mocha-main"));
        topAppBar.listen('MDCTopAppBar:nav', () => {
            drawer.open = !drawer.open;
        });
    }
    makeFooter() {
        const markup = `<footer class="mdc-bottom-app-bar">
  <div class="mdc-bottom-app-bar__fab">
    <button id="${"cycle"}" class="mdc-bottom-app-bar__fab--center-cut mdc-fab passed" aria-label="Change next passed item">
      <span class="mdc-fab__icon passed icon"></span>
    </button>
    <div class="mdc-speed-dial mdc-speed-dial-upwards">
      <button id="${"cycle-type"}" class="mdc-fab mdc-fab--mini dial" aria-label="Open cycle type items">
        <span class="mdc-fab__icon icon dial"></span>
      </button>
      <div class="mdc-speed-dial-items">
        <button id="${"cycle-passed"}" class="mdc-fab mdc-fab--mini passed" aria-label="Change cycler to passed">
          <span class="mdc-fab__icon passed icon"></span>
        </button>
        <button id="${"cycle-pending"}" class="mdc-fab mdc-fab--mini pending" aria-label="Change cycler to pending">
          <span class="mdc-fab__icon pending icon"></span>
        </button>
        <button id="${"cycle-blocked"}" class="mdc-fab mdc-fab--mini blocked" aria-label="Change cycler to blocked">
          <span class="mdc-fab__icon blocked icon"></span>
        </button>
        <button id="${"cycle-failed"}" class="mdc-fab mdc-fab--mini failed" aria-label="Change cycler to failed">
          <span class="mdc-fab__icon failed icon"></span>
        </button>
      </div>
    </div>
  </div>
  <div class="mdc-bottom-app-bar__fab--center-cut"></div>
  <div class="mdc-bottom-app-bar__row">
    <section class="mdc-bottom-app-bar__section mdc-bottom-app-bar__section--align-start">
      <buttion id="${"toggle-duration"}" class="mdc-bottom-app-bar__action-item duration" aria-label="Total Duration" alt="Total Duration"><span id="${"duration"}" class="mocha-stat duration icon">0</span></button>
    </section>
    <section class="mdc-bottom-app-bar__section mdc-bottom-app-bar__section--align-end">
      <span class="mdc-bottom-app-bar__action-item">
        <a href="https://www.netpoint.de/en/competence/mochaterial" target="_blank" rel="noopener" class="copy">
          <div class="card">
            <div class="front">
              <span class="powered">powered by</span><br><span class="np"></span>
            </div>
            <div class="back"></div>
          </div>
        </a>
      </span>
    </section>
  </div>
</footer>`;
        this.after(this.get("mocha-main"), markup);
        this.get("toggle-duration").addEventListener('click', this.toggleDurationListener, false);
        this.get("cycle").addEventListener('click', this.cycleListener, false);
        this.get("cycle-type").addEventListener('click', this.cycleTypeListener, false);
        this.get("cycle-failed").addEventListener('click', this.cycleFailedListener, false);
        this.get("cycle-passed").addEventListener('click', this.cyclePassedListener, false);
        this.get("cycle-pending").addEventListener('click', this.cyclePendingListener, false);
        this.get("cycle-blocked").addEventListener('click', this.cycleBlockedListener, false);
    }
    makeNav() {
        const markup = `<nav id="${"mocha-nav"}" class="mdc-drawer mdc-drawer--modal mdc-drawer--fixed-adjust">
  <div class="mdc-drawer__header">
    <div id="${"hook-switch"}" class="mdc-switch ${(this.options.showHooksDefault) ? "mdc-switch--checked" : ""}">
      <div class="mdc-switch__track"></div>
      <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
          <input type="checkbox" id="${"toggle-hooks"}" class="mdc-switch__native-control" role="switch" ${(this.options.showHooksDefault) ? "checked" : ""}>
        </div>
      </div>
    </div>
    <label for="${"toggle-hooks"}">show passing hooks</label>
  </div>
  <hr class="mdc-list-divider">
  <div class="mdc-drawer__content scrollbar">
    <div id="${"nav-suites"}" class="mdc-list mdc-list--dense"></div>
  </div>
</nav>
<div id="${"scrim"}" class="mdc-drawer-scrim"></div>`;
        this.prepend(document.body, markup);
        new MDCSwitch(this.get("hook-switch"));
        this.get("toggle-hooks").addEventListener('change', this.toggleHooksListener, false);
    }
    setOverflowItems() {
        if (!this.overflowButtons) {
            this.overflowButtons = [
                this.get("toggle-suites"),
                this.get("toggle-tests"),
                this.get("toggle-passed"),
                this.get("toggle-failed"),
                this.get("toggle-pending"),
                this.get("toggle-blocked")
            ];
        }
        this.overflowButtons.forEach((button) => {
            button.style.display = "none";
        });
        const toolbar = this.get("toolbar");
        const overflowContainer = this.get("overflow-container");
        const overflowItems = this.get("overflow-items");
        const width = toolbar.clientWidth;
        const canFit = (width / 48 >> 0);
        if (canFit >= this.overflowButtons.length) {
            overflowContainer.style.display = "none";
            this.overflowButtons.forEach((button) => {
                toolbar.appendChild(button);
            });
        }
        else {
            for (let i = 0; i < this.overflowButtons.length; i++) {
                if (i < canFit - 1) {
                    toolbar.appendChild(this.overflowButtons[i]);
                }
                else if (i == canFit - 1 || canFit == 0) {
                    overflowContainer.style.display = "flex";
                    toolbar.appendChild(overflowContainer);
                    overflowItems.appendChild(this.overflowButtons[i]);
                }
                else {
                    overflowItems.appendChild(this.overflowButtons[i]);
                }
            }
        }
        this.overflowButtons.forEach((button) => {
            button.style.display = "flex";
        });
    }
    updateSuite(suite, tokens) {
        if (suite.stats.tests > 0) {
            if (suite.root) {
                suite.get("header").classList.add("has-tests");
                suite.get("link").classList.add("has-tests");
            }
            this.buildSuiteSummary(suite);
            const countTests = suite.get("tests");
            countTests.innerText = suite.stats.tests.toString();
            countTests.title = `${this.countText(suite.stats.tests, "test")} included`;
            const countPassed = suite.get("passed");
            countPassed.innerText = suite.stats.passed.toString();
            countPassed.title = `${this.countText(suite.stats.passed, "test")} passed`;
            const countFailed = suite.get("failed");
            const hookFail = (suite.stats.hookFailures > 0) ? ` and ${this.countText(suite.stats.hookFailures, "hook")}` : "";
            const failedTitle = `${this.countText(suite.stats.testFailures, "test")}${hookFail} failed`;
            countFailed.innerText = (suite.stats.testFailures + suite.stats.hookFailures).toString();
            countFailed.title = failedTitle;
            const countPending = suite.get("pending");
            countPending.innerText = suite.stats.pending.toString();
            countPending.title = `${this.countText(suite.stats.pending, "test")} pending`;
            const countBlocked = suite.get("blocked");
            countBlocked.innerText = suite.stats.blocked.toString();
            countBlocked.title = `${this.countText(suite.stats.blocked, "test")} blocked`;
        }
        suite.get("duration").innerText = suite.stats.duration.toString() + "ms";
        if (tokens) {
            tokens.forEach((token) => { this.addToken(suite, token); });
        }
        this.buildRunables(suite);
        this.updateStats();
    }
    ;
    addToken(suite, token) {
        const suiteElement = suite.get("suite");
        if (!suiteElement.classList.contains(token)) {
            suiteElement.classList.add(token);
            suite.get("link").classList.add(token);
            if (suite.parent && !suite.parent.root) {
                this.addToken(suite.parent, token);
            }
        }
    }
    updateStats() {
        var ms = Math.abs(new Date().getTime() - this.stats.start.getTime());
        this.get("duration").innerText = (ms / 1000).toFixed(2) + "s";
        this.get("suites").innerText = this.suiteCount.toString();
        this.get("toggle-suites").title = `${this.countText(this.suiteCount, "suite")} included`;
        this.get("tests").innerText = this.runner.total.toString();
        this.get("toggle-tests").title = `${this.countText(this.runner.total, "test")} included`;
        const testFailures = (this.stats.failures - this.stats.hookFailures);
        const passPercent = Math.round(this.stats.passes / this.runner.total * 100);
        const failPercent = Math.round(testFailures / this.runner.total * 100);
        const pendingPercent = Math.round(this.stats.pending / this.runner.total * 100);
        const blockedPercent = Math.round(this.stats.blocked / this.runner.total * 100);
        const barTotal = this.runner.total + this.stats.hookFailures;
        const scale = .001;
        const passBarPercent = (this.stats.passes / barTotal * 100 + scale) + "%";
        const failBarPercent = (this.stats.failures / barTotal * 100 + scale) + "%";
        const pendingBarPercent = (this.stats.pending / barTotal * 100 + scale) + "%";
        const blockedBarPercent = (this.stats.blocked / barTotal * 100 + scale) + "%";
        const passedTitle = `${this.countText(this.stats.passes, "test")} (${passPercent}%) passed`;
        this.get("toggle-passed").title = passedTitle;
        this.get("passed").innerText = this.stats.passes;
        const barPassed = this.get("bar-passed");
        barPassed.style.width = passBarPercent;
        barPassed.title = passedTitle;
        const hookFail = (this.stats.hookFailures > 0) ? ` and ${this.countText(this.stats.hookFailures, "hook")}` : "";
        const failedTitle = `${this.countText(testFailures, "test")} (${failPercent}%)${hookFail} failed`;
        this.get("toggle-failed").title = failedTitle;
        this.get("failed").innerText = this.stats.failures;
        const barFailed = this.get("bar-failed");
        barFailed.style.width = failBarPercent;
        barFailed.title = failedTitle;
        const pendingTitle = `${this.countText(this.stats.pending, "test")} (${pendingPercent}%) pending`;
        this.get("toggle-pending").title = pendingTitle;
        this.get("pending").innerText = this.stats.pending;
        const barPending = this.get("bar-pending");
        barPending.style.width = pendingBarPercent;
        barPending.style.left = passBarPercent;
        barPending.title = pendingTitle;
        const blockedTitle = `${this.countText(this.stats.blocked, "test")} (${blockedPercent}%) blocked`;
        const barBlocked = this.get("bar-blocked");
        this.get("toggle-blocked").title = blockedTitle;
        this.get("blocked").innerText = this.stats.blocked;
        barBlocked.style.width = blockedBarPercent;
        barBlocked.style.right = failBarPercent;
        barBlocked.title = blockedTitle;
    }
    countText(count, itemType) {
        const s = (count != 1) ? "s" : "";
        return `${count} ${itemType}${s}`;
    }
    runSuite(suite) {
        if (!suite.root) {
            this.suiteCount++;
        }
        suite.id = (suite.root) ? "root" : `suite${this.suiteCount}`;
        suite.idOf = this.idOfSuiteElement;
        suite.get = this.getSuiteElement;
        suite.items = 0;
        suite.stats = {
            tests: 0,
            passed: 0,
            pending: 0,
            testFailures: 0,
            hookFailures: 0,
            blocked: 0,
            duration: 0
        };
        this.makeSuite(suite);
        this.makeSuiteNav(suite);
    }
    makeSuite(suite) {
        const markup = `<div id="${suite.id}" class="suite mdc-list mdc-list--dense">
  <div id="${suite.idOf("header")}" class="suite-header">
    <span class="mdc-list-item__text">${suite.title}</span>
    ${this.meta()}
    <span id="${suite.idOf("duration")}" class="mdc-list-item__meta mdc-list-item__text suite-stat duration icon">0ms</span>
    ${this.replay(suite)}
  </div>
</div>`;
        this.append(suite.get("container"), markup);
        this.buildRunables(suite);
    }
    makeSuiteNav(suite) {
        const markup = `<div id="${suite.idOf("link")}" class="suite-nav mdc-list mdc-list--dense">
  <a class="mdc-list-item nav-link" href="#${suite.id}">
    <i class="material-icons" aria-hidden="true">chevron_right</i>
    <span class="mdc-list-item__text">${suite.title}</span>
  </a>
</div>`;
        const container = (suite.root || suite.parent.root) ? this.get("nav-suites") : suite.parent.get("link");
        this.append(container, markup);
    }
    buildSuiteSummary(suite) {
        if (!suite.get("summary")) {
            const markup = `<section id="${suite.idOf("summary")}" class="suite-summary">
  <span id="${suite.idOf("tests")}" class="suite-stat tests icon">0</span>
  <span id="${suite.idOf("passed")}" class="suite-stat passed icon">0</span>
  <span id="${suite.idOf("failed")}" class="suite-stat failed icon">0</span>
  <span id="${suite.idOf("pending")}" class="suite-stat pending icon">0</span>
  <span id="${suite.idOf("blocked")}" class="suite-stat blocked icon">0</span>
</section>`;
            this.after(suite.get("header"), markup);
        }
    }
    buildRunables(suite) {
        if (!suite.get("items")) {
            const markup = `<ul id="${suite.idOf("items")}" class="mdc-list mocha-list-items"></ul>`;
            this.append(document.getElementById(suite.id), markup);
        }
    }
    runSuiteEnd(suite) {
        let blocked = suite.tests.filter(test => !test.state && !test.pending);
        if (this.grep) {
            blocked = blocked.filter(test => this.grep.test(test.fullTitle()));
        }
        blocked.forEach(test => {
            this.runBlocked(test);
        });
        if (suite.get("items")) {
            this.updateSuite(suite);
        }
        else {
            suite.get("duration").innerText = suite.stats.duration.toString() + "ms";
        }
    }
    runHook(hook) {
        this.setHookInfo(hook);
        hook.suite.items++;
        hook.state = "passed";
        const duration = this.duration(hook);
        this.updateSuite(hook.suite, ["has-hook"]);
        const description = this.itemDescription(hook.hookType, hook.title, duration.status);
        this.makeItem(hook, "passed", description, duration);
    }
    runBlocked(test) {
        this.stats.blocked++;
        test.parent.items++;
        test.parent.stats.tests++;
        test.parent.stats.blocked++;
        this.updateSuite(test.parent, ["has-blocked"]);
        const description = this.itemDescription("Test", test.title, "was blocked by previous error");
        this.makeItem(test, "blocked", description);
        const failHook = test.parent.get("suite").querySelector(`li.hook.failed[for="${this.quot(test.title)}"`);
        if (failHook) {
            failHook.after(test.parent.get("item"));
        }
        if (this.currentFilter != "failed" && this.currentFilter != "blocked") {
            this.setCycleType("blocked");
        }
    }
    runPending(test) {
        test.parent.items++;
        test.parent.stats.tests++;
        test.parent.stats.pending++;
        this.updateSuite(test.parent, ["has-pending"]);
        test.body = (test.body != "") ? test.body : "/* Pending test code unavailable */";
        const description = this.itemDescription("Test", test.title, "is pending");
        this.makeItem(test, "pending", description);
        if (this.currentFilter == "passed") {
            this.setCycleType("pending");
        }
    }
    runPass(test) {
        test.parent.items++;
        test.parent.stats.tests++;
        test.parent.stats.passed++;
        const duration = this.duration(test);
        this.updateSuite(test.parent, ["has-passed"]);
        const description = this.itemDescription("Test", test.title, duration.status);
        this.makeItem(test, "passed", description, duration);
    }
    failTest(test) {
        test.parent.items++;
        test.parent.stats.tests++;
        test.parent.stats.testFailures++;
        const duration = this.duration(test);
        this.updateSuite(test.parent, ["has-failed"]);
        const description = this.itemDescription("Test", test.title, duration.status);
        this.makeItem(test, "failed", description, duration);
        if (this.currentFilter != "failed") {
            this.setCycleType("failed");
        }
    }
    setHookInfo(hook) {
        const suite = hook.parent;
        if (suite._beforeAll.includes(hook)) {
            hook.suite = hook.parent;
            hook.title = hook.title.replace('"before all" hook: ', '');
            hook.hookType = "Before all";
        }
        if (suite._beforeEach.includes(hook)) {
            hook.suite = hook.ctx.currentTest.parent;
            hook.title = hook.title.replace('"before each" hook: ', '');
            hook.hookType = "Before each";
        }
        if (suite._afterAll.includes(hook)) {
            hook.suite = hook.parent;
            hook.title = hook.title.replace('"after all" hook: ', '');
            hook.hookType = "After all";
        }
        if (suite._afterEach.includes(hook)) {
            hook.suite = hook.ctx.currentTest.parent;
            hook.title = hook.title.replace('"after each" hook: ', '');
            hook.hookType = "After each";
        }
    }
    failHook(hook) {
        this.setHookInfo(hook);
        this.stats.hookFailures++;
        hook.suite.items++;
        hook.suite.stats.hookFailures++;
        this.updateSuite(hook.suite, ["has-failed"]);
        const duration = this.duration(hook);
        const description = this.itemDescription(hook.hookType, hook.title, duration.status);
        this.makeItem(hook, "failed", description, duration);
        this.runBlockedSuites(hook, hook.parent);
        if (this.currentFilter != "failed") {
            this.setCycleType("failed");
        }
    }
    allChildSuites(directChildren) {
        let all = [];
        directChildren.forEach((a) => {
            all.push(a);
            if (Array.isArray(a.suites)) {
                all = all.concat(this.allChildSuites(a.suites));
            }
        });
        return all;
    }
    runBlockedSuites(hook, suite) {
        const check = (hook.hookType == "Before all" || hook.hookType == "After each") ? suite : hook.suite;
        let blocked = this.allChildSuites(check.suites).filter(s => !s.get);
        if (this.grep) {
            blocked = blocked.filter(suite => this.grep.test(suite.fullTitle()));
        }
        blocked.forEach((s) => {
            this.runSuite(s);
            this.runSuiteEnd(s);
        });
    }
    runFail(item) {
        if (item.type == "test") {
            this.failTest(item);
        }
        else {
            this.failHook(item);
        }
    }
    makeItem(item, state, description, duration) {
        const error = item.err;
        let target = "";
        let suite;
        if (item.type == "hook") {
            suite = item.suite;
            if (item.ctx.currentTest) {
                target = ` for="${this.quot(item.ctx.currentTest.title)}"`;
            }
        }
        else {
            suite = item.parent;
            target = ` test="${this.quot(item.title)}"`;
        }
        const markup = `<li id="${suite.idOf("item")}" class="item ${item.type} ${state} collapsed"${target}>
  <div class="mdc-list-item expandable-trigger" title="${description}">
    ${this.itemText(item, state)}
    ${this.meta()}
    ${duration ? this.itemDuration(duration) : ''}
    ${this.replay(item)}
  </div>
  ${error ? this.failMessage(error.toString()) : ''}
  ${error ? this.stackTrace(suite.idOf("stack")) : ''}
  ${error && error.actual && error.expected ? this.compare(suite.idOf("diff")) : ''}
  ${this.code(suite.idOf("code"), item.body)}
</li>`;
        this.append(suite.get("items"), markup);
        this.wireExpandable(suite.get("item"));
        this.highlightCode(suite.get("code"), "javascript");
        if (error) {
            this.fillStack(suite.get("stack"), error);
            if (error.actual && error.expected) {
                this.compareDiff(suite.get("diff"), error);
            }
        }
    }
    wireExpandable(element) {
        element.querySelector('.expandable-trigger').addEventListener('click', this.expandableListener, false);
        element.querySelectorAll('.expandable-target').forEach(target => {
            this.PrefixedEvent(target, "AnimationEnd", this.afterAnimation);
        });
    }
    highlightCode(code, language) {
        const data = {
            elementId: code.id,
            language: language,
            content: code.textContent,
        };
        this.highlighter.postMessage(data);
    }
    compareDiff(code, error) {
        const data = {
            elementId: code.id,
            actual: error.actual,
            expected: error.expected,
            diffFormat: this.options.diffFormat,
            content: code.textContent,
        };
        this.comparer.postMessage(data);
    }
    itemDescription(itemType, title, status) {
        return `${itemType} \`${this.quot(title)}´ ${status}`;
    }
    suiteDuration(suite, duration) {
        suite.stats.duration += duration;
        if (suite.parent && !suite.parent.root) {
            this.suiteDuration(suite.parent, duration);
        }
    }
    duration(item) {
        const durationMissing = (typeof item.duration == 'undefined');
        if (!durationMissing) {
            this.suiteDuration(item.parent, item.duration);
        }
        let d = {
            time: (durationMissing) ? "???" : item.duration.toString() + "ms",
            status: "",
            style: "item-duration "
        };
        if (durationMissing) {
            d.style += "mocha-timeout";
            d.status = item.state + " with no timing given";
        }
        else if (item.duration >= item.timeout()) {
            d.style += "mocha-timeout";
            d.status = "timed out after " + d.time;
        }
        else if (item.duration > item.slow()) {
            d.style += "mocha-slow";
            d.status = item.state + " slowly in " + d.time;
        }
        else if (item.duration > item.slow() * .5) {
            d.style += "mocha-medium";
            const moderately = (item.duration > item.slow() * .75) ? " moderately slowly in " : " moderately quickly in ";
            d.status = item.state + moderately + d.time;
        }
        else {
            d.style += "mocha-fast";
            d.status = item.state + " quickly in " + d.time;
        }
        return d;
    }
    meta() {
        return `<span class="mdc-list-item__meta"></span>`;
    }
    replay(target) {
        const title = `Replay ${(target instanceof Mocha.Suite) ? "suite" : "test"} \`${this.quot(target.title)}´`;
        return `<a class="replay icon" href="${this.makeUrl(target.fullTitle())}" title="${title}"></a>`;
    }
    failMessage(message) {
        const markup = `<div class="expandable-target-reversed">
  <span class="mdc-list-item__text mocha-exception"><i class="icon exception" aria-hidden="true"></i>${Mocha.utils.escape(message)}</span>
</div>`;
        return markup;
    }
    code(id, body) {
        const markup = `<div class="expandable-target">
  <i class="icon code" aria-hidden="true"></i>
  <pre><code id="${id}" class="hljs scrollbar language-javascript ${this.codeStyle}">${Mocha.utils.clean(body)}</code></pre>
</div>`;
        return markup;
    }
    fillStack(element, error) {
        this.formatStack(error).then((stack) => {
            element.textContent = `${error.toString()} ${stack} `;
            this.highlightCode(element, "stacktracejs");
        });
    }
    stackTrace(id) {
        const markup = `<div class="expandable-target">
  <i class="icon stack" aria-hidden="true"></i>
  <pre><code id="${id}" class="hljs scrollbar stack ${this.codeStyle}"></code></pre>
</div>`;
        return markup;
    }
    compare(id) {
        const markup = `<div class="expandable-target">
  <i class="icon compare" aria-hidden="true"></i>
  <pre class="diff"><code id="${id}" class="hljs scrollbar language-diff ${this.codeStyle}"></code></pre>
</div>`;
        return markup;
    }
    itemText(item, state) {
        const itemType = (item.type == "hook") ? item.hookType.replace(" ", "-").toLowerCase() : "test";
        return `<span class="mdc-list-item__text ${itemType}-title ${state} icon">${item.title}</span>`;
    }
    itemDuration(duration) {
        return `<span class="${duration.style} icon">${duration.time}</span>`;
    }
    append(container, markup) {
        const item = document.createElement("div");
        container.appendChild(item);
        item.outerHTML = markup;
    }
    after(container, markup) {
        const item = document.createElement("div");
        container.after(item);
        item.outerHTML = markup;
    }
    prepend(container, markup) {
        const item = document.createElement("div");
        container.prepend(item);
        item.outerHTML = markup;
    }
    formatStack(error) {
        if (!error.stack) {
            return new Promise((resolve) => { resolve(""); });
        }
        else {
            const indexOfMessage = error.stack.indexOf(error.message);
            if (indexOfMessage != -1) {
                error.stack = error.stack.substr(error.message.length + indexOfMessage);
            }
            if (error.stack == "") {
                return new Promise((resolve) => { resolve(""); });
            }
            else {
                return StackTrace.fromError(error).then((stackframes) => {
                    var stringifiedStack = stackframes.map(function (sf) {
                        var functionName = sf.getFunctionName() || 'anonymous';
                        var args = '(' + (sf.getArgs() || []).join(',') + ')';
                        var fileName = sf.getFileName() ? (' @ ' + sf.getFileName()) : '';
                        var lineNumber = !isNaN(sf.getLineNumber()) ? (':' + sf.getLineNumber()) : '';
                        var columnNumber = !isNaN(sf.getColumnNumber()) ? (':' + sf.getColumnNumber()) : '';
                        return functionName + args + fileName + lineNumber + columnNumber;
                    }).join('\n   ');
                    return '\n   ' + stringifiedStack;
                });
            }
        }
    }
    quot(str) {
        return str.replace(/"/g, '&quot;');
    }
    PrefixedEvent(element, type, callback) {
        const prefix = ["webkit", "moz", "MS", "o", ""];
        for (let p = 0; p < prefix.length; p++) {
            if (!prefix[p])
                type = type.toLowerCase();
            element.addEventListener(prefix[p] + type, callback, false);
        }
    }
    makeUrl(s) {
        var search = window.location.search;
        if (search) {
            search = search.replace(/[?&]grep=[^&\s]*/g, '').replace(/^&/, '?');
        }
        return (window.location.pathname +
            (search ? search + '&' : '?') +
            'grep=' +
            encodeURIComponent(this.escapeRe(s)));
    }
    escapeRe(str) {
        var matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
        if (typeof str !== 'string') {
            throw new TypeError('Expected a string');
        }
        return str.replace(matchOperatorsRe, '\\$&');
    }
}
