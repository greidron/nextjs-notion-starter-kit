const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const next = require('next');

function createApp(options = {}) {
    const app = next({
        ...options,
        customServer: true,
        dev: false,
    });
    return app.prepare().then(() => Promise.resolve(app));
}

function readFile(path) {
    if (!path) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        fs.stat(path, (err) => {
            if (err) return resolve(null);
            fs.readFile(path, (err, data) => {
                if (err) return reject(err);
                else return resolve(data);
            });
        });
    });
}

function readCerts({ keyPath, certPath, caCertPath }) {
    return Promise.all([
        readFile(keyPath),
        readFile(certPath),
        readFile(caCertPath),
    ]).then(([key, cert, ca]) => {
        const result = {};
        if (key) result.key = key;
        if (cert) result.cert = cert;
        if (ca) result.ca = ca;
        return result;
    });
}

function printCertInfo(certs) {
    for (const key in certs) {
        const data = certs[key]
        const checksum = crypto.createHash('md5').update(data).digest('hex');
        console.log(key + " - size: " + data.size + " checksum: " + checksum);
    }
}

function makeHttpRequestHandler({ handler, publicDir, publicPrefixes = [] }) {
    return (req, res) => {
        const isPublic = publicPrefixes.some(
            (prefix) => req.url.startsWith(prefix));
        if (isPublic) {
            const filePath = path.join(publicDir, req.url);
            fs.access(filePath, (err) => {
                if (err) {
                    handler(req, res);
                    return;
                }
                res.writeHead(200);
                fs.createReadStream(filePath).pipe(res);
            });
        } else {
            handler(req, res);
        }
    };
}

function startHttpServer({ handler, port, hostname }) {
    console.log('start http server on port ' + port + ' with hostname ' + hostname);
    const server = http.createServer(handler).listen(port, hostname);
    return Promise.resolve(server);
}

function startHttpsServer({ handler, port, hostname, certPaths }) {
    console.log('start https server on port ' + port + ' with hostname ' + hostname);
    let replaceSslContextTimeoutID = null;
    const replaceSslContext = (server) => () => {
        clearTimeout(replaceSslContextTimeoutID);
        replaceSslContextTimeoutID = setTimeout(() => {
            readCerts(certPaths).then((certs) => {
                if (Object.keys(certs).length === 0) {
                    console.log('no SSL certificates - skipping renewal');
                    return;
                }
                server.setSecureContext(certs);
                console.log('renewed SSL certificates');
                printCertInfo(certs);
            }).catch((e) => {
                console.error('failed to renew SSL certificates: ' + e);
            });
        }, 5000);
    };

    return readCerts(certPaths).then((certs) => {
        printCertInfo(certs);
        const server = https.createServer(certs, handler).listen(port, hostname);
        const pathList = Object.values(certPaths).filter(Boolean)
        const isEmptyCertPath = pathList.length == 0;
        if (!isEmptyCertPath) {
            console.log('start watching SSL certificate paths: ' + pathList.join(','));
            pathList.forEach((path) => {
                fs.watchFile(path, replaceSslContext(server));
            });
        }
        return server;
    });
}

function main() {
    // set process environments
    const { config } = require('./.next/required-server-files.json');
    process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
    if (!process.env.NODE_ENV) {
        // defaults to production
        process.env.NODE_ENV = 'production';
    }
    process.chdir(__dirname);

    // graceful shutdown
    if (!process.env.NEXT_MANUAL_SIG_HANDLE) {
      process.on('SIGTERM', () => process.exit(0));
      process.on('SIGINT', () => process.exit(0));
    }

    // path
    const rootDir = __dirname;
    const publicDir = path.join(rootDir, 'public');

    // environment variables
    const httpPort = parseInt(process.env.HTTP_PORT, 10) || 3000;
    const httpsPort = parseInt(process.env.HTTPS_PORT, 10) || 3443;
    const sslKeyPath = process.env.SSL_KEY_PATH;
    const sslCertPath = process.env.SSL_CERT_PATH;
    const sslCaCertPath = process.env.SSL_CA_CERT_PATH;
    const sslChallengePath = process.env.SSL_CHALLENGE_PATH || '/.well-known/';
    const hostname = process.env.HOSTNAME || 'localhost';

    createApp({
        conf: config,
        dir: rootDir,
        hostname: hostname,
    }).then((app) => {
        const appRequestHandler = app.getRequestHandler();
        const httpRequestHandler = makeHttpRequestHandler({
            handler: appRequestHandler,
            publicDir,
            publicPrefixes: [sslChallengePath],
        });
        startHttpServer({
            handler: httpRequestHandler,
            port: httpPort,
            hostname,
        }).catch((e) => {
            console.error('failed to start http server: ' + e);
        });
        startHttpsServer({
            handler: appRequestHandler,
            port: httpsPort,
            hostname,
            certPaths: {
                keyPath: sslKeyPath,
                certPath: sslCertPath,
                caCertPath: sslCaCertPath,
            },
        }).catch((e) => {
            console.error('failed to start https server: ' + e);
        });
    })
    .catch((e) => {
        console.error('server error: ' + e);
    });
}

main()
