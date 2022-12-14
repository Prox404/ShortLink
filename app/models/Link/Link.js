const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const LinkSchema = new Schema({
    link: { type: String, required: true },
    short_link: { type: String, default: '', unique: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    password: { type: String, default: '' }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Link', LinkSchema);