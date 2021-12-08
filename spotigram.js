/*
    Author:
    @kars0nn

    !!NOTICE!! Please make sure you have your own spotify app IDs if you are using this in development mode
*/

const path = require('path');
let config;
const SpotifyWebApi = require('spotify-web-api-node');
const { IgApiClient } = require('instagram-private-api')
const deployPath = path.dirname(process.execPath);
const fs = require('fs')
const express = require('express');
const app = express();
const ig = new IgApiClient()
const prompt = require('prompt');
const colors = require('colors');
const open = require('open')
config = JSON.parse(require('fs').readFileSync(path.join(deployPath, 'config.json'), 'utf8'));

// config = require('./config.json')

// Define lastsong, accesstoken, and refreshtoken for later use
let lastSong;
let accessToken;
let refreshToken;
const spotifyApi = new SpotifyWebApi({
    clientId: '',        // you need to set this
    clientSecret:'',     // you need to set this
    redirectUri: 'http://localhost:8000/callback'
});
let version = '1.1'

async function tryLogin(u, p) {
    let r = await checkForUpdates()
    if (!r) {
        prompt.start();
        prompt.message = "Spotigram".green
        prompt.delimiter = ": "

        const {username, password} = await prompt.get([{
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

        return login(username, password);
    } else {
        setTimeout(() => {
            process.exit()
        },2000)
    }
}

const tipArray = [        // random tips!
    "spotigram!",
    "You can edit what Spotigram sets as your bio in config.json!",
    'To have a more personalized bio, you can write \\n in between your personal stuff, and spotify activity! Ex. "I love pizza! \\n Listening to -"',
    "birds don't sing!",
    "no pain, no gain!",
    "thank you for using my app! it means a lot, i'll be sure to keep it updated and easy for everyone <3 ~ karson",
    "2fa integration is hard lol",
    "karson's favorite song is Walking On A Dream by Empire of The Sun!",
    "i wrote this program on 300mg of caffine one night LMAO",
    "hfdjsafbvpvayvehfvlbldahcbvlawelhfLVA ~ karson <3 (this isn't a secret code, I just slammed my keyboard",
    "WARNING! Errors may occur! (will occur*)",
    "who's your favorite artist?",
    "what's one song you would play for the world if you had the chance?"
]

async function login(u, p) {
    const random = Math.floor(Math.random() * tipArray.length);
    console.log('------------------------'.bold.cyan)
    console.log('Logging in to Instagram...'.italic.grey)
    ig.state.generateDevice(u)

    await ig.simulate.preLoginFlow();

    try {
        loggedInUser = await ig.account.login(u, p);
    } catch (err) {
        console.error('Something went wrong while logging in (incorrect username or password?), Try again!'.red)
        console.error('- If your account has 2fa/mfa, support for this will come in futre updates. Stay tuned!'.yellow)
        console.error(`err'.red);

        return tryLogin();
    }


    process.nextTick(async () => await ig.simulate.postLoginFlow());
    console.log("Logged in successfully! Make sure to trust the new device on your actual instagram app if you haven't already.".italic.grey)
    console.log('------------------------'.bold.cyan)
    console.log(`TIP: ${tipArray[random]}`.italic.magenta)
    console.log('------------------------'.bold.cyan)
    console.log('Seeing if you have an access token already...'.italic.grey)
    await startServer()
    setTimeout(() => {
        if(!config.accessToken || !config.refreshToken) {
            return linkSpotify();
        } else {
            return startApp();
        }
    }, 2000)
}

async function linkSpotify() {         // this initiates when a user does not have access tokens in config.json
    console.log("opening Spotify authorization link, hang tight...")
    setTimeout(() => {
        open('https://accounts.spotify.com/authorize?client_id=9459e0d038db4b2a98554eb5b085adaf&response_type=code&redirect_uri=http://localhost:8000/callback&scope=user-read-playback-state%20user-read-currently-playing%20user-top-read%20user-read-recently-played')
    }, 1000)
}

async function startApp(){ //this initiates if the use has an access token
    console.log('You do! Starting Spotigram up right now!'.italic.grey)
    console.log('------------------------'.bold.cyan)
    spotifyApi.setAccessToken(config.accessToken)
    spotifyApi.setRefreshToken(config.refreshToken)
    get();
}

async function get() {        // main bio update function
    if (!config.accessToken || !config.refreshToken) {
        return console.error('You have not linked your spotify yet. Do it manually by going to http://localhost:8000/link in your browser.'.yellow)
    } else {
        setInterval(() => {
            spotifyApi.getMyCurrentPlayingTrack().then(function (data) {
                if (data.body.item === undefined) {
                    spotifyApi.getMyRecentlyPlayedTracks({ limit: 2 }).then(function (data) {
                        if(lastSong === data.body.items[0].track.id) {
                            return;
                        } else if(lastSong != data.body.items[0].track.id){
                            lastSong = data.body.items[0].track.id
                            console.log(`${data.body.items[0].track.name} by ${data.body.items[0].track.artists[0].name} was the last song you listened to.`.magenta)
                            return ig.account.setBiography(`${config.recentBioText} ${data.body.items[0].track.name} by ${data.body.items[0].track.artists[0].name}`)
                        } else {
                            return console.log('error? lmao'.red)
                        }
                    })
                } else {
                    if (lastSong === data.body.item.id) {
                        return;
                    } else if (lastSong !== data.body.item.id){
                        lastSong = data.body.item.id
                        console.log(`Currently Listening to ${data.body.item.name} by ${data.body.item.artists[0].name}`.magenta)
                        return ig.account.setBiography(`${config.bioText} ${data.body.item.name} by ${data.body.item.artists[0].name}`)
                    } else {
                        return console.log('error? lmao'.red)
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
                                    console.log(`${data.body.items[0].track.name} by ${data.body.items[0].track.artists[0].name} was the last song you listened to.`.magenta)
                                    return ig.account.setBiography(`${config.recentBioText} ${data.body.items[0].track.name} by ${data.body.items[0].track.artists[0].name}`)
                                } else {
                                    return console.error('error? lmao'.red)
                                }
                            })
                        } else {
                            if(lastSong === data.body.item.id) {
                                return;
                            } else if(lastSong !== data.body.item.id){
                                lastSong = data.body.item.id
                                console.log(`Currently Listening to ${data.body.item.name} by ${data.body.item.artists[0].name}`.magenta)
                                return ig.account.setBiography(`${config.bioText} ${data.body.item.name} by ${data.body.item.artists[0].name}`)
                            } else {
                                return console.log('error? lmao'.red)
                            }
                        }
                    }, function (err) {
                        console.log(`error: ${error}`.red)
                    })
                })
            })
        }, 10000)
    }
}

/***
Dear, this code is so bad...

Saint Michael the Archangel, defend us in battle.
Be our protection against the wickedness and snares of the devil;
May God rebuke him, we humbly pray;
And do thou, O Prince of the Heavenly Host, by the power of God,
thrust into hell Satan and all evil spirits who wander through the world for the ruin of souls.
Amen.
***/

async function startServer(){        // web server for direct links and callback for spotify auth (callback needs to stay callback)
    app.get('/link', (req, res) => {
        res.redirect('https://accounts.spotify.com/authorize?client_id=9459e0d038db4b2a98554eb5b085adaf&response_type=code&redirect_uri=http://localhost:8000/callback&scope=user-read-playback-state%20user-read-currently-playing%20user-top-read%20user-read-recently-played')
    })

    app.get('/callback', async (req, res) => {
        const code = req.query.code;
        spotifyApi.authorizationCodeGrant(code)
            .then(data => {
                const access_token = data.body['access_token'];
                const refresh_token = data.body['refresh_token'];

                accessToken = access_token //set local access token vars so we don't have to restart
                refreshToken = refresh_token

                config.accessToken = access_token // change values in config and then ->
                config.refreshToken = refresh_token

                fs.writeFile(path.join(deployPath, 'config.json'), JSON.stringify(config, null, 2), (err) => { // write newly defined tokens to config.json
                    if (err) throw err;
                });

                console.log('Access and Refresh token obtained successfully.'.green)
                startApp()

                // TODO: shove this into a file or something
                return res.send(`<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Spotigram</title> </head> <body style="background-color: rgb(29, 29, 29); color: white; font-family: Arial, Helvetica, sans-serif;"> <br> <br> <br> <div style="text-align: center;"> <h1>Spotify account linked successfully!</h1><p><i>you can go back to whatever you were doing now!</i></p> <br> <br> <br> <p>Thank you for using my app, Enjoy!</p> <i> <a href="https://github.com/kars0nn" style="text-decoration: none; color: rgb(0, 183, 255);"> ~ karson </a> <a style="color: rgb(255, 0, 170);">:3</a> </i> </div> </body> </html>`)
            })
            .catch(error) => {
                res.send('Something went wrong while authorizing your code!')
                console.error(error)
            })
    })

    app.get('*', (req, res) => {
        res.send('<h1>404</h1><br><a href="/">Page not found</a>')
    })

    app.listen(8000);
}

async function checkForUpdates(){ //checks for updates and lets user know if they are up to date or not
    const p = require('phin')

    const res = await p('https://wsdpanthers.net/spoti_ver')//update page
    let j = JSON.parse(res.body)
    if (j.version === version) {
        console.log('Spotigram is up to date! {v1.1}'.italic.grey)
    } else {
        console.log('There is a new version of spotigram available, do you wish to update?'.italic.red)
        prompt.start();
        prompt.message = ""
        prompt.delimiter = ""
        const {quest} = await prompt.get([{
            name:'quest',
            description:'yes / no'
        }]);
        if(quest === 'yes') {
            open('https://github.com/kars0nn/Spotigram/releases')
            return true;
        } else {
            console.log('OK')
            return false;
        }
    }
}

tryLogin()
