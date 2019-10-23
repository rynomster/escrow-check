import { CoreRpcService } from './services/CoreRpcSerices'
import { LocalStorage }  from  'node-localstorage';

let localStorage = this.localStorage;

if (typeof localStorage === "undefined" || localStorage === null) {
    localStorage = new LocalStorage('./scratch');
}

let coreRpcService = new CoreRpcService();

setTimeout(async () => {
    const blocks = await coreRpcService.call('getblockcount', [], false);

    const ongoing = JSON.parse(localStorage.getItem('ongoing')) || [];
    const completed = JSON.parse(localStorage.getItem('completed')) || [];

    // 506400 when MP launched...
    let blockHeight = +localStorage.getItem('lastBlock') || 506400;

    for (; blockHeight <= blocks; blockHeight++) {
        await coreRpcService.call('getblockhash', [blockHeight], false)
            .then(blockHash => coreRpcService.call('getblock', [blockHash], false)
                .then(async block => {
                    for (const txHash of block.tx) {
                        const raw = await coreRpcService.call('getrawtransaction', [txHash], false);
                        if (raw.indexOf('a0000000000002') !== -1 && raw.indexOf('00000000ffffffff030403') !== -1) {
                            const finalized = raw.indexOf('1976a914') !== -1;
                            const newEscrow = raw.indexOf('17a914') !== -1;

                            if (newEscrow) {
                                ongoing.push([txHash, txHash.match(/[a-fA-F0-9]{2}/g).reverse().join('')]);
                                console.log(`Block: ${blockHeight} - newescrow: ${txHash}`);
                            } else { // finalized
                                if (!finalized) {
                                    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!Erroneous transaction found!!!!!!!!!!!!!!!!!!!!!!!!!:', txHash, '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                                }
                                console.log(`Block: ${blockHeight} - finalized: ${txHash}`);
                                if (!ongoing.find((escrow, index) => {
                                    if (raw.indexOf(escrow[1]) !== -1) {
                                        completed.push([txHash, escrow[0]]);
                                        console.log(`  completes ${escrow[0]}`);
                                        ongoing.splice(index, 1);
                                        return true;
                                    }
                                })) {
                                    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!Erroneous transaction found!!!!!!!!!!!!!!!!!!!!!!!!!:', txHash, '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                                };
                            }
                        }
                    }}));
    }

    localStorage.setItem('lastBlock', blockHeight.toString());
    localStorage.setItem('ongoing', JSON.stringify(ongoing));
    localStorage.setItem('completed', JSON.stringify(completed));

    coreRpcService.coreCookieService.running = false;

    console.info(`Ongoing: ${ongoing.length}, Completed: ${completed.length}`);

}, 50);
