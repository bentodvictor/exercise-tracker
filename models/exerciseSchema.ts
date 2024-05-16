import mongoose from "mongoose";

const exerciseSchema = new mongoose.Schema({
    userId: String,
    description: {
        type: String,
        require: true
    },
    duration: {
        type: Number,
        require: true
    },
    date: Date
});

export const Exercise = mongoose.model('exercise', exerciseSchema);