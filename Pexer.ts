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
    }

    async open() {
        this.browser = await puppeteer.launch({
            headless: Config.Headless,
            slowMo: 50
        });
        this.page = await this.browser.newPage();
        this.page.setViewport({
            width: 1280,
            height: 1024
        });
        await this.page.goto(Config.BaseUrl);
    }

    async close() {
        await this.browser.close();
    }

    async login() {
        // TODO read this from terminal or config file
        await this.page.type('input[name=login]', Config.Username)
        await this.page.type('input[name=pass]', Config.Password);
        const submitButton = await this.page.$('input[name=Submit2]');
        await submitButton.click();
        await this.page.waitForNavigation();
    }

    async loop() {
        while (this.continue) {
            await this.waitMonsters();
            await this.killAllMonsters();
        }
    }

    async waitMonsters() {
        while (this.continue && !await this.isMonsterPresent()) {
            await this.gotoPage(this.pages.map, true);
        }
    }

    async isMonsterPresent(): Promise<boolean> {
        await this.gotoPage(this.pages.map, false);
        var monster = await this.page.$(`img[src^="systeme/monster${Config.Monster}."]`);
        return monster !== null;
    }

    async killAllMonsters() {
        while (this.isMonsterPresent()){
            await this.attackMonster();
            await this.gotoPage(this.pages.map, true);
        }        
    }

    async levelUp(){

    }

    async attackMonster() {
        await this.gotoPage(this.pages.map, false);
        await this.page.click('a[href^="fight.php?type=monster"]'); // TODO this attacks any kind of monster?
    }

    async gotoPage(page: string, force = true) {
        if(this.page.url().indexOf(this.pages.levelUp)){
            await this.levelUp();
        }

        if (force || this.page.url().indexOf(page) !== -1) {
            await this.page.goto(`${Config.BaseUrl}/${page}`);
            await this.page.waitForNavigation();
        }
    }

    async screenshot() {
        await this.page.screenshot({
            path: 'silver_' + moment().utc() + '.png',
            fullPage: true
        });
    }
}