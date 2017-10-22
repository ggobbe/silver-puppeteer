import * as moment from 'moment';
import * as puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';

import { Config } from './config';

export class Pexer {
    private browser: Browser;
    private page: Page;

    private continue = true;

    private pages = {
        map: 'map.php'
    }

    async open() {
        this.browser = await puppeteer.launch({
            headless: Config.Headless
        });
        this.page = await this.browser.newPage();
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
        await this.waitMonsters();
        await this.killMonsters();
    }

    async waitMonsters() {
        while (this.continue && !this.isMonsterPresent()) {
            this.gotoPage(this.pages.map, true);
        }
    }

    async isMonsterPresent(): Promise<boolean> {
        await this.gotoPage(this.pages.map, false);
        var monster = await this.page.$(`img[src^="systeme/monster${Config.Monster}."]`);
        return monster !== null;
    }

    async killMonsters() {

    }

    async gotoPage(page: string, force = true) {
        await this.page.goto(`${Config.BaseUrl}/${page}`);
        await this.page.waitForNavigation();
    }

    async screenshot() {
        await this.page.screenshot({
            path: 'silver_' + moment().utc() + '.png',
            fullPage: true
        });
    }
}