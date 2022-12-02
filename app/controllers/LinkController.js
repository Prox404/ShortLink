const bcrypt = require('bcrypt');

const Link = require('../models/Link/Link');
const jwt = require('jsonwebtoken');

class LinkController {

    // check isset short link

    async checkShortLink(shortLink) {
        const isset = await Link.findOne({ short_link: shortLink });
        if (isset) {
            return true;
        }
        return false;
    }


    // create random string 8 characters

    async randomString() {
        const length = 8;
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        let isset = true;

        while (isset) {
            for (let i = length; i > 0; --i) {
                result += chars[Math.floor(Math.random() * chars.length)];
            }
            isset = await this.checkShortLink(result);
        }

        return result;
    }

    // [POST] /login

    async store(req, res) {
        const body = req.body;
        if (!(body.link && req.header("authorization"))) {
            return res.status(400).send({ error: "Data not formatted properly" });
        }
        try {
            const token = req.header("authorization");
            const verified = jwt.verify(token, process.env.TOKEN_SECRET);
            const user = await User.findOne({ _id: verified._id });
            if (!user) {
                return res.status(400).send({ error: "User not found" });
            }
            const link = new Link();
            link.link = body.link;
            link.short_link = this.checkShortLink(body.short_link) ? body.shortLink : await this.randomString();
            link.user_id = user._id;
            link.password = body.password ? body.password : '';
            await link.save();
            res.status(200).send({ link });
        } catch (error) {
            console.error(error);
            res.status(400).send({ error });
        }
    }
}

module.exports = new LinkController;