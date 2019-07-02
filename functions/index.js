const functions = require('firebase-functions');

const express = require('express');
const app = express(); 

const FBAuth = require('./util/fbAuth');

const {getAllScreams, postOneScream} = require('./handlers/screams');
const{signUp, login, uploadImage, addUserDetails} = require('./handlers/users');

// scream routes
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);

// users routes
app.post('/signup', signUp)
app.post(`/login`, login)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails);


exports.api = functions.https.onRequest(app); 
