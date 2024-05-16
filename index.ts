import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from "mongoose";
import { config } from 'dotenv';
import { User } from './models/userSchema.js'
import { Exercise } from './models/exerciseSchema.js';

const app: Express = express();
config();

// Enabel CORS
app.use(cors({ optionsSuccessStatus: 200 }));

// URL-encoded data will be parsed with the querystring library.
// Parses the JSON string in the request body and exposes it in the req.body property
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'))

// Database connection
const uri: string | undefined = process.env.MONGO_URI;

if (!uri)
    throw new Error('MONGO_URI not found in environment variables');

mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000 // Example timeout value in milliseconds
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));


app.get('/', (req: Request, res: Response) => {
    res.sendFile(__dirname + '/views/index.html')
});

// User context
app.get('/api/users', async (req: Request, res: Response) => {
    try {
        const users = await User.find({});

        if (!users)
            return res.json([]);

        return res.status(200).json(users);
    }
    catch (e) {
        console.error(e);
        res.status(500).json('Error in /api/users')
    }
});

app.post('/api/users', async (req: Request, res: Response) => {
    try {
        const { username } = req.body;

        if (!username)
            res.status(403).json('username is required.');

        // Check if user is already in database
        const userInDb = await User.findOne({ name: username });
        if (userInDb) {
            return res.status(200).json({
                username: userInDb.username || "",
                _id: userInDb._id || ""
            })
        }

        // Create a new user
        const createdUser = await User.create({ name: username });
        res.status(200).json({
            username,
            _id: createdUser._id
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json('Error in /api/users')
    }
});

// Exercises
app.get('/api/users/:_id/exercises', async function (req, res) {
    const id = req.params._id;
    try {
        const exers = await Exercise.find({ duser: id });
        const exersConverted = exers.map(e => {
            return {
              ...e,
              date: new Date(e.date ?? 0).toDateString()
            }
          });

        res.status(200).json(exersConverted);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
})

app.post('/api/users/:_id/exercises', async (req: Request, res: Response) => {
    try {
        const userId = req.params._id;
        let finalDate = new Date().toISOString().substring(0, 10);

        const { description, duration, date } = req.body;

        if (!userId || !description || !duration)
            return res.status(400).json('Bad request.')

        // Get user from db
        const user = await User.findOne({ _id: userId })
        if (!user)
            return res.status(404).json('Not found user with this id.');

        // Date manipulation
        if (date && new Date(date).toString() !== 'Invalid Date')
            finalDate = new Date(date).toISOString().substring(0, 10);

        const exercise = await Exercise.create({
            userId: userId,
            date: finalDate,
            description: description,
            duration: duration
        });
        if (!exercise)
            return res.status(400).json('Error creating exercise.')

        return res.status(200).json({
            username: user.username,
            _id: user._id,
            date: exercise.date,
            description: exercise.description,
            duration: exercise.duration
        })

    }
    catch (e) {
        console.error(e);
        res.status(500).json('Error in /api/users')
    }
})


// Logs
app.get('/api/users/:_id/logs', async (req: Request, res: Response) => {
    try {
        const { _id } = req.params;
        const from = req.query.from || new Date(0).toISOString().substring(0, 10);
        const to = req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
        const limit = Number(req.query.limit) || 0;

        const user = await User.findOne({ _id: _id });
        const exercises = await Exercise
            .find({
                userId: _id,
                date: {
                    $gte: from,
                    $lt: to
                }
            })
            .select('description duration date')
            .limit(limit);
        const logs = exercises.map(e => {
            return {
                description: e.description,
                duration: e.duration,
                date: new Date(e.date ?? 0).toDateString()
            }
        })
        res.status(200).json({
            _id: user?._id,
            username: user?.username,
            count: exercises.length,
            log: logs
        })

    }
    catch (e) {
        console.error(e);
        return res.status(500).json('Error in method /api/users/:_id/logs');
    }
})
const listener = app.listen(process.env.PORT || 3000, () => {
    console.log(`Your app is listening on port ${process?.env?.PORT || 3000}`);
});