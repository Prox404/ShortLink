const verifyToken = require('../app/middlewares/verifyToken');
const express = require('express');
const router = express.Router();

const userController = require('../app/controllers/UserController');

// Signup
router.post('/signup', async (req, res) => {
    userController.signup(req, res);
});

// Login
router.post('/login', async (req, res) => {
    userController.login(req, res);
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
    userController.refreshToken(req, res);
});

// Logout
router.post('/logout', verifyToken, async (req, res) => {
    userController.logout(req, res);
});

router.get('/profile', verifyToken, async (req, res) => {
    userController.profile(req, res);
});

router.put('/update', verifyToken, async (req, res) => {
    userController.update(req, res);
});

router.post('/auth/facebook', async (req, res) => {
    userController.facebookAuth(req, res);
});


module.exports = router;