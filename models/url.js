const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  shortId: { type: String, unique: true, required: true },
  longUrl: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },

  // 👇 new fields
  clicks: { type: Number, default: 0 },
  locations: [{ type: String }]
});

module.exports = mongoose.model('Url', urlSchema);