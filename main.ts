import { Pexer } from './Pexer';

(async () => {
    process.on('unhandledRejection', (reason: any, p: any) => {
        console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
        // application specific logging, throwing an error, or other logic here
    });

    try {
        var pexer = new Pexer();
        pexer.run();
    } catch (error) {
        console.log('error', error);
    }
})();
