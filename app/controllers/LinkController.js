const bcrypt = require('bcrypt');
const ObjectId = require('mongoose').Types.ObjectId;

const Link = require('../models/Link/Link');
const User = require('../models/User/User');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');

class LinkController {

    // check isset short link

    async checkShortLink(shortLink) {
        console.log("call checkShortLink");
        try {
            if (shortLink == '' || shortLink == null) {
                return false;
            } else {
                const isset = await Link.findOne({ short_link: shortLink });
                if (isset) {
                    console.log('isset');
                    return true;
                }
                console.log('not isset');
                return false;
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }


    // create random string 8 characters

    async randomString() {
        console.log("call randomString");
        const length = 8;
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        let isset = true;

        while (isset) {
            for (let i = length; i > 0; --i) {
                result += chars[Math.floor(Math.random() * chars.length)];
            }
            isset = await this.checkShortLink(result).then((isset) => {
                if (isset) {
                    return true;
                }
                return false;
            });
        }
        console.log("result: " + result);
        return result;
    }

    // [POST] /login

    async store(req, res) {
        console.log("call store");
        const body = req.body;
        if (!(body.link && req.header('authorization'))) {
            return res.status(400).send({ error: "Data not formatted properly" });
        }
        try {
            const authHeader = req.headers['authorization']
            const token = authHeader && authHeader.split(' ')[1]
            const verified = jwt.verify(token, process.env.TOKEN_SECRET);
            const user = await User.findOne({ _id: verified._id });
            if (!user) {
                return res.status(400).send({ error: "User not found" });
            }

            const isset = await this.checkShortLink(body.short_link).then((isset) => {
                if (isset) {
                    return true;
                }
                return false;
            });

            if (body.short_link == '' || body.short_link == null) {
                body.short_link = await this.randomString();
            }
            if (isset) {
                return res.status(400).send({ error: "Short link already exists" });
            } else {
                console.log("call insert");
                console.log(body.short_link);
                const link = new Link();
                link.link = body.link;
                link.user_id = user._id;
                link.short_link = body.short_link;
                link.password = body.password ? body.password : '';
                link.watch = 0;
                link.privacy = body.privacy ? body.privacy : 'public';
                if (!body.password) {
                    link.auto_redirect = body.auto_redirect ? body.auto_redirect : false;
                }
                console.log(link);
                await link.save();
                res.status(200).send({ link });
            }
        } catch (error) {
            console.error(error);
            res.status(400).send({ error });
        }
    }

    // [GET] show/:shortLink
    async show(req, res) {
        console.log("call show");
        const shortLink = req.params.shortLink;
        if (!(shortLink)) {
            return res.status(400).send({ error: "Data not formatted properly" });
        }
        try {
            let links = await Link.findOne({ short_link: shortLink });
            if (!links) {
                links = await Link.findOne({ _id: shortLink });
                if (!links) {
                    return res.status(400).send({ error: "Link not found" });
                }
            }
            if (links.password != '') {
                links.password = true;
                const { _id, link, __v, ...data } = links._doc;
                res.status(200).send({ data });
            } else {
                links.password = false;
                if (links.privacy == 'private') {
                    const authHeader = req.headers['authorization'];
                    const token = authHeader && authHeader.split(' ')[1];
                    if (token == null) {
                        return res.status(400).send({ error: "Link not found" });
                    }
                    const verified = jwt.verify(token, process.env.TOKEN_SECRET);
                    const user = await User.findOne({ _id: verified._id });
                    if (!user) {
                        return res.status(400).send({ error: "Link not found" });
                    }
                    if (user._id.equals(mongoose.Types.ObjectId(links.user_id))) {
                        const { _id, __v, ...data } = links._doc;
                        res.status(200).send({ data });
                    } else {
                        return res.status(400).send({ error: "Link not found" });
                    }
                }else{
                    const { _id, __v, ...data } = links._doc;
                    res.status(200).send({ data });
                }
            }
        } catch (err) {
            console.error(err);
            res.status(400).send({ error: "Link not found" });
        }
    }

    // [POST] get/:shortLink
    async showDetails(req, res) {
        console.log("call show details");
        const shortLink = req.params.shortLink;
        const body = req.body;
        // console.log("body: ", body);
        if (!(shortLink && body.password)) {
            return res.status(400).send({ error: "Data not formatted properly" });
        }
        try {
            const links = await Link.findOne({ short_link: shortLink });
            if (!links) {
                return res.status(400).send({ error: "Link not found" });
            }
            const validPass = body.password === links.password;
            if (!validPass) {
                return res.status(400).send({ error: "Invalid Password" });
            }
            const { _id, __v, ...data } = links._doc;
            res.status(200).send({ data });
        } catch (error) {
            console.error(error);
            res.status(400).send({ error });
        }
    }

    // [GET] /get get all user link

    async getAll(req, res) {
        console.log("call getAll");
        try {
            const authHeader = req.headers['authorization']
            const token = authHeader && authHeader.split(' ')[1]
            const page = req.query.page || 1;
            const perPage = 10;
            let pages = 0;
            let total = 0;
            const verified = jwt.verify(token, process.env.TOKEN_SECRET);
            const user = await User.findOne({ _id: verified._id });
            if (!user) {
                return res.status(400).send({ error: "User not found" });
            }
            const sort = { createdAt: -1 };
            const data = await Link
                .find({ user_id: user._id }, { __v: 0, user_id: 0 })
                .limit(perPage)
                .skip(perPage * page - perPage)
                .sort(sort);

            total = await Link.countDocuments({ user_id: user._id });
            pages = Math.ceil(total / perPage);

            if (!data) {
                return res.status(400).send({ error: "Link not found" });
            }
            res.status(200).send({ data, 'current': page, pages, total });
        } catch (error) {
            console.error(error);
            res.status(400).send({ error });
        }
    }

    // [GET] /search get link by id

    async search(req, res) {
        console.log("call search");
        const id = req.query.q;
        console.log(req.query);
        if (!(id)) {
            return res.status(400).send({ error: "Data not formatted properly" });
        }
        try {
            const authHeader = req.headers['authorization']
            const token = authHeader && authHeader.split(' ')[1]
            const verified = jwt.verify(token, process.env.TOKEN_SECRET);
            const user = await User.findOne({ _id: verified._id });
            if (!user) {
                return res.status(400).send({ error: "User not found" });
            }
            const data = await Link.find({ short_link: RegExp(id) });
            console.log({ short_link: `/${id}/` });
            if (!data) {
                return res.status(400).send({ error: "Link not found" });
            }
            res.status(200).send({ data });
        } catch (error) {
            console.error(error);
            res.status(400).send({ error });
        }
    }

    // [POST] update/:shortLink

    async update(req, res) {
        console.log("call update");
        const shortLink = req.params.shortLink;
        const body = req.body;
        if (!(shortLink && body.link && req.header('authorization'))) {
            return res.status(400).send({ error: "Data not formatted properly" });
        }
        try {
            const authHeader = req.headers['authorization']
            const token = authHeader && authHeader.split(' ')[1]
            const verified = jwt.verify(token, process.env.TOKEN_SECRET);
            const user = await User.findOne({ _id: verified._id });
            if (!user) {
                return res.status(400).send({ error: "User not found" });
            }
            const currentLink = Link.findOne({ short_link: shortLink });
            let isset = true;
            if (!currentLink) {
                return res.status(400).send({ error: "Link not found" });
            } else {
                if (currentLink.short_link != body.short_link) {
                    isset = false;
                } else {
                    isset = await this.checkShortLink(body.short_link).then((isset) => {
                        if (isset) {
                            return true;
                        }
                        return false;
                    });
                }

            }
            if (isset) {
                return res.status(400).send({ error: "Short link already exists" });
            } else {
                const link = await Link.findOneAndUpdate({ short_link: shortLink }, {
                    link: body.link,
                    short_link: body.short_link,
                    password: body.password ? body.password : '',
                    privacy: body.privacy ? body.privacy : 'public',
                }, { new: true });
                if (!link) {
                    return res.status(400).send({ error: "Link not found" });
                }
                res.status(200).send({ link });
            }
        } catch (error) {
            console.error(error);
            res.status(400).send({ error });
        }
    }

    // [POST] destroy/:shortLink

    async destroy(req, res) {
        console.log("call destroy");
        const shortLink = req.params.shortLink;
        if (!(shortLink)) {
            return res.status(400).send({ error: "Data not formatted properly" });
        }
        if (req.header('authorization')) {
            const authHeader = req.headers['authorization']
            const token = authHeader && authHeader.split(' ')[1]
            const verified = jwt.verify(token, process.env.TOKEN_SECRET);
            const user = await User.findOne({ _id: verified._id });
            if (!user) {
                return res.status(400).send({ error: "User not found" });
            } else {
                try {
                    const links = await Link.findOne({ short_link: shortLink });
                    if (!links) {
                        return res.status(400).send({ error: "Link not found" });
                    }
                    if (links.user_id.equals(user._id) === false) {
                        return res.status(400).send({ error: "You don't have permission to delete this link" });
                    } else {
                        await Link.deleteOne({ short_link: shortLink });
                        res.status(200).send({ message: "Delete successfully" });
                    };
                } catch (error) {
                    console.error(error);
                    res.status(400).send({ error });
                }
            }
        } else {
            return res.status(400).send({ error: "authorization not found" });
        }

    }

    // [GET] /overview
    async overview(req, res) {
        console.log("call overview");
        try {
            const authHeader = req.headers['authorization']
            const token = authHeader && authHeader.split(' ')[1]
            console.log(authHeader);
            const verified = jwt.verify(token, process.env.TOKEN_SECRET);
            const user = await User.findOne({ _id: verified._id });
            if (!user) {
                return res.status(400).send({ error: "User not found" });
            }
            const data = {};
            const numberLinks = await Link.count();
            const numberUser = await User.count();
            const numberLinkOfUser = await Link.count({ user_id: user._id });
            data.numberLinks = numberLinks;
            data.numberUser = numberUser;
            data.numberLinkOfUser = numberLinkOfUser;
            res.status(200).send({ data });
        } catch (error) {
            console.error(error);
            res.status(400).send({ error });
        }
    }
}

module.exports = new LinkController;