import { Pexer } from './Pexer';

(async () => {
  var pexer = new Pexer();
  await pexer.open();
  await pexer.login();
  await pexer.loop();
  await pexer.close();
})();