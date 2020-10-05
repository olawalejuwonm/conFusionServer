var express = require('express');
const bodyParser = require('body-parser');
const User = require('../models/users');
const passport = require('passport')
var authenticate = require('../authenticate.js')


var router = express.Router();
router.use(bodyParser.json())
/* GET users listing. */
router.get('/', authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
  User.find({})
  .then((users) => {
    return res.status(200).json(
      users)
  })
});

// router.post('/signup', (req, res, next) => {
//   User.findOne({username: req.body.username})
//   .then((user) => {
//     if (user != null) { //if the user find is something or found in the database.Then the user already exist
//       var err = new Error('User ' + req.body.username + ' already exists');
//       err.status = 403;
//       next(err);
//     }
//     else {
//       return User.create({username: req.body.username,
//       password: req.body.password})
//     }
//   })
//   .then((user) => {
//     res.statusCode = 200;
//     res.setHeader('Content-Type', 'app/json');
//     res.json({status: 'Registration Successful!', user: user})
//   }, (err) => next(err))
//   .catch((err) => next(err))
// })

router.post('/signup', (req, res, next) => {
  User.register(new User({ username: req.body.username }),  //register passed in by the plugin passport-local-mongoose
    req.body.password, (err, user) => { //req.body.password will be password stored as hash&salt, while username is added 
      //to the database object keys
      if (err) {   //error like if user already exist  //if err is not null
        res.statusCode = 500;
        res.setHeader('Content-Type', 'app/json');
        res.json({ err: err, });
      }
      else {
        // console.log(err) --> null
        if (req.body.firstname) {
          user.firstname = req.body.firstname
        }
        if (req.body.lastname) {
          user.lastname = req.body.lastname
        }
        user.save((err, user) => {
          if (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.json({ err: err, });
            return;
          }
          passport.authenticate('local')(req, res, () => { //if passport.authenticate('local') is not in-place it will take 
            //long time before loading without any response, and the database will have a new User details. So that's weird it's
            //only checking if truly truly the user has been registered
            res.statusCode = 200;
            res.setHeader('Content-Type', 'app/json');
            res.json({ success: true, status: 'Registration Successful!', user: user })
          });
          //The code below works as the one above in a better way without passport.authenticate('local')
          // res.statusCode = 200;
          // res.setHeader('Content-Type', 'app/json');
          // res.json({success: true, status: 'Registration Successful!', user: user})
        })

      }
    }); //when dere is post to sign up new User process will begin but if the User exists it will be handled by 
  //error in the  callback. Passport Local Mongoose Impose a Schema on the model.
});


// router.post('/login', (req, res, next) => {
//   if (!req.session.user) { //if no signed cookies called user
//     var authHeader = req.headers.authorization; //this will prompt auth

//     if (!authHeader) { //no auth is entered
//       var err = new Error("You are not authenticated!Kindly Enter Auth Keys");
//       res.setHeader('WWW-Authenticate', 'Basic');
//       err.status = 401;
//      return next(err)
//     };



//     var auth = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(":")
//     var username = auth[0];
//     var password = auth[1];
//     User.findOne({username: username})
//     .then((user) => {
//       if (user === null ) {
//         var err = new Error("User " + username + ' does not exist');
//         err.status = 403;
//         return next(err);
//       }
//       else if (user.password !== password) {
//         var err = new Error("Your password is incorrect!");
//         err.status = 403;
//         return next(err);
//       }

//       else if (user.username === username && user.password === password) {
//         req.session.user = "authenticated" //note this as req and not res and takes name, value , option
//         res.statusCode = 200;
//         res.setHeader('Content-Type', 'text/plain');
//         res.end("You are authenticated!.")
//       }


//     })
//     .catch((err) => next(err))
//   }
//   else {// if there is signed cookies user is already logged in
//     res.statusCode = 200;
//     res.setHeader('Content-Type', 'text/plain');
//     res.end("You are already authenticated!")

//   }
// });



// router.post('/login', passport.authenticate('local'), //passport.authenticate('local') will authenticate using exports.local 
// //defined in authenticate file using passport-local-mongoose to check automatically req.body and username if they exists
// //it expect username and password in json or else it gives bad request(400 status code)//so it handles error itself
// (req, res, next) => {
//   res.statusCode = 200;
//   res.setHeader('Content-Type', 'app/json');
//   res.json({success: true, status: 'You are Successfully login!'})  
// });

const userExist = (req, res, next) => {
  User.findOne({ username: req.body.username })
    .then((user) => {
      if (user) {
        return next();
      }
      const err = new Error("User Dosen't Exist");
      err.status = 417;
      next(err);
    })
}

router.post('/login', userExist, passport.authenticate('local'),
  (req, //passport.authenticate('local') will check if user already exists or not and handles the error
    res, next) => {

    var token = authenticate.getToken({ _id: req.user._id });  //passport.authenticate('local') will pass in req.user
    res.statusCode = 200;
    res.setHeader('Content-Type', 'app/json');
    res.json({
      success: true, token: token,
      status: 'You are Successfully login!'
    })
  });

router.get('/logout', (req, res, next) => {
  if (req.session.passport) {
    req.session.destroy();
    res.clearCookie('session-id');
    res.redirect('/');
  }
  else {
    var err = new Error("You are not logged in")
    err.status = 403;
    next(err)
  }
})

router.delete('/logout', passport.authenticate('local'), (req, res, next) => {
  User.remove({}) //remove all the dish
    .then((resp) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));
})
module.exports = router;
