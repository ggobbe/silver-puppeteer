import * as moment from 'moment';
import * as puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';

import { Config } from './config';

export class Pexer {
    private browser!: Browser;
    private page!: Page;

    private continue = true;

    private pages = {
        map: 'map/view',
        levelUp: 'levelup.php',
        castle: '/castle/enter'
    };

    private profile = {
        pa: 100
    };

    async run() {
        await this.open();
        await this.login();
        if (!await this.isLogged()) {
            await this.close();
            return;

        }

        this.logDebug("starting loop", true);

        while (this.continue) {
            while (await this.isOtherPlayerPresent()) {
                await this.goToSleep();
                continue;
            }

            if (await this.isLevelUp()) {
                await this.levelUp();
            }

            await this.updateProfileInfos(); // TODO only if not updated recently (or after attack???)

            if (!await this.isEnoughPA()) {
                await this.goToSleep();
                continue;
            }

            if (await this.isPotionNeeded()) {
                await this.drinkPotions();
                continue;
            }

            if (!await this.isMonsterPresent()) {
                if (await this.isLootPresent()) {
                    await this.grabLoot();
                } else {
                    // force refresh
                    // TODO not necessary anymore? (auto refresh)
                }
                await this.gotoPage(this.pages.map, true);
                continue;
            }

            await this.killMonster();
        }
        this.close();
    }

    async open() {
        this.browser = await puppeteer.launch({
            args: [
                //"--disable-gpu",
                "--no-sandbox",
                //"--disable-setuid-sandbox",
            ],
            headless: Config.headless,
            slowMo: Config.fast === true ? 0 : 200
        });
        this.page = await this.browser.newPage();
        await this.page.setViewport({
            width: 1280,
            height: 1024
        });
    }

    async close() {
        this.logDebug('close()');
        setTimeout(async () => {
            await this.browser.close();
            process.exit();
        }, 5000);
    }

    async login() {
        this.logDebug('login()');
        await this.page.goto(Config.baseUrl);
        await this.page.type('input[name=login]', Config.username);
        await this.page.type('input[name=pass]', Config.password);
        const submitButton = await this.page.$('a.yellowButton');
        if (submitButton != null) {
            await Promise.all([
                this.page.waitForNavigation(),
                submitButton.click(),
            ]);
        }
    }

    async isLogged() {
        this.logDebug('isLogged()');
        return true;
    }

    async isLevelUp() {
        var levelUp = await this.page.$(`a[href="/${this.pages.levelUp}"]`);
        return levelUp !== null;
    }

    async levelUp() {
        this.logDebug('levelUp()', true);

        await this.clickNavigate(`a[href="/${this.pages.levelUp}"]`);

        let pointsLeft = await this.page.evaluate(() => {
            let element = document.querySelector('[name="left"]');
            if (!element) {
                return 0;
            }
            let elementValue = element.getAttribute('value');
            if (!elementValue) {
                return 0;
            }
            return parseInt(elementValue);
        });

        if (pointsLeft !== Config.levelUpTotal) {
            throw `The amount of points left (${pointsLeft}) is different than the amount of points to distribute (${Config.levelUpTotal}).`;
        }

        await this.distributePoints(Config.levelUp.constitution, '[name="Button"][value="+"]');
        await this.distributePoints(Config.levelUp.strength, '[name="Button2"][value="+"]');
        await this.distributePoints(Config.levelUp.agility, '[name="Button3"][value="+"]');
        await this.distributePoints(Config.levelUp.intelligence, '[name="Button4"][value="+"]');

        await this.clickNavigate('[name="Submit"]');
    }

    async distributePoints(points: number, selector: string) {
        let distributed = 0;
        while (distributed < points) {
            await this.page.click(selector);
            distributed++;
        }
    }

    async isOtherPlayerPresent() {
        await this.gotoPage(this.pages.map);
        const player = await this.page.$('a[href^="fight.php?type=user"]');
        // TODO log who
        return player !== null;
    }

    async goToSleep() {
        this.logDebug('goToSleep()');
        this.gotoPage(this.pages.castle);
        this.continue = false;
    }

    async updateProfileInfos() {
        this.profile.pa = await this.page.evaluate(() => {
            let paNeeded = document.querySelector('[href="/bonus"]');
            if (!paNeeded || !paNeeded.previousSibling || !paNeeded.previousSibling.textContent) {
                return -1;
            }
            return +paNeeded.previousSibling.textContent;
        });
    }

    async isPotionNeeded() {
        return false;
    }

    async drinkPotions() { }

    async isEnoughPA() {
        return this.profile.pa <= 0 || this.profile.pa > Config.paMin;
    }

    async isLootPresent() {
        await this.gotoPage(this.pages.map);
        let loot = await this.page.$(`img[src^="/systeme/obj"]`);
        return loot !== null;
    }

    async grabLoot() {
        this.logDebug('grabLoot()');
        await this.gotoPage(this.pages.map);
        await this.page.click('img[src^="/systeme/obj"]');
    }

    async isMonsterPresent() {
        this.logDebug('isMonsterPresent()');
        await this.gotoPage(this.pages.map);
        var monster = await this.page.$(`img[src^="/systeme/monster${Config.monster}."]`);
        return monster !== null;
    }

    async killMonster() {
        this.logDebug('killMonster()');
        await this.gotoPage(this.pages.map);
        await this.clickNavigate(`img[src^="/systeme/monster${Config.monster}."]`);
        do {
            if (await this.isLevelUp()) {
                await this.levelUp();
                return;
            }
            await this.attackMonster();
        } while (await this.isMonsterAlive());
    }

    async attackMonster() {
        this.logDebug('attackMonster()');
        var spellSelector = `input[src^="systeme/mag${Config.spell}."]`;
        var spellHandler = await this.page.waitForSelector(spellSelector);
        await this.clickNavigate(spellSelector);
        // TODO warrior attack
    }

    async isMonsterAlive() {
        this.logDebug('isMonsterAlive()');
        return false;
    }

    async gotoPage(page: string, force = false) {
        if (force || this.page.url().indexOf(page) < 0) {
            this.logDebug(`gotoPage('${page}') (url was: ${this.page.url()})`);
            await this.page.goto(`${Config.baseUrl}/${page}`)
        }
    }

    async screenshot() {
        this.logDebug('screenshot()');
        await this.page.screenshot({
            path: 'silver_' + moment().utc() + '.png',
            fullPage: true
        });
    }

    async clickNavigate(selector: string) {
        await Promise.all([
            this.page.waitForNavigation(), // The promise resolves after navigation has finished
            this.page.click(selector), // Clicking the link will indirectly cause a navigation
        ]);
    }

    async logDebug(message: string, force = false) {
        if (force || Config.debug) {
            console.log(`[${moment().format()}] ${message}`);
        }
    }
}
