const path = require('path');
let config;
const SpotifyWebApi = require('spotify-web-api-node');
const { IgApiClient } = require('instagram-private-api')
const deployPath = path.dirname(process.execPath);
const express = require('express');
const app = express();
const ig = new IgApiClient()
const prompt = require('prompt');
let version = 'beta 0.1'

config = JSON.parse(require('fs').readFileSync(path.join(deployPath, 'config.json'), 'utf8'));
//config = require('./config.json')

let lastSong;
let accessToken = config.accessToken;
let refreshToken = config.refreshToken;

let spotifyApi;

tryLogin()

async function tryLogin(u, p){
    if(u != undefined || p != undefined) {
        return login(u, p);
    } else {
        prompt.start();
        prompt.message = "Spotigram"
        prompt.delimiter = ": "
        const {username, email, password} = await prompt.get([{
            name:'username',
            description:'Instagram Username',
            required: true
        }, {
            name:'password',
            description:'Instagram Password',
            required: true,
            hidden: true,
            replace: '*'
        }]);
        return login(username, email, password);
    }
}

async function login(u, e, p) {
    console.log('Logging in to Instagram...')
    ig.state.generateDevice(u)
    await ig.simulate.preLoginFlow();
    try {
        loggedInUser = await ig.account.login(u, p);
    } catch (err) {
        console.log('Something went wrong while logging in (incorrect username or password?), Try again! ')
        console.log('- If your account has 2fa/mfa, support for this will come in the next update. Stay tuned!')
        return tryLogin();
    }
    process.nextTick(async () => await ig.simulate.postLoginFlow());
    console.log("Logged in successful! Make sure to trust the new device on your actual instagram app.")
    console.log('------------------------')
    await startServer()
    if(!config.spotifyClientID || !config.spotifyClientSecret){
        return console.log(`Please visit http://localhost:8000/ in your browser to set up your spotify client and link your account. Restart this app when you're done with every step.`)
    } else {
        spotifyApi = new SpotifyWebApi({
            clientId: config.spotifyClientID,
            clientSecret: config.spotifyClientSecret,
            redirectUri: 'http://localhost:8000/callback'
        });
    }
    setTimeout(() => {
        startApp()
    }, 2000)
}

async function startApp(){
    spotifyApi.setAccessToken(accessToken)
    spotifyApi.setRefreshToken(refreshToken)
    get();
}

async function get() {
    if(!accessToken || !refreshToken) {
        return console.log('You need to link your Spotify account, please go to http://localhost:8000/link in your browser to link your account and get your full config.json file to copy and paste')
    } else {
        setInterval(() => {
            spotifyApi.getMyCurrentPlayingTrack().then(function (data) {
                if (data.body.item === undefined) {
                    spotifyApi.getMyRecentlyPlayedTracks({ limit: 2 }).then(function (data) {
                        if(lastSong === data.body.items[0].track.id) {
                            return;
                        } else if(lastSong != data.body.items[0].track.id){
                            lastSong = data.body.items[0].track.id
                            console.log(`${data.body.items[0].track.name} by ${data.body.items[0].track.artists[0].name} was the last song you listened to.`)
                            return ig.account.setBiography(`${config.recentBioText} ${data.body.items[0].track.name} by ${data.body.items[0].track.artists[0].name}`)
                        } else {
                            return console.log('error? lmao')
                        }
                    })
                } else {
                    if(lastSong === data.body.item.id) {
                        return;
                    } else if(lastSong !== data.body.item.id){
                        lastSong = data.body.item.id
                        console.log(`Currently Listening to ${data.body.item.name} by ${data.body.item.artists[0].name}`)
                        return ig.account.setBiography(`${config.bioText} ${data.body.item.name} by ${data.body.item.artists[0].name}`)
                    } else {
                        return console.log('error? lmao')
                    }
                }
            }, function (err) {
                console.log('refreshing access token...')
                spotifyApi.refreshAccessToken().then(function (data) {
                    let r = data.body['access_token']
                    spotifyApi.setAccessToken(r)
                    spotifyApi.getMyCurrentPlayingTrack().then(function (data) {
                        if (data.body.item === undefined) {
                            spotifyApi.getMyRecentlyPlayedTracks({ limit: 2 }).then(function (data) {
                                if(lastSong === data.body.items[0].track.id) {
                                    return;
                                } else if(lastSong != data.body.items[0].track.id){
                                    lastSong = data.body.items[0].track.id
                                    console.log(`${data.body.items[0].track.name} by ${data.body.items[0].track.artists[0].name} was the last song you listened to.`)
                                    return ig.account.setBiography(`${config.recentBioText} ${data.body.items[0].track.name} by ${data.body.items[0].track.artists[0].name}`)
                                } else {
                                    return console.log('error? lmao')
                                }
                            })
                        } else {
                            if(lastSong === data.body.item.id) {
                                return;
                            } else if(lastSong !== data.body.item.id){
                                lastSong = data.body.item.id
                                console.log(`Currently Listening to ${data.body.item.name} by ${data.body.item.artists[0].name}`)
                                return ig.account.setBiography(`${config.bioText} ${data.body.item.name} by ${data.body.item.artists[0].name}`)
                            } else {
                                return console.log('error? lmao')
                            }
                        }
                    }, function (err) {
                        console.log('error: ' + err)
                    })
                })
            })
        }, 10000)
    }
}

