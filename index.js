const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const { nanoid } = require('nanoid');
const Url = require('./models/url');
const auth = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const geoip = require('geoip-lite');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Auth Routes
app.use('/auth', authRoutes);

// POST - Create Short URL (protected)
app.post('/shorten', auth, async (req, res) => {
  const { longUrl, customId } = req.body;
  const shortId = customId || nanoid(6);

  const exists = await Url.findOne({ shortId });
  if (exists) return res.status(400).json({ msg: 'Short ID already in use' });

  const newUrl = await Url.create({
    shortId,
    longUrl,
    user: req.user.userId
  });

  res.json({ shortUrl: `http://localhost:3000/${shortId}` });
});

app.get('/my-urls', auth, async (req, res) => {
  try {
    const urls = await Url.find({ user: req.user.userId });
    res.json(urls);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// KEEP THIS LAST
app.get('/:shortId', async (req, res) => {
  const url = await Url.findOne({ shortId: req.params.shortId });
  if (!url) return res.status(404).send('Not found');

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const geo = geoip.lookup(ip);

  url.clicks++;
  url.locations.push(geo?.country || 'Unknown');
  await url.save();

  if (url) return res.redirect(url.longUrl);
  res.status(404).json({ msg: 'Not found' });
});

// EDIT URL
app.put('/edit/:id', auth, async (req, res) => {
  const { longUrl, customId } = req.body;
  const { id } = req.params;

  // Optional: check if customId is already taken
  if (customId) {
    const exists = await Url.findOne({ shortId: customId });
    if (exists && exists._id.toString() !== id) {
      return res.status(400).json({ msg: 'Custom ID already in use' });
    }
  }

  await Url.findByIdAndUpdate(id, {
    longUrl,
    ...(customId && { shortId: customId })
  });

  res.json({ msg: 'Updated' });
});

// DELETE URL
app.delete('/delete/:id', auth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: 'Invalid ID' });
  }
  const url = await Url.findOneAndDelete({ _id: id, user: req.user.userId });
  if (!url) return res.status(404).json({ msg: 'URL not found' });

  res.json({ msg: 'Deleted' });
});

// Start Server
app.listen(3000, () => console.log('Server running at http://localhost:3000'));
