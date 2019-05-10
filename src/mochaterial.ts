/**
 * Mochaterial Reporter.
 *
 * A browser based reporter for mocha.js written as a native ES6 module
 * for a drop-in replacement of mochas default html reporter
 *
 * @link   https://www.netpoint.de/en/mochaterial
 * @author Brian Lagerman <https://github.com/orgs/netpoint-gmbh/people/brian-lagerman>
 * @license MIT
 */

import {MDCSwitch} from '@material/switch/index' ;
import {MDCTopAppBar} from "@material/top-app-bar/index";
import {MDCDrawer} from "@material/drawer/index";

// StackTrace claims ES6 support, but we can't get it to load
//import * as StackTrace from 'stacktrace-js';
import 'https://unpkg.com/stacktrace-js@2.0.0/dist/stacktrace.min.js'; 
declare var StackTrace:any;

// Allow Mocha setup in browser entry to accept reporterOptions
(<any>Mocha.prototype).reporterOptions = function (reporterOptions: any) {
  this.options.reporterOptions = reporterOptions;
}

interface MochaterialOptions {
  title: string;
  titlePath: string;
  showHooksDefault:boolean
  rootSuiteTitle: string;
  indentSuites: "no-indent" | "indent" | "tablet-up";
  codeBackground: "hljs" | "surface";
  codeDefaultText: "hljs" | "on-surface";
  diffFormat: "line-by-line" | "side-by-side";
  hljsStylesUrl: string;
}

type idOf = (item: SuiteId) => string;
type get = (item: SuiteId) => HTMLElement;

interface Stats {
  tests: number,
  passed: number,
  testFailures: number,
  hookFailures: number,
  pending: number,
  blocked: number,
  duration: number,
}

interface Suite extends Mocha.Suite {
  parent: Suite,
  suites: [Suite],
  tests: [Test],
  id: string,
  idOf: idOf,
  get: get,
  items: number,
  stats : Stats,
}

interface Test extends Mocha.Test {
  parent: Suite
}

interface Hook extends Mocha.Hook {
  parent: Suite,
  hookType: HookType,
  suite: Suite,
  icon: string,
  err?: Error
}

interface AssertionError extends Error {
  actual?: string;
  expected?: string;
}

interface Duration {
  style: string,
  status: string,
  time: string,
}

interface Highlight {
  elementId: string,
  language: string,
  content: string,
}

interface Compare {
  elementId: string,
  actual: string;
  expected: string,
  diffFormat: string,
  content: string,
}

const enum HookType {
  BeforeAll = "Before all",
  BeforeEach = "Before each",
  AfterAll = "After all",
  AfterEach = "After each"
}

const enum Styles {
  Expanded= "expanded",
  Collapsed= "collapsed",
  Collapsing= "collapsing",
  Expanding= "expanding",
  DialOpen = "mdc-speed-dial--open",
  DialClosed = "mdc-speed-dial--closed",
  OverflowOpen = "mdc-top-app-bar__action-overflow--open",
  OverflowClosed = "mdc-top-app-bar__action-overflow--closed",
}

const enum State {
  Passed = "passed",
  Failed = "failed",
  Pending = "pending",
  Blocked = "blocked",
}

const enum Has {
  Passed = "has-passed",
  Failed = "has-failed",
  Pending = "has-pending",
  Blocked = "has-blocked",
  Hook = "has-hook",
}

const enum Id {
  Header = "mocha-header",
  Main = "mocha-main",
  Nav = "mocha-nav",
  Report = "report",
  Scrim = "scrim",
  NavSuites = "nav-suites",
  Cycle = "cycle",
  CycleType = "cycle-type",
  CyclePassed = "cycle-passed",
  CycleFailed = "cycle-failed",
  CyclePending = "cycle-pending",
  CycleBlocked = "cycle-blocked",
  Toolbar = "toolbar",
  OverflowButton = "overflow-button",
  OverflowItems =  "overflow-items",
  OverflowContainer = "overflow-container",
  BarPassed ="bar-passed",
  BarFailed = "bar-failed",
  BarPending = "bar-pending",
  BarBlocked ="bar-blocked",
  BarBuffer ="bar-buffer",
  TogglePassed = "toggle-passed",
  ToggleFailed = "toggle-failed",
  TogglePending = "toggle-pending",
  ToggleBlocked = "toggle-blocked",
  ToggleDuration = "toggle-duration",
  ToggleSuites = "toggle-suites",
  ToggleTests = "toggle-tests",
  ToggleHooks = "toggle-hooks",
  HookSwitch = "hook-switch",
  CountPassed = "passed",
  CountFailed = "failed",
  CountPending = "pending",
  CountBlocked = "blocked",
  CountSuites = "suites",
  CountTests = "tests",
  Duration = "duration"
}

const enum SuiteId {
  Suite = "suite",
  Container = "container",
  Header = "header",
  Items = "items",
  Item = "item",
  Link = "link",
  Diff = "diff",
  Code = "code",
  Stack = "stack",
  Summary = "summary",
  CountPassed = "passed",
  CountFailed = "failed",
  CountPending = "pending",
  CountBlocked = "blocked",
  CountTests = "tests",
  Duration = "duration",
} 

const DefaultOptions: MochaterialOptions = {
  title : "document.title",
  titlePath: "window.location",
  showHooksDefault: true,
  rootSuiteTitle: "Isolated Tests",
  indentSuites: "tablet-up",
  codeBackground: "surface",
  codeDefaultText: "on-surface",
  diffFormat: "side-by-side",
  hljsStylesUrl: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/googlecode.min.css"
}

/**
 * Mochaterial Reporter.
 *
 */
export class Mochaterial extends Mocha.reporters.Base  {

