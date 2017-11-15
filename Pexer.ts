import * as moment from 'moment';
import * as puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';

import { Config } from './config';

export class Pexer {
    private browser: Browser;
    private page: Page;

    private continue = true;

    private pages = {
        map: 'map.php',
        levelUp: 'levelup.php'
    };

    async run() {
        await this.open();
        await this.login();
        if (!await this.isLogged()) {
            await this.close();
            return;
        }

        // Empty existing level ups (not really necessary)
        while (await this.isLevelUp()) {
            await this.levelUp();
        }

        while (this.continue) {
            while (await this.isOtherPlayerPresent()) {
                await this.goToSleep();
            }

            await this.updateProfileInfos(); // TODO only if not updated recently (or after attack???)

            if (await this.isPotionNeeded()) {
                await this.drinkPotions();
                continue;
            }

            if (!await this.isEnoughPA()) {
                await this.close();
                return;
            }

            if (!await this.isMonsterPresent()) {
                if (await this.isLootPresent()) {
                    await this.grabLoot();
                } else {
                    // force refresh
                    await this.gotoPage(this.pages.map, true);
                }
                continue;
            }

            await this.killMonster();
        }
    }

    async open() {
        this.browser = await puppeteer.launch({
            headless: Config.Headless,
            slowMo: Config.Fast === true ? 0 : 200
        });
        this.page = await this.browser.newPage();
        await this.page.setViewport({
            width: 1280,
            height: 1024
        });
    }

    async close() {
        console.log('close()');
        await this.browser.close();
    }

    async login() {
        console.log('login()');
        await this.page.goto(Config.BaseUrl);
        await this.page.type('input[name=login]', Config.Username);
        await this.page.type('input[name=pass]', Config.Password);
        const submitButton = await this.page.$('input[name=Submit2]');
        if (submitButton != null) {
            await submitButton.click();
            await this.page.waitForNavigation();
        }
    }

    async isLogged() {
        console.log('isLogged()');
        return true;
    }

    async isLevelUp() {
        return false;
    }

    async levelUp() {}

    async isOtherPlayerPresent() {
        await this.gotoPage(this.pages.map);
        const player = await this.page.$('a[href^="fight.php?type=user"]');
        // TODO log who
        return player !== null;
    }

    async goToSleep() {}

    async updateProfileInfos() {}

    async isPotionNeeded() {
        return false;
    }

    async drinkPotions() {}

    async isEnoughPA() {
        return true;
    }

    async isLootPresent() {
        console.log('isLootPresent()');
        return false;
    }

    async grabLoot() {
        console.log('grabLoot()');
        await this.gotoPage(this.pages.map);
        await this.page.click('input[src^="systeme/obj"]');
    }

    async isMonsterPresent() {
        console.log('isMonsterPresent()');
        await this.gotoPage(this.pages.map);
        var monster = await this.page.$(`img[src^="systeme/monster${Config.Monster}."]`);
        return monster !== null;
    }

    async killMonster() {
        console.log('killMonster()');
        await this.gotoPage(this.pages.map);
        await this.page.click('a[href^="fight.php?type=monster"]'); // TODO this attacks any kind of monster?
        do {
            if (await this.isLevelUp()) {
                await this.levelUp();
                return;
            }
            await this.attackMonster();
        } while (await this.isMonsterAlive());
    }

    async attackMonster() {
        console.log('attackMonster()');
        var spellSelector = `input[src^="systeme/mag${Config.Spell}."]`;
        await this.page.waitForSelector(spellSelector);
        await this.page.click(spellSelector);
        await this.page.waitForNavigation();
        // TODO warrior attack
    }

    async isMonsterAlive() {
        console.log('isMonsterAlive()');
        return false;
    }

    async gotoPage(page: string, force = false) {
        console.log(`gotoPage('${page}')`);
        if (force || this.page.url().indexOf(page) < 0) {
            await this.page.goto(`${Config.BaseUrl}/${page}`);
        }
    }

    async screenshot() {
        console.log('screenshot()');
        await this.page.screenshot({
            path: 'silver_' + moment().utc() + '.png',
            fullPage: true
        });
    }
}