async function startServer(){
    app.get('/', (req, res) => {
        res.send(`<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Spotigram App Making</title> </head> <body> <body style="background-color: #303030;"> <br> <div style="text-align: center; color: rgb(0, 195, 255); font-weight: 500; font-family: Arial, Helvetica, sans-serif;"> <h1>Welcome to Spotigram.</h1> <br> <a>To get started, you need to have these things:</a> <br> <br> <li>An Instagram account</li> <li>A Spotify account</li> <li>A spotify developer app (<a href="https://developer.spotify.com/dashboard/" style="color: rgb(0, 255, 34);">developers.spotify.com</a>) - These are free to make, and easy. There is a tutorial below</li> <li>Little knowledge of technology</li> </div> <br> <br> <div style="text-align: center; color: rgb(255, 145, 0); font-weight: 500; font-family: Arial, Helvetica, sans-serif;"> <h2>For more help with the Spotify app, follow these instructions:</h2> <p> 1.) Log in to <a href="https://developer.spotify.com/dashboard/" style="color: rgb(0, 255, 34);">https://developer.spotify.com/dashboard/</a> if not already<br><br> 2.) Click on the 'Create An App' button<br><br> 3.) Name the app whatever you want, make sure to give it a description, agree, then click the 'Create' button<br><br> 4.) After you click create, you will be greeted with a dashboard, it's nothing much, don't worry.<br><br> 5.) Click the 'Edit Settings' button<br><br> 6.) Under the 'Redirect URIs' section, type this: http://localhost:8000/callback/<br><br> 7.) Once you're done adding the url above, click 'Add'<br><br> 8.) Scroll down and click the 'Save' button<br><br><br> You're almost there! A few more steps to go...<br><br><br> 9.) Find where the page says 'Client ID' and copy the line of random letters and numbers next to it. Ex: f2284a887fa9487495ac54213404fff0<br><br> 10.) Go to your config.json file in the 'Spotigram' folder, and paste the Client ID in the quotes next to "spotifyClientID": then save the file<br> EXAMPLE - "spotifyClientID":"" --> "spotifyClientID":"f2284a887fa9487495ac54213404fff0"<br><br> 11.) You'll see that spotifyClientSecret is not defined, so go back to the spotify app dashboard in your browser<br><br> 12.) Click the 'Show Client Secret' text, then copy the long random string next to 'Client Secret'<br><br> 13.) Go back to the config.json file in the 'Spotigram' folder, then paste your client secret in the quotes next to "spotifyClientSecret": then save the file<br> EXAMPLE - "spotifyClientSecret":"" --> "spotifyClientSecret":"dhd721s8337gs7gag7ifdhH871173Gkjd0"<br><br> 14.) Double check you followed each step carefully...<br><br> 15.) You did it! The last thing you need to do will be to visit <a href="/link" style="color: rgb(0, 255, 34);">localhost:8000/link</a><br>Make sure to put the accessToken and refreshToken the correct spots in the config, or else it won't work.</p> </div> <br> <br> <br> </body> </body> </html>`)
    })
    app.get('/link', async (req, res) => {
        if(!config.spotifyClientID || !config.spotifyClientSecret) {
            return res.send('Please restart the app if you have added the clientID and secret to the config. If you have not done this yet, please follow the steps on http://localhost:8000/')
        }
        const scopes = [ //just remembered these while looking through the code on my toilet, we don't need these, nor do we use them. I'll make a new release with most of these taken out. We just need the user-read scopes
            'user-read-playback-state',
            'user-read-currently-playing',
            'user-read-private',
            'playlist-read-collaborative',
            'playlist-read-private',
            'user-library-read',
            'user-top-read',
            'user-read-recently-played',
            'user-follow-read'
        ];

        res.redirect(spotifyApi.createAuthorizeURL(scopes))
    })
    app.get('/callback', async (req, res) => {
        const code = req.query.code;
        spotifyApi.authorizationCodeGrant(code)
            .then(data => {
                const access_token = data.body['access_token'];
                const refresh_token = data.body['refresh_token'];

                accessToken = access_token
                refreshToken = refresh_token

                console.log('Access and Refresh token obtained successfully.')
                return res.send(`<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Spotigram App Making</title> </head> <body> <body style="background-color: #303030;"> <br> <div style="text-align: center; color: rgb(0, 195, 255); font-weight: 500; font-family: Arial, Helvetica, sans-serif;"> <h1>Please copy and paste all text in green below and paste into your config.json file and restart the app.</h1><br><a>the text should replace everything you have in the file</a><br> </div> <div> <code style="color: rgb(102, 255, 122);"> {<br> "spotifyClientID":"${config.spotifyClientID}",<br> "spotifyClientSecret":"${config.spotifyClientSecret}",<br> "accessToken":"${access_token}",<br> "refreshToken":"${refresh_token}",<br><br> "bioText":"🎶 Listening to -",<br> "recentBioText":"Recently listened to -"<br> }<br> </code> </div> <br> </body> </body> </html>`)
            })
            .catch(error => {
                res.send('Something went wrong while authorizing your code!')
            })
    })

    app.get('*', (req, res) => {
        res.send('<h1>404</h1><br><a>Page not found</a>')
    })

    app.listen(8000, () => { console.log(`Starting Spotigram ${version}`)});
}