  constructor(runner: Mocha.Runner, options?: Mocha.MochaOptions) {
    super(runner, options);
    
    this.options = {...DefaultOptions, ...(options && options.reporterOptions)};

    document.body.classList.add("mochaterial");
    if (!this.options.showHooksDefault) {
      document.body.classList.add("hide-hooks");
    }

    this.makeNav();
    this.makeHeader();
    this.makeMain();
    this.makeFooter();
    
    runner.on('suite', (suite: Suite) =>  this.runSuite(suite));
    runner.on('suite end', (suite: Suite) => this.runSuiteEnd(suite));
    runner.on('pending', (test: Test) => this.runPending(test));
    runner.on('pass', (test: Test) => this.runPass(test));
    // hook end only fires when successful
    runner.on('hook end', (hook: Hook) => this.runHook(hook));

    // TS Definition (and mocha comment) not quite right, test can be either a Test or Hook in fail event
    // Declared as Test: https://github.com/mochajs/mocha/blob/d60b3339ffe79fadcaad22047dd20334cd77babb/lib/runner.js#L223 
    // Hook Passed: https://github.com/mochajs/mocha/blob/d60b3339ffe79fadcaad22047dd20334cd77babb/lib/runner.js#L278
    runner.on('fail', (item: Test | Hook) => this.runFail(item));

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

    this.highlighter.onmessage = function(event: MessageEvent) { 
      document.getElementById((<Highlight>event.data).elementId).innerHTML = (<Highlight>event.data).content; 
    }

    this.comparer.onmessage = function(event: MessageEvent) {
      const diff = document.getElementById((<Compare>event.data).elementId);
      diff.innerHTML = (<Compare>event.data).content;
      
      // Add unified scrolling when side by side
      const sides = diff.querySelectorAll(".d2h-side-by-side");
      sides.forEach((scrolling) => {
        scrolling.addEventListener('scroll', () => {
          sides.forEach((side) => {side.scrollLeft = scrolling.scrollLeft});
        });
      });
    }
  }
  
  private options: MochaterialOptions;
  
  private highlighter = new Worker('./workers/worker.hljs.js');
  private comparer = new Worker('./workers/worker.diff2Html.js');

  private grep: RegExp;
  private codeStyle: string;
  public stats = this.stats;
  private suiteCount: number = 0;

  private currentItem: Element;
  private currentFilter: State = State.Passed;

  private overflowButtons: HTMLElement[];
  public setOverflowItemsThrottled = this.throttle(this.setOverflowItems, 200);
  public cycleThrottled = this.throttle(this.cycle, 500);

  private closeDialListener = (e: Event) => this.closeDial(e);
  private overflowListener = (e: Event) => this.toggleOverflow(e);
  private expandableListener = (e: Event) => this.toggleExpandable(e);

  private resizeListener = () => this.setOverflowItemsThrottled();

  private cycleListener = () => this.cycleThrottled();
  private cycleTypeListener = (e: Event) => this.toggleSpeedDial(e);

  private cycleFailedListener = () => this.setCycleType(State.Failed);
  private cyclePendingListener = () => this.setCycleType(State.Pending);
  private cycleBlockedListener = () => this.setCycleType(State.Blocked);
  private cyclePassedListener = () => this.setCycleType(State.Passed);

  private togglePassedListener = () => this.toggleBody("hide-passed");
  private toggleFailedListener = () => this.toggleBody("hide-failed");
  private togglePendingListener = () => this.toggleBody("hide-pending");
  private toggleBlockedListener = () => this.toggleBody("hide-blocked");
  
  private toggleDurationListener = () => this.toggleBody("hide-duration");
  private toggleHooksListener = () => this.toggleBody("hide-hooks");
  private toggleSuitesListener = () => this.toggleBody("hide-suites");
  private toggleTestsListener = () => this.toggleExpandables();

  private get(elementId: Id) : HTMLElement {
    return document.getElementById(elementId);
  }

  private idOfSuiteElement(this: Suite, item: SuiteId) : string {
    switch (item) {
      case SuiteId.Container:
        return (this.root || this.parent.root) ? Id.Report : this.parent.id;
      case SuiteId.Suite:
        return this.id;
      case SuiteId.Item:
        return this.id + "-item" + this.items;
      case SuiteId.Code:
      case SuiteId.Diff:
      case SuiteId.Stack:
        return this.id + "-item" + this.items + "-" + item;
      default:
        return this.id + "-" + item;
      }
  }

  private getSuiteElement(this: Suite, item: SuiteId) : HTMLElement {
    return document.getElementById(this.idOf(item));
  }

  public toggleBody(token: string) {
    document.body.classList.toggle(token);
  }

  public toggleSpeedDial(e: Event) {
    e.stopPropagation();
    const dial = (<HTMLElement>e.currentTarget).parentElement;

    this.swapStyle(dial, Styles.DialOpen, Styles.DialClosed) ||
    this.swapStyle(dial, Styles.DialClosed, Styles.DialOpen) ||
    dial.classList.add(Styles.DialOpen);

    if (dial.classList.contains(Styles.DialOpen)) {
      window.addEventListener('click', this.closeDialListener, false);
    }
  }

  public closeDial(e: Event) {
    const items = document.querySelector(".mdc-speed-dial-items");
    if (!items.contains(<Node>e.target)) {
      const dial = document.querySelector(".mdc-speed-dial");
      this.swapStyle(dial, Styles.DialOpen, Styles.DialClosed);
      window.removeEventListener('click', this.closeDialListener, false);
    }
  }

  public toggleOverflow(e: Event) {
    const overflow = (<HTMLElement>e.currentTarget).parentElement;

    this.swapStyle(overflow, Styles.OverflowOpen, Styles.OverflowClosed) ||
    this.swapStyle(overflow, Styles.OverflowClosed, Styles.OverflowOpen) ||
    overflow.classList.add(Styles.OverflowOpen);
  }

  public setCycleType(state: State) {

    const button = this.get(Id.Cycle);
    const icon = button.querySelector(".mdc-fab__icon");
    button.classList.remove(...[State.Passed, State.Failed, State.Pending, State.Blocked].filter(remove => remove != state));
    button.classList.add(state);
    icon.classList.remove(...[State.Passed, State.Failed, State.Pending, State.Blocked].filter(remove => remove != state));
    icon.classList.add(state);
    this.currentFilter = state;
  }
  
