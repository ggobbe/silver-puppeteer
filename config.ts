export class Config {
    // Credentials
    static username = 'username';
    static password = 'password';

    // General
    static baseUrl = 'https://www.silver-world.net';
    static headless = true;
    static fast = true;
    static debug = false;
    static paMin = 10;

    // XP
    static monster = 419;
    static levelUp = {
        constitution: 1,
        strength: 0,
        agility: 0,
        intelligence: 4
    };
    static levelUpTotal = Config.levelUp.constitution
        + Config.levelUp.strength
        + Config.levelUp.agility
        + Config.levelUp.intelligence;

    // Mage
    static spell = 17;
}
