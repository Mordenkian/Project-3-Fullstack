import mongoose from "mongoose";

const CitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide a name for the city."],
  },
  userId: {
    type: String,
    required: [true, "Please provide a userId."],
  },
});

// Create a compound index to ensure a user cannot save the same city twice.
CitySchema.index({ name: 1, userId: 1 }, { unique: true });

// In a serverless environment, we need to check if the model already exists before creating it.
export default mongoose.models.Cities || mongoose.model("Cities", CitySchema);