  public toggleExpandables() {
    const expandables = [...this.get(Id.Report).querySelectorAll(".item")];
    
    if (expandables.length > 0) {
      if (expandables[0].classList.contains(Styles.Collapsed)) {
        expandables.forEach((expandable) => { this.expandIfCollapsed(expandable, false, false) })
      }
      else {
        expandables.forEach((expandable) => { this.collapseIfExpanded(expandable, false) })
      }
    }
  }

  public toggleExpandable(e: Event) {
    const expandable = (<HTMLElement>e.currentTarget).parentElement;
    
    if (this.expandIfCollapsed(expandable)) {
      this.currentItem = expandable;
    } else {
      this.collapseIfExpanded(expandable);
    }
  }

  private collapseIfExpanded(item: Element, animate:boolean = true): boolean {
    const to = (animate) ? Styles.Collapsing : Styles.Collapsed;
    return this.swapStyle(item, Styles.Expanded, to);
  }

  private expandIfCollapsed(item: Element, animate:boolean = true, thenCenter: boolean = true): boolean {
    const to = (animate) ? Styles.Expanding : Styles.Expanded;
    return this.swapStyle(item, Styles.Collapsed, to, thenCenter);
  }

  private swapStyle(item: Element, from: string, to: string, thenCenter: boolean = false): boolean {
    if (item.classList.contains(from)) {
      item.classList.remove(from);
      item.classList.add(to);
      if (thenCenter) { this.toCenter(item); }
      return true;
    }
    return false;
  }

  private toCenter(item:Element) {
    item.scrollIntoView({behavior: "smooth", block: "center"});
  }

  private clearHidden(filter: State) {
    const hidden = "hide-" + filter;
    document.body.classList.remove(hidden);  
  }

  public cycle() {
    const expandables = [...this.get(Id.Report).querySelectorAll(".item")];
    const filtered = (this.currentFilter) ? expandables.filter(e => e.classList.contains(this.currentFilter)) : expandables;

    if (filtered.length > 0) {
      this.clearHidden(this.currentFilter);
     
      if (!this.currentItem) {
        this.currentItem = filtered[0];
        this.toCenter(this.currentItem);

        this.expandIfCollapsed(this.currentItem);
      } else {
        this.collapseIfExpanded(this.currentItem, false);
        const i = expandables.indexOf(this.currentItem);
        const next = expandables.findIndex((next, index) => (next.classList.contains(this.currentFilter) && index > i) );
        
        this.currentItem = (next != -1) ? expandables[next] : filtered[0];
        
        this.toCenter(this.currentItem);

        this.expandIfCollapsed(this.currentItem);
      }
    }
  }

