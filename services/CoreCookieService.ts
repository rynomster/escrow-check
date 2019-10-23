import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';


/**
 * Deals with Authentication.
 * particl-core: read the cookie file in a loop (singleton!)
 */
export class CoreCookieService {

    private DEFAULT_CORE_USER = 'test';
    private DEFAULT_CORE_PASSWORD = 'test';

    private PATH_TO_COOKIE: string;

    private log = console;

    public running = true;

    constructor() {
        this.getCookieLoop();
    }

    /**
     * Returns either the default username or the one grabbed from the cookie file.
     * Note: cookie username is basically always "__cookie__"
     */
    public getCoreRpcUsername(): string {
        return this.DEFAULT_CORE_USER;
    }

    /**
     * Returns either the default password or the one grabbed from the cookie file.
     */
    public getCoreRpcPassword(): string {
        return this.DEFAULT_CORE_PASSWORD;
    }

    private getCookieLoop(): void {
        try {
            const cookie = this.getPathToCookie();

            // we might not be running the particld locally so the cookie might not exists
            if (cookie) {
                fs.access(cookie, (error) => {

                    if (!error) {

                        // TODO: maybe add a silly level to the logger?
                        // this.log.log('cookie file exists!');
                        fs.readFile(cookie, (err, data) => {
                            if (err) {
                                throw err;
                            }
                            // this.log.debug('cookie=', data.toString());
                            const usernameAndPassword = data.toString().split(':', 2);
                            // set username and password to cookie values
                            this.DEFAULT_CORE_USER = usernameAndPassword[0];
                            this.DEFAULT_CORE_PASSWORD = usernameAndPassword[1];
                        });
                    } else {
                        // this.log.log('cookie not found!', error);
                    }
                    return;
                });

                // grab the cookie every second
                // cookie updates everytime that the daemon restarts
                // so we need to keep on checking this due to
                // wallet encryption procedure (will reboot the daemon)
                const self = this;
                if (this.running) {
                    setTimeout(() => {
                        self.getCookieLoop();
                    }, 500);
                }
            }

        } catch ( ex ) {
            console.debug('cookie error: ', ex);
        }
    }

    private getPathToCookie(): string | null {
        // Use the stored path instead..
        if (this.PATH_TO_COOKIE) {
            return this.PATH_TO_COOKIE;
        }

        const homeDir: string = os.homedir ? os.homedir() : process.env['HOME'];

        let dir = '';
        const appName = 'Particl';

        switch (process.platform) {
          case 'linux': {
            dir = path.join(homeDir, '.' + appName.toLowerCase());
            break;
          }

          case 'darwin': {
            dir = path.join(homeDir, 'Library', 'Application Support', appName);
            break;
          }

          case 'win32': {
            const temp = path.join(process.env['APPDATA'], appName);
            if (this.checkIfExists(temp)) {
                dir = temp;
            } else {
                dir = path.join(homeDir, 'AppData', 'Roaming', appName);
            }
            break;
          }
        }

        // just check if it exist so it logs an error just in case
        if (this.checkIfExists(dir)) {
            // return path to cookie
            const cookiePath = path.join(dir, (false ? 'testnet' : ''), '.cookie'); // TODO: Testnet...
            this.PATH_TO_COOKIE = cookiePath;
            return cookiePath;
        }

        return null;
    }

    private checkIfExists(dir: string): boolean {
        try {
            fs.accessSync(dir, fs.constants.R_OK);
            console.debug('Found particl-core path', dir);
            return true;
        } catch (err) {
            console.error('Could not find particl-core path!', dir);
        }
        return false;
    }
}
