const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Schemas and Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});
const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users - Create a new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/users - Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users/:_id/exercises - Add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exerciseDate = date ? new Date(date) : new Date();
    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: exerciseDate,
    });
    const savedExercise = await newExercise.save();

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

// GET /api/users/:_id/logs - Get exercise logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let query = { userId: _id };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    let exercises = Exercise.find(query);
    if (limit) exercises = exercises.limit(parseInt(limit));
    exercises = await exercises;

    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Start Server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
