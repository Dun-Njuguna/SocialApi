const {db, admin} = require('../util/admin');
const config = require('../util/config');
const firebase = require('firebase');
firebase.initializeApp(config);

const { validateSignUpData, validateLoginData } = require('../util/validators');

exports.signUp = (req,res) => {
    const newUser={
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    } 

    const {valid,errors} = validateSignUpData(newUser);
    if(!valid) return res.status(400).json(errors);

    const noImage = 'blank-profile-picture-973460_1280.png';

    let token,userId;
     db.doc(`/users/${newUser.handle}`)
     .get()
     .then( doc => {
         if(doc.exists){
            return res.status(400).json({handle: 'this handle is already taken'});
         }else{
            return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
         }
     })
     .then(data =>{
        userId = data.user.uid;
       return  data.user.getIdToken();
     })
     .then((idtoken) => {
         token = idtoken;
         const userCredentials = {
             handle: newUser.handle,
             email: newUser.email,
             createdAt: new Date().toISOString(),
             imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImage}?alt=media`,
             userId, 
         };
         return db.doc(`/users/${newUser.handle}`).set(userCredentials);
     })
     .then(() =>{
         return res.status(201).json({token})
     })
    .catch( err => {
    if(err.code == 'auth/email-already-in-use'){
        return res.status(400).json({email: "Email in use"});
    }else
        return res.status(500).json({error: err.code});
    });
}

exports.login = (req,res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    const {valid,errors} = validateLoginData(user);
    if(!valid) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({token});
        })
        .catch(err => {
           console.error(err);
           if(err.code == 'auth/wrong-password'){
               return res.status(403).json({general: "Wrong credentials please try again"})
           }
            return res.status(500).json({error: err.code})
        })
 
}

exports.addUserDetails = (req,res) => {
    
}

exports.uploadImage = (req,res) => {
    const BusBoy = require('busboy')
    const path = require('path')
    const os = require('os')
    const fs = require('fs')
    let imageFileName;
    let imagetobeuploaded = {};

    const busboy = new BusBoy({headers: req.headers});

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

        if(mimetype !=='image/jpeg' && mimetype !== 'image/png' ){
            return res.status(400).json({error: 'Wrong file type'})
        }

        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        imageFileName = `${Math.round(Math.random()*1000000000 )}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imagetobeuploaded = {filepath, mimetype};
        file.pipe(fs.createWriteStream(filepath));

    })
    busboy.on(`finish`, () => {
        admin.storage().bucket().upload(imagetobeuploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imagetobeuploaded.mimetype
                }
            }
        })
        .then( () => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
            return db.doc(`/users/${req.user.handle}`).update({imageUrl: imageUrl});
        })
        .then( () => {
            return res.json({message: "Image uploaded"});
        })
        .catch(err =>{
            console.error(err);
            return res.status(500).json({error: err.code});           
        })
    })
    busboy.end(req.rawBody);
}
