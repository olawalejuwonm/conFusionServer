var express = require('express');
const bodyParser = require('body-parser');
const User = require('../models/users');
const passport = require('passport')
const authenticate = require('../authenticate.js')
const cors = require('./cors');

const router = express.Router();
router.use(bodyParser.json())
/* GET users listing. */
router.get('/', cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
  User.find({})
  .then((users) => {
    return res.status(200).json(
      users)
  })
});

router.post('/signup', cors.corsWithOptions, (req, res, next) => {
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

router.post('/login', cors.corsWithOptions, userExist, passport.authenticate('local'),
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

router.get('/logout', cors.corsWithOptions,  (req, res, next) => {
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
  User.remove({}) //remove all the user
    .then((resp) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));
})
module.exports = router;
