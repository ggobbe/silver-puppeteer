import { Pexer } from './Pexer';

(async () => {
    try {
        var pexer = new Pexer();
        pexer.run();
    } catch (error) {
        console.log('error', error);
    }
})();