  private throttle(func: Function, wait: number, immediate: boolean = true) {
    let timeout: any;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  public afterAnimation(e: Event) {
    const expandable = (<HTMLElement>e.currentTarget).parentElement;
    const anim: string = (<any>e).animationName;
    if (anim == "collapse") {
      expandable.classList.add(Styles.Collapsed);
      expandable.classList.remove(Styles.Collapsing);
    } else if (anim == "expand") {
      expandable.classList.add(Styles.Expanded);
      expandable.classList.remove(Styles.Expanding);
    }
  }

  private start() {
    this.runner.suite.title = this.options.rootSuiteTitle;
  }

  private finish() {
    //this.highlighter.terminate(); 
    const bufferBar = this.get(Id.BarBuffer);
    setTimeout(function () {
      bufferBar.classList.add("done");
    }, 1000);
  }
  
  private makeHeader() {
    if (this.options.title == "document.title") {
      this.options.title = (document.title) ? document.title : "Mochaterial";
    }
    if (this.options.titlePath == "window.location") {
      this.options.titlePath = window.location.href.split('?')[0].split('#')[0];
    }
    
    const markup = 
`<header id="${Id.Header}" class="mdc-top-app-bar mdc-top-app-bar--fixed">
  <div class="mdc-top-app-bar__row">
    <section class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start">
      <a href="#" class="material-icons mdc-top-app-bar__navigation-icon">menu</a>
      <a class="mdc-top-app-bar__title" href="${this.options.titlePath}">${this.options.title}</a>
    </section>
    <section id="${Id.Toolbar}" class="mdc-top-app-bar__section mdc-top-app-bar__section--align-end" role="toolbar">
      <div id="${Id.OverflowContainer}" class="mdc-top-app-bar__action-overflow">
        <button id="${Id.OverflowButton}" class="mdc-top-app-bar__action-item">
          <i class="material-icons">more_vert</i>
        </button>
        <div id="${Id.OverflowItems}" class="mdc-top-app-bar__action-overflow-items">
          <button id="${Id.ToggleSuites}" class="mdc-top-app-bar__action-item">
            <span id="${Id.CountSuites}" class="mocha-stat suites icon">0</span>
          </button>
          <button id="${Id.ToggleTests}" class="mdc-top-app-bar__action-item">
            <span id="${Id.CountTests}" class="mocha-stat tests icon">0</span>
          </button>
          <button id="${Id.TogglePassed}" class="mdc-top-app-bar__action-item">
            <span id="${Id.CountPassed}" class="mocha-stat passed icon">0</span>
          </button>
          <button id="${Id.ToggleFailed}" class="mdc-top-app-bar__action-item">
            <span id="${Id.CountFailed}" class="mocha-stat failed icon">0</span>
          </button>
          <button id="${Id.TogglePending}" class="mdc-top-app-bar__action-item">
            <span id="${Id.CountPending}" class="mocha-stat pending icon">0</span>
          </button>
          <button id="${Id.ToggleBlocked}" class="mdc-top-app-bar__action-item">
            <span id="${Id.CountBlocked}" class="mocha-stat blocked icon">0</span>
          </button>
        </div>
      </div>
    </section>
  </div>
  <div class="mdc-linear-progress mdc-linear-progress--reversed" role="progressbar">
    <div id="${Id.BarBuffer}" class="mdc-linear-progress__buffering-dots"></div>
    <div id="${Id.BarPassed}" class="mdc-linear-progress__bar passed"><span class="mdc-linear-progress__bar-inner"></span></div>
    <div id="${Id.BarPending}" class="mdc-linear-progress__bar pending"><span class="mdc-linear-progress__bar-inner"></span></div>
    <div id="${Id.BarBlocked}" class="mdc-linear-progress__bar blocked"><span class="mdc-linear-progress__bar-inner"></span></div>
    <div id="${Id.BarFailed}" class="mdc-linear-progress__bar failed"><span class="mdc-linear-progress__bar-inner"></span></div>
  </div>
</header>`;

    this.after(this.get(Id.Scrim), markup);

    this.setOverflowItems();

    this.get(Id.OverflowButton).addEventListener('click', this.overflowListener, false);
    this.get(Id.TogglePassed).addEventListener('click', this.togglePassedListener, false);
    this.get(Id.ToggleFailed).addEventListener('click', this.toggleFailedListener, false);
    this.get(Id.TogglePending).addEventListener('click', this.togglePendingListener, false);
    this.get(Id.ToggleBlocked).addEventListener('click', this.toggleBlockedListener, false);
    this.get(Id.ToggleSuites).addEventListener('click', this.toggleSuitesListener, false);
    this.get(Id.ToggleTests).addEventListener('click', this.toggleTestsListener, false);
  
    window.addEventListener('resize', this.resizeListener, false);
  }

  private makeMain() {
    const markup =
`<main id="${Id.Main}" class="mdc-drawer-app-content mdc-top-app-bar--fixed-adjust mdc-bottom-app-bar--fixed-adjust scrollbar" role="main">
  <article id="${Id.Report}" class="${this.options.indentSuites}"></article>
</main>`;

    this.after(this.get(Id.Header), markup);

    const drawer = MDCDrawer.attachTo(this.get(Id.Nav));
    const topAppBar =  MDCTopAppBar.attachTo(this.get(Id.Header));
    
    topAppBar.setScrollTarget(this.get(Id.Main));
    topAppBar.listen('MDCTopAppBar:nav', () => {
      drawer.open = !drawer.open;
    });
  }

  private makeFooter() {
    const markup =
`<footer class="mdc-bottom-app-bar">
  <div class="mdc-bottom-app-bar__fab">
    <button id="${Id.Cycle}" class="mdc-bottom-app-bar__fab--center-cut mdc-fab passed" aria-label="Change next passed item">
      <span class="mdc-fab__icon passed icon"></span>
    </button>
    <div class="mdc-speed-dial mdc-speed-dial-upwards">
      <button id="${Id.CycleType}" class="mdc-fab mdc-fab--mini dial" aria-label="Open cycle type items">
        <span class="mdc-fab__icon icon dial"></span>
      </button>
      <div class="mdc-speed-dial-items">
        <button id="${Id.CyclePassed}" class="mdc-fab mdc-fab--mini passed" aria-label="Change cycler to passed">
          <span class="mdc-fab__icon passed icon"></span>
        </button>
        <button id="${Id.CyclePending}" class="mdc-fab mdc-fab--mini pending" aria-label="Change cycler to pending">
          <span class="mdc-fab__icon pending icon"></span>
        </button>
        <button id="${Id.CycleBlocked}" class="mdc-fab mdc-fab--mini blocked" aria-label="Change cycler to blocked">
          <span class="mdc-fab__icon blocked icon"></span>
        </button>
        <button id="${Id.CycleFailed}" class="mdc-fab mdc-fab--mini failed" aria-label="Change cycler to failed">
          <span class="mdc-fab__icon failed icon"></span>
        </button>
      </div>
    </div>
  </div>
  <div class="mdc-bottom-app-bar__fab--center-cut"></div>
  <div class="mdc-bottom-app-bar__row">
    <section class="mdc-bottom-app-bar__section mdc-bottom-app-bar__section--align-start">
      <buttion id="${Id.ToggleDuration}" class="mdc-bottom-app-bar__action-item duration" aria-label="Total Duration" alt="Total Duration"><span id="${Id.Duration}" class="mocha-stat duration icon">0</span></button>
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
            
    this.after(this.get(Id.Main), markup);
  
    this.get(Id.ToggleDuration).addEventListener('click', this.toggleDurationListener, false);

    this.get(Id.Cycle).addEventListener('click', this.cycleListener, false);
    this.get(Id.CycleType).addEventListener('click', this.cycleTypeListener, false);
    this.get(Id.CycleFailed).addEventListener('click', this.cycleFailedListener, false);
    this.get(Id.CyclePassed).addEventListener('click', this.cyclePassedListener, false);
    this.get(Id.CyclePending).addEventListener('click', this.cyclePendingListener, false);
    this.get(Id.CycleBlocked).addEventListener('click', this.cycleBlockedListener, false);
  }

  private makeNav() {
    const markup =
`<nav id="${Id.Nav}" class="mdc-drawer mdc-drawer--modal mdc-drawer--fixed-adjust">
  <div class="mdc-drawer__header">
    <div id="${Id.HookSwitch}" class="mdc-switch ${(this.options.showHooksDefault) ? "mdc-switch--checked": ""}">
      <div class="mdc-switch__track"></div>
      <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
          <input type="checkbox" id="${Id.ToggleHooks}" class="mdc-switch__native-control" role="switch" ${(this.options.showHooksDefault) ? "checked": ""}>
        </div>
      </div>
    </div>
    <label for="${Id.ToggleHooks}">show passing hooks</label>
  </div>
  <hr class="mdc-list-divider">
  <div class="mdc-drawer__content scrollbar">
    <div id="${Id.NavSuites}" class="mdc-list mdc-list--dense"></div>
  </div>
</nav>
<div id="${Id.Scrim}" class="mdc-drawer-scrim"></div>`;
    
    this.prepend(document.body, markup);

    new MDCSwitch(this.get(Id.HookSwitch));
    this.get(Id.ToggleHooks).addEventListener('change', this.toggleHooksListener, false);
  }

  public setOverflowItems() {
    if (!this.overflowButtons) { 
      this.overflowButtons = [
        this.get(Id.ToggleSuites),
        this.get(Id.ToggleTests),
        this.get(Id.TogglePassed),
        this.get(Id.ToggleFailed),
        this.get(Id.TogglePending),
        this.get(Id.ToggleBlocked)
      ]; 
    }

    this.overflowButtons.forEach((button) => {
      button.style.display = "none";
    });

    const toolbar = this.get(Id.Toolbar);
    const overflowContainer = this.get(Id.OverflowContainer);
    const overflowItems = this.get(Id.OverflowItems);
    
    const width = toolbar.clientWidth;
    const canFit = (width/48>>0);

    if (canFit >= this.overflowButtons.length) {
      overflowContainer.style.display = "none";
      this.overflowButtons.forEach((button) => {
        toolbar.appendChild(button);
      });
    } else {
      for(let i = 0; i < this.overflowButtons.length; i++) {
        if (i < canFit - 1) {
          toolbar.appendChild(this.overflowButtons[i]);
        } else if (i == canFit -1 || canFit == 0) {
          overflowContainer.style.display = "flex";
          toolbar.appendChild(overflowContainer);
          overflowItems.appendChild(this.overflowButtons[i]);
        } else {
          overflowItems.appendChild(this.overflowButtons[i]);
        }
      }
    }

    this.overflowButtons.forEach((button) => {
      button.style.display = "flex";
    });
  }

  private updateSuite(suite: Suite, tokens?:[string]) {
    if (suite.stats.tests > 0) {
      if (suite.root) {
        suite.get(SuiteId.Header).classList.add("has-tests");
        suite.get(SuiteId.Link).classList.add("has-tests");
      }
  
      this.buildSuiteSummary(suite);

      const countTests = suite.get(SuiteId.CountTests);
      countTests.innerText = suite.stats.tests.toString();
      countTests.title =  `${this.countText(suite.stats.tests, "test")} included`;
      const countPassed = suite.get(SuiteId.CountPassed);
      countPassed.innerText = suite.stats.passed.toString();
      countPassed.title = `${this.countText(suite.stats.passed, "test")} passed`;

      const countFailed = suite.get(SuiteId.CountFailed);
      const hookFail = (suite.stats.hookFailures > 0) ? ` and ${this.countText(suite.stats.hookFailures, "hook")}`: "";
      const failedTitle = `${this.countText(suite.stats.testFailures, "test")}${hookFail} failed`;
      countFailed.innerText = (suite.stats.testFailures + suite.stats.hookFailures).toString();
      countFailed.title = failedTitle;

      const countPending = suite.get(SuiteId.CountPending);
      countPending.innerText = suite.stats.pending.toString();
      countPending.title = `${this.countText(suite.stats.pending, "test")} pending`;

      const countBlocked = suite.get(SuiteId.CountBlocked);
      countBlocked.innerText = suite.stats.blocked.toString();
      countBlocked.title = `${this.countText(suite.stats.blocked, "test")} blocked`;
    }
    suite.get(SuiteId.Duration).innerText = suite.stats.duration.toString() + "ms";
    if (tokens) {
      tokens.forEach((token)=> {this.addToken(suite, token);})
    }

    this.buildRunables(suite);
    this.updateStats();
  };

  private addToken(suite: Suite, token: string) {
    const suiteElement = suite.get(SuiteId.Suite);
    if (!suiteElement.classList.contains(token)) {
      suiteElement.classList.add(token);
      suite.get(SuiteId.Link).classList.add(token);
      if (suite.parent && !suite.parent.root) {
        this.addToken(suite.parent, token);
      }
    }
  }

  private updateStats() {
    // update global stats
    var ms =  Math.abs(new Date().getTime() - (<Date>this.stats.start).getTime());
    this.get(Id.Duration).innerText = (ms / 1000).toFixed(2) + "s";
    
    this.get(Id.CountSuites).innerText = this.suiteCount.toString();
    this.get(Id.ToggleSuites).title =  `${this.countText(this.suiteCount, "suite")} included`;
    this.get(Id.CountTests).innerText = this.runner.total.toString();
    this.get(Id.ToggleTests).title = `${this.countText(this.runner.total, "test")} included`;

    const testFailures = (this.stats.failures - this.stats.hookFailures);
    const passPercent = Math.round(this.stats.passes / this.runner.total * 100);
    const failPercent =  Math.round(testFailures / this.runner.total * 100);
    const pendingPercent = Math.round(this.stats.pending / this.runner.total * 100);
    const blockedPercent = Math.round(this.stats.blocked / this.runner.total * 100);

    const barTotal = this.runner.total + this.stats.hookFailures;
    // Mochaterial includes hook failures in the progress bar, so
    // width percentages don't match test percentages when there's a hook failure
    const scale = .001; // handles sub-pixel rounding
    const passBarPercent = (this.stats.passes / barTotal * 100 + scale)  + "%";
    const failBarPercent = (this.stats.failures / barTotal * 100 + scale)  + "%";
    const pendingBarPercent = (this.stats.pending / barTotal * 100 + scale)  + "%";
    const blockedBarPercent = (this.stats.blocked / barTotal * 100 + scale)  + "%";

    const passedTitle = `${this.countText(this.stats.passes, "test")} (${passPercent}%) passed`;
    this.get(Id.TogglePassed).title = passedTitle;
    this.get(Id.CountPassed).innerText = this.stats.passes;
    const barPassed = this.get(Id.BarPassed);
    barPassed.style.width = passBarPercent;
    barPassed.title = passedTitle;

    const hookFail = (this.stats.hookFailures > 0) ? ` and ${this.countText(this.stats.hookFailures, "hook")}`: "";
    const failedTitle = `${this.countText(testFailures, "test")} (${failPercent}%)${hookFail} failed`;
    this.get(Id.ToggleFailed).title = failedTitle;
    this.get(Id.CountFailed).innerText = this.stats.failures;
    const barFailed = this.get(Id.BarFailed);
    barFailed.style.width = failBarPercent;
    barFailed.title = failedTitle;

    const pendingTitle = `${this.countText(this.stats.pending, "test")} (${pendingPercent}%) pending`;
    this.get(Id.TogglePending).title = pendingTitle;
    this.get(Id.CountPending).innerText = this.stats.pending;
    const barPending = this.get(Id.BarPending);
    barPending.style.width = pendingBarPercent;
    barPending.style.left = passBarPercent;
    barPending.title = pendingTitle;
    
    const blockedTitle = `${this.countText(this.stats.blocked, "test")} (${blockedPercent}%) blocked`;
    const barBlocked = this.get(Id.BarBlocked);
    this.get(Id.ToggleBlocked).title = blockedTitle;
    this.get(Id.CountBlocked).innerText = this.stats.blocked;
    barBlocked.style.width = blockedBarPercent;
    barBlocked.style.right = failBarPercent;
    barBlocked.title = blockedTitle;
  }

  private countText(count: number, itemType: "test" | "hook" | "suite") : string {
    const s = (count != 1) ? "s" : "";
    return `${count} ${itemType}${s}`;
  }

  private runSuite(suite: Suite) {
    if (!suite.root) { this.suiteCount++; }

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

  private makeSuite(suite: Suite) {
    const markup: string =
`<div id="${suite.id}" class="suite mdc-list mdc-list--dense">
  <div id="${suite.idOf(SuiteId.Header)}" class="suite-header">
    <span class="mdc-list-item__text">${suite.title}</span>
    ${this.meta()}
    <span id="${suite.idOf(SuiteId.Duration)}" class="mdc-list-item__meta mdc-list-item__text suite-stat duration icon">0ms</span>
    ${this.replay(suite)}
  </div>
</div>`;

    this.append(suite.get(SuiteId.Container), markup);
    this.buildRunables(suite);
  }

  private makeSuiteNav(suite: Suite) {
    const markup: string =
`<div id="${suite.idOf(SuiteId.Link)}" class="suite-nav mdc-list mdc-list--dense">
  <a class="mdc-list-item nav-link" href="#${suite.id}">
    <i class="material-icons" aria-hidden="true">chevron_right</i>
    <span class="mdc-list-item__text">${suite.title}</span>
  </a>
</div>`;

    const container = (suite.root || suite.parent.root) ? this.get(Id.NavSuites) : suite.parent.get(SuiteId.Link);
    this.append(container, markup);
  }

  private buildSuiteSummary(suite: Suite) {
    if (!suite.get(SuiteId.Summary)) {
      const markup =
`<section id="${suite.idOf(SuiteId.Summary)}" class="suite-summary">
  <span id="${suite.idOf(SuiteId.CountTests)}" class="suite-stat tests icon">0</span>
  <span id="${suite.idOf(SuiteId.CountPassed)}" class="suite-stat passed icon">0</span>
  <span id="${suite.idOf(SuiteId.CountFailed)}" class="suite-stat failed icon">0</span>
  <span id="${suite.idOf(SuiteId.CountPending)}" class="suite-stat pending icon">0</span>
  <span id="${suite.idOf(SuiteId.CountBlocked)}" class="suite-stat blocked icon">0</span>
</section>`;

      this.after(suite.get(SuiteId.Header), markup);
    }
  }

  private buildRunables(suite: Suite) {
    if (!suite.get(SuiteId.Items)) {
      
      const markup = `<ul id="${suite.idOf(SuiteId.Items)}" class="mdc-list mocha-list-items"></ul>`;
  
      this.append(document.getElementById(suite.id), markup);
    } 
  }

  private runSuiteEnd(suite: Suite) {
    let blocked = suite.tests.filter(test => !test.state && !test.pending);
    
    // Tests that have been grepped away should not
    // be considered blocked
    if (this.grep) {
      blocked = blocked.filter(test => this.grep.test(test.fullTitle()));
    }
    
    blocked.forEach(test => {   
        this.runBlocked(test);
    });

    if (suite.get(SuiteId.Items)) {
      this.updateSuite(suite);
    } else {
      suite.get(SuiteId.Duration).innerText = suite.stats.duration.toString() + "ms";
    }
  }

  private runHook(hook: Hook) {
    this.setHookInfo(hook);
    hook.suite.items++;
    hook.state = State.Passed;
    const duration = this.duration(hook);
    this.updateSuite(hook.suite, [Has.Hook]);

    const description = this.itemDescription(hook.hookType, hook.title, duration.status);
    
    this.makeItem(hook, State.Passed, description, duration);
  }

  private runBlocked(test: Test){ 
    this.stats.blocked++;
    test.parent.items++;
    test.parent.stats.tests++;
    test.parent.stats.blocked++;
    this.updateSuite(test.parent, [Has.Blocked]);

    const description = this.itemDescription("Test", test.title, "was blocked by previous error");

    this.makeItem(test, State.Blocked, description);

    // Blocked tests run last, after all hooks finish
    // so if a failing hook can be found within this suite, move this test
    // after that hook for better flow
    const failHook = test.parent.get(SuiteId.Suite).querySelector(`li.hook.failed[for="${this.quot(test.title)}"]`);
    if (failHook) {
      (<any>failHook).after(test.parent.get(SuiteId.Item));
    } 
    
    if (this.currentFilter != State.Failed && this.currentFilter != State.Blocked) {
      this.setCycleType(State.Blocked);
    }
  }

  private runPending(test: Test){
    test.parent.items++;
    test.parent.stats.tests++;
    test.parent.stats.pending++;
    this.updateSuite(test.parent, [Has.Pending]);

    test.body = (test.body != "") ? test.body : "/* Pending test code unavailable */"; 
    const description = this.itemDescription("Test", test.title, "is pending");
   
    this.makeItem(test, State.Pending, description);

    if (this.currentFilter == State.Passed) {
      this.setCycleType(State.Pending);
    }
  }

  private runPass(test: Test){
    test.parent.items++;
    test.parent.stats.tests++;
    test.parent.stats.passed++;
    const duration = this.duration(test);
    this.updateSuite(test.parent, [Has.Passed]);
    
    const description = this.itemDescription("Test", test.title, duration.status);

    this.makeItem(test, State.Passed, description, duration);
  }

  private failTest (test: Test) {
    test.parent.items++;
    test.parent.stats.tests++;
    test.parent.stats.testFailures++;
    const duration = this.duration(test);
    this.updateSuite(test.parent, [Has.Failed]);
    
    const description: string = this.itemDescription("Test", test.title, duration.status);

    this.makeItem(test, State.Failed, description, duration);
    
    if (this.currentFilter != State.Failed) {
      this.setCycleType(State.Failed);
    }
  }

  private setHookInfo(hook: Hook) {
    // Hopefully mocha.js won't get too offended by this...
    const suite: any = hook.parent; // 'any up' to access privates

    if (suite._beforeAll.includes(hook)) {
      hook.suite = <Suite>hook.parent;
      hook.title = hook.title.replace('"before all" hook: ', '');
      hook.hookType = HookType.BeforeAll;
    }
    if (suite._beforeEach.includes(hook)) {
      hook.suite = <Suite>hook.ctx.currentTest.parent;
      hook.title = hook.title.replace('"before each" hook: ', '');
      hook.hookType = HookType.BeforeEach;
    }
    if (suite._afterAll.includes(hook)) {
      hook.suite = <Suite>hook.parent;
      hook.title = hook.title.replace('"after all" hook: ', '');
      hook.hookType = HookType.AfterAll;
    }
    if (suite._afterEach.includes(hook)) {
      hook.suite = <Suite>hook.ctx.currentTest.parent;
      hook.title = hook.title.replace('"after each" hook: ', '');
      hook.hookType = HookType.AfterEach;
    }
  }

  private failHook(hook: Hook) {
    this.setHookInfo(hook);
    this.stats.hookFailures++;
    hook.suite.items++;
    hook.suite.stats.hookFailures++;
    this.updateSuite(hook.suite, [Has.Failed]);
    const duration = this.duration(hook);

    const description = this.itemDescription(hook.hookType, hook.title, duration.status);

    this.makeItem(hook, State.Failed, description, duration);

    this.runBlockedSuites(hook, hook.parent);
    
    if (this.currentFilter != State.Failed) {
      this.setCycleType(State.Failed);
    }
  }

  private allChildSuites(directChildren: Suite[] ) : Suite[] {
    let all:Suite[] = [];
    directChildren.forEach((a) => {
      all.push(a);
      if (Array.isArray(a.suites)) {
        all = all.concat(this.allChildSuites(a.suites));
      }
    });
    return all;
  }

  private runBlockedSuites(hook: Hook, suite: Suite) {
    const check = (hook.hookType == HookType.BeforeAll || hook.hookType == HookType.AfterEach) ? suite : hook.suite;
    let blocked = this.allChildSuites(check.suites).filter(s => !s.get);

    // Suites that have been grepped away should not
    // be considered blocked
    if (this.grep) {
      blocked = blocked.filter(suite => this.grep.test(suite.fullTitle()));
    }
    
    blocked.forEach((s) => {
      this.runSuite(s);
      this.runSuiteEnd(s);
    });
  }

  private runFail(item: Test | Hook) {
    if (item.type == "test") {
      this.failTest(item);
    } else {
      this.failHook(item);
    }
  }
  
  private makeItem(item: Test | Hook, state: State, description:string, duration?: Duration) {
    const error: AssertionError = item.err;
    let target = "";
    let suite: Suite;

    if (item.type == "hook") {
      suite = (<Hook>item).suite;
      if (item.ctx.currentTest) {
        target = ` for="${this.quot(item.ctx.currentTest.title)}"`;
      }
    } else {
      suite = item.parent;
      target = ` test="${this.quot(item.title)}"`;
    }

    const markup: string =
`<li id="${suite.idOf(SuiteId.Item)}" class="item ${item.type} ${state} collapsed"${target}>
  <div class="mdc-list-item expandable-trigger" title="${description}">
    ${this.itemText(item, state)}
    ${this.meta()}
    ${duration? this.itemDuration(duration) : ''}
    ${this.replay(item)}
  </div>
  ${error? this.failMessage(error.toString()) : ''}
  ${error? this.stackTrace(suite.idOf(SuiteId.Stack)) : ''}
  ${error && error.actual && error.expected? this.compare(suite.idOf(SuiteId.Diff)) : ''}
  ${this.code(suite.idOf(SuiteId.Code), item.body)}
</li>`;

    this.append(suite.get(SuiteId.Items), markup);

    this.wireExpandable(suite.get(SuiteId.Item));
    this.highlightCode(suite.get(SuiteId.Code), "javascript");

    if (error) {
      this.fillStack(suite.get(SuiteId.Stack), error);

      if (error.actual && error.expected) {
        this.compareDiff(suite.get(SuiteId.Diff), error);
      }
    }
  }
  
  private wireExpandable(element: Element) {
    element.querySelector('.expandable-trigger').addEventListener('click', this.expandableListener, false);
    element.querySelectorAll('.expandable-target').forEach(target => {
      this.PrefixedEvent(target, "AnimationEnd", this.afterAnimation);
    });
   
  }

  private highlightCode(code:HTMLElement, language:string) {
    const data: Highlight = {
      elementId: code.id,
      language: language,
      content: code.textContent,
    };
    
    this.highlighter.postMessage(data);
  }

  private compareDiff(code:HTMLElement, error: AssertionError) {
    const data: Compare = {
      elementId: code.id,
      actual: error.actual,
      expected: error.expected,
      diffFormat: this.options.diffFormat,
      content: code.textContent,
    };
    
    this.comparer.postMessage(data);
  }

  private itemDescription(itemType: string, title:string, status: string): string {
    return `${itemType} \`${this.quot(title)}´ ${status}`;
  }
  
  private suiteDuration(suite: Suite, duration: number) {
    suite.stats.duration += duration;
    if (suite.parent && !suite.parent.root) {
      this.suiteDuration(suite.parent, duration);
    }
  }

  private duration(item: Hook | Test) : Duration {
    const durationMissing = (typeof item.duration == 'undefined');

    if (!durationMissing) {this.suiteDuration(item.parent, item.duration);}
   
    let d: Duration = { 
      time : (durationMissing) ? "???" : item.duration.toString() + "ms",
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
    } else if (item.duration > item.slow()) {
      d.style += "mocha-slow";
      d.status = item.state + " slowly in " + d.time;
    } else if (item.duration > item.slow() * .5) {
      d.style += "mocha-medium";
      // Describing as 'moderately slowly/moderately quickly'
      // because 'passed moderately in (x)ms' just sounds strange
      const moderately = (item.duration > item.slow() * .75) ? " moderately slowly in " : " moderately quickly in ";
      d.status = item.state + moderately + d.time;
    } else {
      d.style += "mocha-fast";
      d.status = item.state + " quickly in " + d.time;
    }
   
    return d;
  }

  private meta(): string {
    return `<span class="mdc-list-item__meta"></span>`;
  }

  private replay(target: Test | Suite | Hook) : string {
    const title = `Replay ${(target instanceof Mocha.Suite) ? "suite": "test"} \`${this.quot(target.title)}´`;
    return `<a class="replay icon" href="${this.makeUrl(target.fullTitle())}" title="${title}"></a>`;
  }

  private failMessage(message:string) : string {
    const markup =
`<div class="expandable-target-reversed">
  <span class="mdc-list-item__text mocha-exception"><i class="icon exception" aria-hidden="true"></i>${(<any>Mocha.utils).escape(message)}</span>
</div>` ;
    return markup;
  }

  private code(id: string, body: string) : string {
    const markup =
`<div class="expandable-target">
  <i class="icon code" aria-hidden="true"></i>
  <pre><code id="${id}" class="hljs scrollbar language-javascript ${this.codeStyle}">${Mocha.utils.clean(body)}</code></pre>
</div>`;
    return markup;
  }
  
  private fillStack(element: HTMLElement, error:Error) {
    this.formatStack(error).then((stack) => {
      element.textContent = `${error.toString()} ${stack} `;
      this.highlightCode(element, "stacktracejs");
    });
  }

  private stackTrace(id: string) : string {
    const markup = 
`<div class="expandable-target">
  <i class="icon stack" aria-hidden="true"></i>
  <pre><code id="${id}" class="hljs scrollbar stack ${this.codeStyle}"></code></pre>
</div>`;
    return markup;
  }

  private compare(id: string) : string {
    const markup =
`<div class="expandable-target">
  <i class="icon compare" aria-hidden="true"></i>
  <pre class="diff"><code id="${id}" class="hljs scrollbar language-diff ${this.codeStyle}"></code></pre>
</div>`;
    return markup;
  }

  private itemText(item: Hook | Test, state: State): string {
    const itemType = (item.type == "hook") ? item.hookType.replace(" ", "-").toLowerCase() : "test";
    return `<span class="mdc-list-item__text ${itemType}-title ${state} icon">${item.title}</span>`;
  }

  private itemDuration(duration: Duration) : string {
    return `<span class="${duration.style} icon">${duration.time}</span>`;
  }
  
  private append(container: HTMLElement, markup: string) {
    const item = document.createElement("div");
    container.appendChild(item);
    item.outerHTML = markup;
  }

  private after(container: HTMLElement, markup: string) {
    const item = document.createElement("div");
    container.after(item);
    item.outerHTML = markup;
  }

  private prepend(container: HTMLElement, markup: string) {
    const item = document.createElement("div");
    container.prepend(item);
    item.outerHTML = markup;
  }

private formatStack(error: Error): Promise<string> {
  if (!error.stack) {
    return new Promise((resolve) => {resolve("")});  
  }
  else {
    const indexOfMessage = error.stack.indexOf(error.message);
    if (indexOfMessage != -1) {
      error.stack  = error.stack.substr(
        error.message.length + indexOfMessage
      );
    }
    if (error.stack == "") {
      return new Promise((resolve) => {resolve("")});   
    } else {
     
      return StackTrace.fromError(error).then((stackframes: any[]) => {
        var stringifiedStack = stackframes.map(function(sf) {
          var functionName = sf.getFunctionName() || 'anonymous';
          var args = '(' + (sf.getArgs() || []).join(',') + ')';
          var fileName = sf.getFileName() ? (' @ ' + sf.getFileName()) : '';
          var lineNumber = !isNaN(sf.getLineNumber()) ? (':' + sf.getLineNumber()) : '';
          var columnNumber = !isNaN(sf.getColumnNumber()) ? (':' + sf.getColumnNumber()) : '';
          return functionName + args + fileName + lineNumber + columnNumber;
        }).join('\n   ');

        return  '\n   ' + stringifiedStack;
      });
    }
  } 
}

private quot(str: string ) : string {
  return str.replace(/"/g, '&quot;');
}

private PrefixedEvent(element: Element, type: string, callback: EventListener) {
  const prefix = ["webkit", "moz", "MS", "o", ""];
  for (let p = 0; p < prefix.length; p++) {
    if (!prefix[p]) type = type.toLowerCase();
    element.addEventListener(prefix[p]+type, callback, false);
  }
}

// Direct copy of https://github.com/mochajs/mocha/blob/27688bca42a1bb15da82debaebc3fe13024ca7ce/lib/reporters/html.js#L242
/**
 * Makes a URL, preserving querystring ("search") parameters.
 *
 * @param {string} s
 * @return {string} A new URL.
 */
  private makeUrl(s: string) {
    var search = window.location.search;

    // Remove previous grep query parameter if present
    if (search) {
      search = search.replace(/[?&]grep=[^&\s]*/g, '').replace(/^&/, '?');
    }

    return (
      window.location.pathname +
      (search ? search + '&' : '?') +
      'grep=' +
      encodeURIComponent(this.escapeRe(s))
    );
  }

  private escapeRe(str: string) {
    var matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
    if (typeof str !== 'string') {
      throw new TypeError('Expected a string');
    }

    return str.replace(matchOperatorsRe, '\\$&');
  }

}